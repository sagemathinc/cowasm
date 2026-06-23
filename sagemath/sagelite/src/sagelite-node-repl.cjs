#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");
const { execFileSync } = require("child_process");

const pythonWasmModule = resolvePythonWasmModule();
const { asyncPython } = require(pythonWasmModule);
const sageliteManifestName = "sagelite-electron-resources.json";

function resolvePythonWasmModule() {
  if (process.env.COWASM_PYTHON_WASM_NODE) {
    return process.env.COWASM_PYTHON_WASM_NODE;
  }
  const localPythonWasm = path.resolve(
    __dirname,
    "../../../python/python-wasm/dist/node.js",
  );
  return fs.existsSync(localPythonWasm) ? localPythonWasm : "python-wasm";
}

function loadSageliteManifestTools(resourceRoot) {
  const candidates = [
    path.join(resourceRoot, "sagelite-manifest-common.cjs"),
    path.resolve(
      __dirname,
      "../../../desktop/electron/src/sagelite-manifest-common.js",
    ),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return require(candidate);
    }
  }
  throw new Error(
    `Sagelite Electron manifest validator not found; tried ${candidates.join(", ")}`,
  );
}

function defaultResourceRoot() {
  const candidates = [
    process.env.COWASM_SAGELITE_ELECTRON_RESOURCES,
    process.cwd(),
    path.resolve(__dirname, "../dist/wasi-sdk/electron-resources"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    const resourceRoot = path.resolve(candidate);
    if (fs.existsSync(path.join(resourceRoot, sageliteManifestName))) {
      return resourceRoot;
    }
  }
  throw new Error(
    "Sagelite Electron resources not found; set COWASM_SAGELITE_ELECTRON_RESOURCES",
  );
}

async function main() {
  const invocationCwd = process.cwd();
  const resourceRoot = defaultResourceRoot();
  const { loadSageliteManifest, sagelitePythonEnv } =
    loadSageliteManifestTools(resourceRoot);
  const manifest = loadSageliteManifest(resourceRoot);
  process.chdir(resourceRoot);

  const python = await asyncPython({
    fs: "everything",
    noStdio: true,
    env: sagelitePythonEnv(manifest, resourceRoot),
  });
  python.kernel.on("stdout", (data) => process.stdout.write(data));
  python.kernel.on("stderr", (data) => process.stderr.write(data));

  const args = process.argv.slice(2);
  if (args[0] === "-t" || args[0] === "--test") {
    try {
      process.exitCode = await runDoctestMode(
        python,
        args.slice(1),
        invocationCwd,
      );
    } finally {
      python.terminate();
    }
    return;
  }

  await python.exec(`
import code
import warnings

warnings.filterwarnings(
    "ignore",
    message=r"Option .*at_startup=True.* for lazy import .* not needed anymore",
    category=UserWarning,
)
from sage.all import *
from sage.repl.preparse import preparse as __cowasm_sagelite_preparse

__cowasm_sagelite_do_preparse = True
__cowasm_sagelite_console = code.InteractiveConsole(globals())
__cowasm_sagelite_console_more = False

def preparser(on=True):
    global __cowasm_sagelite_do_preparse
    __cowasm_sagelite_do_preparse = on is True

def __cowasm_sagelite_push(line):
    if __cowasm_sagelite_do_preparse:
        line = __cowasm_sagelite_preparse(line)
    return __cowasm_sagelite_console.push(line)
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    prompt: "sage: ",
  });

  let inputClosed = false;
  let terminated = false;
  let pending = Promise.resolve();
  const terminate = () => {
    if (!terminated) {
      terminated = true;
      python.terminate();
    }
  };
  const shutdown = () => {
    inputClosed = true;
    rl.close();
    terminate();
  };
  process.on("SIGINT", () => {
    process.stdout.write("\n");
    rl.setPrompt("sage: ");
    rl.prompt();
  });

  rl.prompt();
  rl.on("line", (line) => {
    pending = pending
      .then(() => handleLine(python, rl, line, shutdown))
      .catch((err) => {
        console.error(err);
        rl.setPrompt("sage: ");
      })
      .finally(async () => {
        await python.kernel.flushOutput(250);
        if (!inputClosed && !terminated) {
          rl.prompt();
        }
      });
  });
  rl.on("close", () => {
    inputClosed = true;
    setImmediate(() => pending.finally(terminate));
  });
}

function parseDoctestArgs(args, invocationCwd) {
  const options = {
    dbPath: process.env.COWASM_SAGELITE_DOCTEST_DB
      ? path.resolve(invocationCwd, process.env.COWASM_SAGELITE_DOCTEST_DB)
      : path.resolve(invocationCwd, "sagelite-doctest-results.sqlite3"),
    timeoutSeconds: 0,
    long: false,
    files: [],
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--sqlite") {
      i += 1;
      if (i >= args.length) {
        throw new Error("--sqlite requires a path");
      }
      options.dbPath = path.resolve(invocationCwd, args[i]);
    } else if (arg.startsWith("--sqlite=")) {
      options.dbPath = path.resolve(invocationCwd, arg.slice("--sqlite=".length));
    } else if (arg === "-T" || arg === "--timeout") {
      i += 1;
      if (i >= args.length) {
        throw new Error(`${arg} requires a timeout in seconds`);
      }
      options.timeoutSeconds = Number(args[i]);
    } else if (arg.startsWith("--timeout=")) {
      options.timeoutSeconds = Number(arg.slice("--timeout=".length));
    } else if (arg === "--long" || arg === "-l") {
      options.long = true;
    } else if (arg === "--") {
      for (const file of args.slice(i + 1)) {
        options.files.push(path.resolve(invocationCwd, file));
      }
      break;
    } else if (arg.startsWith("-")) {
      throw new Error(`unsupported sage -t option in Sagelite: ${arg}`);
    } else {
      options.files.push(path.resolve(invocationCwd, arg));
    }
  }
  if (!Number.isFinite(options.timeoutSeconds) || options.timeoutSeconds < 0) {
    throw new Error("timeout must be a nonnegative number of seconds");
  }
  if (options.files.length === 0) {
    throw new Error("sage -t requires at least one file");
  }
  return options;
}

async function runDoctestMode(python, args, invocationCwd) {
  const options = parseDoctestArgs(args, invocationCwd);
  const startedAt = new Date().toISOString();
  const run = {
    started_at: startedAt,
    finished_at: null,
    git_commit: gitCommit(invocationCwd),
    sagelite_source_commit: sageliteSourceCommit(),
    command: ["sage", "-t", ...args].join(" "),
    status: "error",
    total_blocks: 0,
    passed_blocks: 0,
    failed_blocks: 0,
    skipped_blocks: 0,
    duration_ms: 0,
    files: [],
  };
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sagelite-doctest-"));
  const resultPath = path.join(tmpDir, "result.json");
  const begin = Date.now();
  try {
    const code = buildDoctestPython({
      files: options.files,
      resultPath,
      long: options.long,
    });
    await execPythonWithTimeout(python, code, options.timeoutSeconds);
    await python.kernel.flushOutput(250);
    const parsed = JSON.parse(fs.readFileSync(resultPath, "utf8"));
    Object.assign(run, parsed);
    run.status = "finished";
  } catch (err) {
    run.files.push({
      path: options.files.join("\n"),
      status: "error",
      total_blocks: 0,
      passed_blocks: 0,
      failed_blocks: 0,
      skipped_blocks: 0,
      duration_ms: Date.now() - begin,
      stdout: "",
      stderr: String(err && err.stack ? err.stack : err),
      blocks: [],
    });
  } finally {
    run.finished_at = new Date().toISOString();
    run.duration_ms = Date.now() - begin;
    run.total_blocks = run.files.reduce((n, file) => n + file.total_blocks, 0);
    run.passed_blocks = run.files.reduce((n, file) => n + file.passed_blocks, 0);
    run.failed_blocks = run.files.reduce((n, file) => n + file.failed_blocks, 0);
    run.skipped_blocks = run.files.reduce((n, file) => n + file.skipped_blocks, 0);
    if (run.status !== "error") {
      run.status = run.failed_blocks === 0 ? "passed" : "failed";
    }
    if (run.status === "error" && run.failed_blocks === 0 && run.files.length > 0) {
      run.failed_blocks = run.files.length;
    }
    writeDoctestSqlite(options.dbPath, run);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  printDoctestSummary(options.dbPath, run, invocationCwd);
  return run.status === "passed" ? 0 : 1;
}

async function execPythonWithTimeout(python, code, timeoutSeconds) {
  if (!timeoutSeconds) {
    await python.exec(code);
    return;
  }
  let timeout;
  try {
    await Promise.race([
      python.exec(code),
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          python.terminate();
          reject(new Error(`sage -t timed out after ${timeoutSeconds}s`));
        }, timeoutSeconds * 1000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function buildDoctestPython({ files, resultPath, long }) {
  return `
import ast
import doctest
import json
import os
import re
import sys
import time
import traceback
import warnings

warnings.filterwarnings(
    "ignore",
    message=r"Option .*at_startup=True.* for lazy import .* not needed anymore",
    category=UserWarning,
)

from sage.all import *
from sage.repl.preparse import preparse as __cowasm_sagelite_preparse

__cowasm_files = ${JSON.stringify(JSON.stringify(files))}
__cowasm_result_path = ${JSON.stringify(resultPath)}
__cowasm_long = ${long ? "True" : "False"}

__cowasm_skip_re = re.compile(
    r"#\\s*(optional|needs|not implemented|not tested|known bug)\\b",
    re.IGNORECASE,
)
__cowasm_long_re = re.compile(r"#\\s*long time\\b", re.IGNORECASE)


def __cowasm_convert_prompts(text):
    out = []
    for line in text.splitlines(True):
        line = re.sub(r"^(\\s*)sage:( ?)", r"\\1>>> ", line)
        line = re.sub(r"^(\\s*)\\.\\.\\.\\.:( ?)", r"\\1... ", line)
        out.append(line)
    return "".join(out)


def __cowasm_filtered_text_with_prompts(text):
    kept = []
    active_indent = None
    for lineno, line in enumerate(text.splitlines(True), start=1):
        prompt = re.match(r"^(\\s*)(sage:|\\.\\.\\.\\.:)", line)
        if prompt:
            active_indent = prompt.group(1)
            kept.append((lineno, line))
            continue
        if active_indent is not None:
            stripped = line.strip()
            if not stripped:
                kept.append((lineno, line))
                active_indent = None
                continue
            if line.startswith(active_indent) and not stripped.startswith(('\"\"\"', "'''")):
                kept.append((lineno, line))
                continue
            active_indent = None
    if not kept:
        return "", 0
    first = kept[0][0]
    return "".join(line for _, line in kept), first - 1


def __cowasm_docstrings(filename, text):
    if not filename.endswith(".py"):
        filtered, lineno = __cowasm_filtered_text_with_prompts(text)
        if filtered:
            yield os.path.basename(filename), filtered, lineno
        return
    try:
        tree = ast.parse(text, filename=filename)
    except SyntaxError:
        filtered, lineno = __cowasm_filtered_text_with_prompts(text)
        if filtered:
            yield os.path.basename(filename), filtered, lineno
        return
    stack = [(os.path.splitext(os.path.basename(filename))[0], tree)]
    while stack:
        name, node = stack.pop(0)
        body = getattr(node, "body", [])
        if body:
            first = body[0]
            if (
                isinstance(first, ast.Expr)
                and isinstance(first.value, ast.Constant)
                and isinstance(first.value.value, str)
            ):
                yield name, first.value.value, first.lineno
        for child in body:
            if isinstance(child, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                stack.append((f"{name}.{child.name}", child))


def __cowasm_should_skip(source):
    if __cowasm_skip_re.search(source):
        return True
    if not __cowasm_long and __cowasm_long_re.search(source):
        return True
    return False


class __CowasmRecordingRunner(doctest.DocTestRunner):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.blocks = []

    def __base(self, test, example):
        start_line = None
        end_line = None
        if test.lineno is not None and example.lineno is not None:
            start_line = test.lineno + example.lineno + 1
            end_line = start_line + len(example.source.splitlines()) - 1
        return {
            "block_index": getattr(example, "_cowasm_block_index", len(self.blocks)),
            "name": test.name,
            "start_line": start_line,
            "end_line": end_line,
            "source": getattr(example, "sage_source", example.source),
            "expected": example.want,
            "duration_ms": int(getattr(example, "_cowasm_duration_ms", 0)),
        }

    def report_success(self, out, test, example, got):
        row = self.__base(test, example)
        row.update({"status": "passed", "actual": got, "failure_class": None})
        self.blocks.append(row)

    def report_failure(self, out, test, example, got):
        row = self.__base(test, example)
        row.update({"status": "failed", "actual": got, "failure_class": "output_mismatch"})
        self.blocks.append(row)

    def report_unexpected_exception(self, out, test, example, exc_info):
        row = self.__base(test, example)
        row.update({
            "status": "failed",
            "actual": "".join(traceback.format_exception(*exc_info)),
            "failure_class": exc_info[0].__name__,
        })
        self.blocks.append(row)


class __CowasmOutputChecker(doctest.OutputChecker):
    def check_output(self, want, got, optionflags):
        if super().check_output(want, got, optionflags):
            return True
        return super().check_output(str(want), str(got), optionflags)


def __cowasm_run_file(filename):
    started = time.time()
    file_result = {
        "path": filename,
        "status": "error",
        "total_blocks": 0,
        "passed_blocks": 0,
        "failed_blocks": 0,
        "skipped_blocks": 0,
        "duration_ms": 0,
        "stdout": "",
        "stderr": "",
        "blocks": [],
    }
    try:
        with open(filename, "r", encoding="utf-8") as f:
            original = f.read()
        parser = doctest.DocTestParser()
        namespace = {}
        exec("from sage.all import *", namespace)
        runner = __CowasmRecordingRunner(
            checker=__CowasmOutputChecker(),
            verbose=False,
            optionflags=doctest.NORMALIZE_WHITESPACE | doctest.ELLIPSIS,
        )
        attempted = 0
        failed = 0
        block_counter = 0
        for name, docstring, line_offset in __cowasm_docstrings(filename, original):
            converted = __cowasm_convert_prompts(docstring)
            test = parser.get_doctest(converted, namespace, name, filename, line_offset)
            if not test.examples:
                continue
            for example in test.examples:
                index = block_counter
                block_counter += 1
                example._cowasm_block_index = index
                example.sage_source = example.source
                start_line = None
                end_line = None
                if test.lineno is not None and example.lineno is not None:
                    start_line = test.lineno + example.lineno + 1
                    end_line = start_line + len(example.source.splitlines()) - 1
                if __cowasm_should_skip(example.sage_source):
                    runner.blocks.append({
                        "block_index": index,
                        "name": test.name,
                        "start_line": start_line,
                        "end_line": end_line,
                        "source": example.sage_source,
                        "expected": example.want,
                        "actual": "",
                        "status": "skipped",
                        "failure_class": "optional_or_deferred",
                        "duration_ms": 0,
                    })
                    example.options[doctest.SKIP] = True
                else:
                    try:
                        example.source = __cowasm_sagelite_preparse(example.source)
                    except BaseException:
                        runner.blocks.append({
                            "block_index": index,
                            "name": test.name,
                            "start_line": start_line,
                            "end_line": end_line,
                            "source": example.sage_source,
                            "expected": example.want,
                            "actual": traceback.format_exc(),
                            "status": "failed",
                            "failure_class": "preparse_error",
                            "duration_ms": 0,
                        })
                        example.options[doctest.SKIP] = True
            before = time.time()
            result = runner.run(test, clear_globs=False)
            attempted += result.attempted
            failed += result.failed
        duration_ms = int((time.time() - started) * 1000)
        for block in runner.blocks:
            if not block["duration_ms"] and block["status"] != "skipped":
                block["duration_ms"] = duration_ms // max(1, attempted)
        file_result["blocks"] = sorted(runner.blocks, key=lambda row: row["block_index"])
        file_result["total_blocks"] = len(file_result["blocks"])
        file_result["passed_blocks"] = sum(1 for row in file_result["blocks"] if row["status"] == "passed")
        file_result["failed_blocks"] = sum(1 for row in file_result["blocks"] if row["status"] == "failed")
        file_result["skipped_blocks"] = sum(1 for row in file_result["blocks"] if row["status"] == "skipped")
        file_result["status"] = "passed" if file_result["failed_blocks"] == 0 else "failed"
    except BaseException:
        file_result["stderr"] = traceback.format_exc()
        file_result["failed_blocks"] = 1
    finally:
        file_result["duration_ms"] = int((time.time() - started) * 1000)
    return file_result


__cowasm_results = {"files": []}
for __cowasm_file in json.loads(__cowasm_files):
    __cowasm_results["files"].append(__cowasm_run_file(__cowasm_file))

with open(__cowasm_result_path, "w", encoding="utf-8") as __cowasm_out:
    json.dump(__cowasm_results, __cowasm_out, ensure_ascii=False)
`;
}

function gitCommit(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function sageliteSourceCommit() {
  const revisionPath = path.resolve(
    __dirname,
    "../build/wasi-sdk/.cowasm-sagelite-source-revision",
  );
  try {
    return fs.readFileSync(revisionPath, "utf8").trim();
  } catch {
    return "";
  }
}

function sqlString(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value) {
  return Number.isFinite(value) ? String(Math.trunc(value)) : "NULL";
}

function writeDoctestSqlite(dbPath, run) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const statements = [
    "PRAGMA foreign_keys=ON;",
    `CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      git_commit TEXT NOT NULL,
      sagelite_source_commit TEXT,
      command TEXT NOT NULL,
      status TEXT NOT NULL,
      total_blocks INTEGER NOT NULL,
      passed_blocks INTEGER NOT NULL,
      failed_blocks INTEGER NOT NULL,
      skipped_blocks INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY,
      run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      status TEXT NOT NULL,
      total_blocks INTEGER NOT NULL,
      passed_blocks INTEGER NOT NULL,
      failed_blocks INTEGER NOT NULL,
      skipped_blocks INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      stdout TEXT,
      stderr TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY,
      file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      block_index INTEGER NOT NULL,
      name TEXT,
      start_line INTEGER,
      end_line INTEGER,
      source TEXT NOT NULL,
      expected TEXT,
      actual TEXT,
      status TEXT NOT NULL,
      failure_class TEXT,
      duration_ms INTEGER NOT NULL
    );`,
    "CREATE INDEX IF NOT EXISTS files_run_path_idx ON files(run_id, path);",
    "CREATE INDEX IF NOT EXISTS blocks_file_status_idx ON blocks(file_id, status);",
    `INSERT INTO runs (
      started_at, finished_at, git_commit, sagelite_source_commit, command,
      status, total_blocks, passed_blocks, failed_blocks, skipped_blocks, duration_ms
    ) VALUES (
      ${sqlString(run.started_at)}, ${sqlString(run.finished_at)},
      ${sqlString(run.git_commit)}, ${sqlString(run.sagelite_source_commit)},
      ${sqlString(run.command)}, ${sqlString(run.status)},
      ${sqlNumber(run.total_blocks)}, ${sqlNumber(run.passed_blocks)},
      ${sqlNumber(run.failed_blocks)}, ${sqlNumber(run.skipped_blocks)},
      ${sqlNumber(run.duration_ms)}
    );`,
    "SELECT last_insert_rowid();",
  ];
  const runId = execFileSync("sqlite3", [dbPath], {
    input: statements.join("\n"),
    encoding: "utf8",
  }).trim().split(/\s+/).pop();

  const rows = ["PRAGMA foreign_keys=ON;"];
  for (const file of run.files) {
    rows.push(`INSERT INTO files (
      run_id, path, status, total_blocks, passed_blocks, failed_blocks,
      skipped_blocks, duration_ms, stdout, stderr
    ) VALUES (
      ${sqlNumber(Number(runId))}, ${sqlString(file.path)}, ${sqlString(file.status)},
      ${sqlNumber(file.total_blocks)}, ${sqlNumber(file.passed_blocks)},
      ${sqlNumber(file.failed_blocks)}, ${sqlNumber(file.skipped_blocks)},
      ${sqlNumber(file.duration_ms)}, ${sqlString(file.stdout)}, ${sqlString(file.stderr)}
    );`);
    rows.push("SELECT last_insert_rowid();");
    const fileId = "__COWASM_FILE_ID__";
    for (const block of file.blocks || []) {
      rows.push(`INSERT INTO blocks (
        file_id, block_index, name, start_line, end_line, source, expected,
        actual, status, failure_class, duration_ms
      ) VALUES (
        ${fileId}, ${sqlNumber(block.block_index)}, ${sqlString(block.name)},
        ${sqlNumber(block.start_line)}, ${sqlNumber(block.end_line)},
        ${sqlString(block.source)}, ${sqlString(block.expected)},
        ${sqlString(block.actual)}, ${sqlString(block.status)},
        ${sqlString(block.failure_class)}, ${sqlNumber(block.duration_ms)}
      );`);
    }
  }
  if (run.files.length === 0) {
    return;
  }

  const script = rows.join("\n");
  const chunks = script.split("SELECT last_insert_rowid();");
  let sql = chunks[0];
  let fileCursor = 0;
  for (let i = 1; i < chunks.length; i += 1) {
    const output = execFileSync("sqlite3", [dbPath], {
      input: sql + "\nSELECT last_insert_rowid();\n",
      encoding: "utf8",
    }).trim();
    const fileId = output.split(/\s+/).pop();
    sql = chunks[i].replaceAll("__COWASM_FILE_ID__", fileId);
    fileCursor += 1;
  }
  if (sql.trim()) {
    execFileSync("sqlite3", [dbPath], { input: sql, encoding: "utf8" });
  }
  void fileCursor;
}

function printDoctestSummary(dbPath, run, displayCwd) {
  for (const file of run.files) {
    const rel = path.relative(displayCwd, file.path);
    console.log(
      `${file.status}: ${rel} (${file.passed_blocks} passed, ${file.failed_blocks} failed, ${file.skipped_blocks} skipped)`,
    );
    if (file.stderr) {
      process.stderr.write(file.stderr.endsWith("\n") ? file.stderr : `${file.stderr}\n`);
    }
  }
  console.log(
    `sage -t ${run.status}: ${run.passed_blocks} passed, ${run.failed_blocks} failed, ${run.skipped_blocks} skipped; sqlite=${dbPath}`,
  );
}

async function handleLine(python, rl, line, shutdown) {
  if (line.trim() === "exit()" || line.trim() === "quit()") {
    shutdown();
    return;
  }
  try {
    await python.exec(
      `__cowasm_sagelite_console_more = __cowasm_sagelite_push(${JSON.stringify(line)})`,
    );
    const more = await python.repr("__cowasm_sagelite_console_more");
    rl.setPrompt(more === "True" ? "....: " : "sage: ");
  } catch (err) {
    console.error(err);
    rl.setPrompt("sage: ");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
