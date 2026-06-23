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
const doctestRunnerVersion = 12;

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

  const args = process.argv.slice(2);
  if (args[0] === "-t" || args[0] === "--test") {
    process.exitCode = await runDoctestMode(args.slice(1), invocationCwd, {
      manifest,
      resourceRoot,
      sagelitePythonEnv,
    });
    return;
  }

  const python = await createSagelitePython({
    manifest,
    resourceRoot,
    sagelitePythonEnv,
  });

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

async function createSagelitePython({ manifest, resourceRoot, sagelitePythonEnv }) {
  const python = await asyncPython({
    fs: "everything",
    noStdio: true,
    env: sagelitePythonEnv(manifest, resourceRoot),
  });
  python.kernel.on("stdout", (data) => process.stdout.write(data));
  python.kernel.on("stderr", (data) => process.stderr.write(data));
  return python;
}

function parseDoctestArgs(args, invocationCwd) {
  const options = {
    dbPath: process.env.COWASM_SAGELITE_DOCTEST_DB
      ? path.resolve(invocationCwd, process.env.COWASM_SAGELITE_DOCTEST_DB)
      : path.resolve(invocationCwd, "sagelite-doctest-results.sqlite3"),
    timeoutSeconds: 0,
    long: false,
    optional: false,
    optionalFeatures: [],
    blockKeys: [],
    profile: process.env.COWASM_SAGELITE_DOCTEST_PROFILE || "node",
    sourceRoot: process.env.COWASM_SAGELITE_DOCTEST_SOURCE_ROOT
      ? path.resolve(invocationCwd, process.env.COWASM_SAGELITE_DOCTEST_SOURCE_ROOT)
      : null,
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
    } else if (arg === "--optional") {
      options.optional = true;
    } else if (arg.startsWith("--optional=")) {
      options.optionalFeatures.push(
        ...parseDoctestFeatureList(arg.slice("--optional=".length)),
      );
    } else if (arg === "--block-key") {
      i += 1;
      if (i >= args.length) {
        throw new Error("--block-key requires a block key");
      }
      options.blockKeys.push(args[i]);
    } else if (arg.startsWith("--block-key=")) {
      options.blockKeys.push(arg.slice("--block-key=".length));
    } else if (arg === "--profile") {
      i += 1;
      if (i >= args.length) {
        throw new Error("--profile requires a runtime profile");
      }
      options.profile = args[i];
    } else if (arg.startsWith("--profile=")) {
      options.profile = arg.slice("--profile=".length);
    } else if (arg === "--source-root") {
      i += 1;
      if (i >= args.length) {
        throw new Error("--source-root requires a path");
      }
      options.sourceRoot = path.resolve(invocationCwd, args[i]);
    } else if (arg.startsWith("--source-root=")) {
      options.sourceRoot = path.resolve(
        invocationCwd,
        arg.slice("--source-root=".length),
      );
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
  if (options.blockKeys.some((key) => !key)) {
    throw new Error("--block-key requires a nonempty block key");
  }
  const allowedProfiles = new Set([
    "browser",
    "node",
    "electron",
    "node-subprocess",
  ]);
  if (!allowedProfiles.has(options.profile)) {
    throw new Error(`unsupported Sagelite doctest profile: ${options.profile}`);
  }
  return options;
}

function parseDoctestFeatureList(value) {
  const features = value
    .split(/[,\s]+/)
    .map((feature) => feature.trim().toLowerCase())
    .filter(Boolean);
  if (features.length === 0) {
    throw new Error("--optional=FEATURE requires at least one feature");
  }
  return features;
}

async function runDoctestMode(args, invocationCwd, pythonOptions) {
  const options = parseDoctestArgs(args, invocationCwd);
  const startedAt = new Date().toISOString();
  const sagelitePackageCommit = sageliteSourceCommit();
  const run = {
    started_at: startedAt,
    finished_at: null,
    git_commit: gitCommit(path.resolve(__dirname, "../../..")),
    sagelite_source_commit: sagelitePackageCommit,
    sagelite_package_commit: sagelitePackageCommit,
    command: ["sage", "-t", ...args].join(" "),
    run_profile: options.profile,
    runner_version: doctestRunnerVersion,
    resource_root: process.cwd(),
    source_root: options.sourceRoot,
    invocation_cwd: invocationCwd,
    status: "error",
    total_blocks: 0,
    passed_blocks: 0,
    failed_blocks: 0,
    skipped_blocks: 0,
    duration_ms: 0,
    files: [],
  };
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sagelite-doctest-"));
  const begin = Date.now();
  try {
    for (const [index, file] of options.files.entries()) {
      const resultPath = path.join(tmpDir, `result-${index}.json`);
      const statePath = path.join(tmpDir, `state-${index}.json`);
      const fileBegin = Date.now();
      let python = null;
      try {
        python = await createSagelitePython(pythonOptions);
        const code = buildDoctestPython({
          files: [file],
          resultPath,
          statePath,
          long: options.long,
          optional: options.optional,
          optionalFeatures: options.optionalFeatures,
          blockKeys: options.blockKeys,
          sourceRoot: options.sourceRoot,
          invocationCwd,
        });
        await execPythonWithTimeout(python, code, options.timeoutSeconds);
        await python.kernel.flushOutput(250);
        appendDoctestFiles(run, readJsonFile(resultPath));
      } catch (err) {
        const before = run.files.length;
        appendDoctestFiles(run, readJsonFile(resultPath));
        if (run.files.length === before) {
          const state = readJsonFile(statePath);
          const failedPath =
            state && typeof state.current_file === "string" ? state.current_file : file;
          appendDoctestErrorFile(run, failedPath, err, Date.now() - fileBegin, state);
        }
      } finally {
        if (python) {
          python.terminate();
        }
      }
    }
    run.status = "finished";
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

function appendDoctestFiles(run, parsed) {
  if (!parsed || !Array.isArray(parsed.files)) {
    return;
  }
  for (const file of parsed.files) {
    run.files.push(file);
  }
}

function appendDoctestErrorFile(run, failedPath, err, durationMs, state = null) {
  const rawDetail = String(err && err.stack ? err.stack : err);
  const detail = doctestStateDiagnostic(state, rawDetail);
  run.files.push({
    path: failedPath,
    status: "error",
    total_blocks: 0,
    passed_blocks: 0,
    failed_blocks: 1,
    skipped_blocks: 0,
    duration_ms: durationMs,
    stdout: "",
    stderr: detail,
    failure_class: classifyDoctestHostError(err),
    failure_detail: detail,
    blocks: [],
  });
}

function doctestStateDiagnostic(state, detail) {
  if (!state || typeof state !== "object") {
    return detail;
  }
  const parts = [];
  if (typeof state.phase === "string" && state.phase) {
    parts.push(`phase=${state.phase}`);
  }
  if (typeof state.current_file === "string" && state.current_file) {
    parts.push(`file=${state.current_file}`);
  }
  if (typeof state.name === "string" && state.name) {
    parts.push(`doctest=${state.name}`);
  }
  if (Number.isFinite(state.line)) {
    parts.push(`line=${Math.trunc(state.line)}`);
  }
  if (parts.length === 0) {
    return detail;
  }
  return `doctest state: ${parts.join("; ")}\n${detail}`;
}

function classifyDoctestHostError(err) {
  const detail = String(err && err.stack ? err.stack : err);
  if (/timed out after \d+(?:\.\d+)?s/.test(detail)) {
    return "timeout";
  }
  if (
    /(?:^|\n)(?:WebAssembly\.)?LinkError:/i.test(detail) ||
    /WebAssembly\.Instance\(\): Import #\d+/i.test(detail) ||
    /function import requires a callable/i.test(detail)
  ) {
    return "wasm_link_error";
  }
  if (
    /(?:^|\n)RuntimeError: function signature mismatch/i.test(detail)
  ) {
    return "wasm_signature_mismatch";
  }
  if (
    /WebAssembly\.RuntimeError/i.test(detail) ||
    /wasm trap|unreachable|memory access out of bounds/i.test(detail)
  ) {
    return "wasm_trap";
  }
  return err && err.name ? err.name : "host_exception";
}

function readJsonFile(filename) {
  try {
    return JSON.parse(fs.readFileSync(filename, "utf8"));
  } catch {
    return null;
  }
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

function buildDoctestPython({
  files,
  resultPath,
  statePath,
  long,
  optional,
  optionalFeatures,
  blockKeys,
  sourceRoot,
  invocationCwd,
}) {
  return `
import ast
import builtins
import doctest
import hashlib
import importlib
import json
import math
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
__cowasm_state_path = ${JSON.stringify(statePath)}
__cowasm_long = ${long ? "True" : "False"}
__cowasm_optional = ${optional ? "True" : "False"}
__cowasm_optional_features = set(json.loads(${JSON.stringify(JSON.stringify(optionalFeatures))}))
__cowasm_block_keys = set(json.loads(${JSON.stringify(JSON.stringify(blockKeys))}))
__cowasm_source_root = ${sourceRoot ? JSON.stringify(sourceRoot) : "None"}
__cowasm_invocation_cwd = ${JSON.stringify(invocationCwd)}
__cowasm_current_state = {}

__cowasm_deferred_re = re.compile(
    r"#.*\\b(not implemented|not tested|known bug)\\b",
    re.IGNORECASE,
)
__cowasm_optional_re = re.compile(r"#.*\\b(optional|needs)\\b", re.IGNORECASE)
__cowasm_optional_tag_re = re.compile(
    r"#.*?\\b(optional|needs)\\b(?P<features>[^\\n]*)",
    re.IGNORECASE,
)
__cowasm_long_re = re.compile(r"#.*\\blong time\\b", re.IGNORECASE)
__cowasm_random_re = re.compile(r"#.*\\brandom\\b", re.IGNORECASE)
__cowasm_tol_re = re.compile(r"#.*\\b(abs tol|rel tol|tol)\\b", re.IGNORECASE)
__cowasm_tol_directive_re = re.compile(
    r"#.*?\\b((?:abs(?:olute)?|rel(?:ative)?)\\s+tol(?:erance)?|tol(?:erance)?)\\b(?:\\s+([-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?))?",
    re.IGNORECASE,
)
_cowasm_number_re = re.compile(
    r"(?<![\\w.])[ \\t]*[-+]?[ \\t]*(?:(?:\\d+\\.\\d*)|(?:\\.\\d+)|(?:\\d+))(?:[eE][-+]?\\d+)?(?![\\w.])"
)
COWASM_RANDOM_ACCEPT = "__COWASM_RANDOM_ACCEPT__\\n"
COWASM_TOLERANCE_PREFIX = "__COWASM_TOLERANCE__"


def __cowasm_note_state(current_file=None, phase=None, name=None, line=None):
    global __cowasm_current_state
    if current_file is not None:
        __cowasm_current_state["current_file"] = current_file
    if phase is not None:
        __cowasm_current_state["phase"] = phase
    if name is not None:
        __cowasm_current_state["name"] = name
    else:
        __cowasm_current_state.pop("name", None)
    if line is not None:
        __cowasm_current_state["line"] = line
    else:
        __cowasm_current_state.pop("line", None)
    try:
        with open(__cowasm_state_path, "w", encoding="utf-8") as __cowasm_state:
            json.dump(__cowasm_current_state, __cowasm_state)
    except BaseException:
        pass


def __cowasm_state_diagnostic(detail):
    parts = []
    phase = __cowasm_current_state.get("phase")
    current_file = __cowasm_current_state.get("current_file")
    name = __cowasm_current_state.get("name")
    line = __cowasm_current_state.get("line")
    if phase:
        parts.append(f"phase={phase}")
    if current_file:
        parts.append(f"file={current_file}")
    if name:
        parts.append(f"doctest={name}")
    if line is not None:
        parts.append(f"line={line}")
    if not parts:
        return detail
    return "doctest state: " + "; ".join(parts) + "\\n" + detail


def _cowasm_tags(source):
    tags = []
    checks = [
        ("random", __cowasm_random_re),
        ("long time", __cowasm_long_re),
        ("optional", __cowasm_optional_re),
        ("tolerance", __cowasm_tol_re),
    ]
    for name, regex in checks:
        if regex.search(source):
            tags.append(name)
    deferred_tags = __cowasm_deferred_tags(source)
    if deferred_tags:
        tags.append("deferred")
        tags.extend(f"deferred:{tag}" for tag in deferred_tags)
    for kind, feature in __cowasm_optional_feature_tags(source):
        tags.append(f"{kind}:{feature}")
    return ",".join(tags)


def __cowasm_deferred_tags(source):
    return [match.group(1).lower() for match in __cowasm_deferred_re.finditer(source)]


def __cowasm_optional_feature_tags(source):
    tags = []
    for match in __cowasm_optional_tag_re.finditer(source):
        kind = match.group(1).lower()
        feature_tail = (match.group("features") or "").strip()
        feature_tail = re.sub(r"^[-:]\\s*", "", feature_tail)
        for feature in re.split(r"[\\s,]+", feature_tail):
            feature = feature.strip().strip(";.")
            if feature:
                tags.append((kind, feature.lower()))
    return tags


def __cowasm_optional_features_in(source):
    return [feature for _kind, feature in __cowasm_optional_feature_tags(source)]


def __cowasm_optional_enabled(source):
    if not __cowasm_optional_re.search(source):
        return True
    if __cowasm_optional:
        return True
    features = __cowasm_optional_features_in(source)
    return bool(features and any(feature in __cowasm_optional_features for feature in features))


def _cowasm_source_hash(source):
    normalized = "\\n".join(line.rstrip() for line in source.strip().splitlines())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def __cowasm_posix_path(value):
    return value.replace(os.sep, "/")


def __cowasm_is_relative_subpath(value):
    return (
        value
        and value != os.pardir
        and not value.startswith(os.pardir + os.sep)
        and not os.path.isabs(value)
    )


def __cowasm_stable_doctest_path(filename):
    absolute = os.path.abspath(filename)
    if __cowasm_source_root:
        relative = os.path.relpath(absolute, __cowasm_source_root)
        if __cowasm_is_relative_subpath(relative):
            return __cowasm_posix_path(relative)

    parts = os.path.normpath(absolute).split(os.sep)
    for index in range(max(0, len(parts) - 1)):
        if parts[index] == "src" and parts[index + 1] == "sage":
            return "/".join(parts[index:])

    if __cowasm_invocation_cwd:
        relative = os.path.relpath(absolute, __cowasm_invocation_cwd)
        if __cowasm_is_relative_subpath(relative):
            return __cowasm_posix_path(relative)
    return __cowasm_posix_path(absolute)


def __cowasm_block_key(filename, start_line, source_hash):
    return f"{__cowasm_stable_doctest_path(filename)}:{start_line or ''}:{source_hash or ''}"


def __cowasm_convert_prompts(text):
    out = []
    for line in text.splitlines(True):
        line = re.sub(r"^(\\s*)sage:( ?)", r"\\1>>> ", line)
        line = re.sub(r"^(\\s*)\\.\\.\\.\\.:( ?)", r"\\1... ", line)
        out.append(line)
    return "".join(out)


def __cowasm_filtered_text_with_prompts(text):
    lines = text.splitlines(True)
    kept = [False] * len(lines)
    active_indent = None
    for lineno, line in enumerate(lines, start=1):
        prompt = re.match(r"^(\\s*)(sage:|\\.\\.\\.\\.:)", line)
        if prompt:
            active_indent = prompt.group(1)
            kept[lineno - 1] = True
            continue
        if active_indent is not None:
            stripped = line.strip()
            if not stripped:
                kept[lineno - 1] = True
                active_indent = None
                continue
            if line.startswith(active_indent) and not stripped.startswith(('\"\"\"', "'''")):
                kept[lineno - 1] = True
                continue
            active_indent = None
    if not any(kept):
        return "", 0
    return "".join(line if keep else "\\n" for line, keep in zip(lines, kept)), 0


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
    if __cowasm_deferred_re.search(source):
        return True
    if not __cowasm_optional_enabled(source):
        return True
    if not __cowasm_long and __cowasm_long_re.search(source):
        return True
    return False


def __cowasm_skip_reason(source):
    deferred_tags = __cowasm_deferred_tags(source)
    if deferred_tags:
        return "deferred:" + ",".join(deferred_tags)
    if not __cowasm_optional_enabled(source):
        features = __cowasm_optional_features_in(source)
        return "optional:" + ",".join(features) if features else "optional"
    if not __cowasm_long and __cowasm_long_re.search(source):
        return "long time"
    return None


def __cowasm_is_random(source):
    return __cowasm_random_re.search(source) is not None


def __cowasm_tolerance(source):
    match = __cowasm_tol_directive_re.search(source)
    if not match:
        return None
    value = match.group(2) if match.group(2) is not None else "1e-15"
    try:
        tolerance = builtins.float(value)
    except ValueError:
        return None
    if tolerance < 0 or not math.isfinite(tolerance):
        return None
    directive = " ".join(match.group(1).lower().split())
    if directive.startswith("abs"):
        mode = "abs"
    elif directive.startswith("rel"):
        mode = "rel"
    else:
        mode = "hybrid"
    return {"mode": mode, "tolerance": tolerance}


def __cowasm_tolerance_want(key, want):
    return COWASM_TOLERANCE_PREFIX + key + "\\n" + want


def __cowasm_module_name_from_path(filename):
    base, ext = os.path.splitext(filename)
    if ext not in (".py", ".pyx"):
        return None
    parts = os.path.normpath(base).split(os.sep)
    if "sage" not in parts:
        return None
    i = len(parts) - 1 - parts[::-1].index("sage")
    return ".".join(parts[i:])


def __cowasm_namespace(filename):
    namespace = {}
    exec("from sage.all import *", namespace)
    module_name = __cowasm_module_name_from_path(filename)
    if module_name:
        try:
            module = importlib.import_module(module_name)
        except BaseException:
            pass
        else:
            namespace.update(vars(module))
    return namespace


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
            "expected": getattr(example, "_cowasm_expected", example.want),
            "expected_kind": getattr(example, "_cowasm_expected_kind", "exact"),
            "block_key": getattr(example, "_cowasm_block_key", None),
            "source_hash": _cowasm_source_hash(getattr(example, "sage_source", example.source)),
            "tags": _cowasm_tags(getattr(example, "sage_source", example.source)),
            "skip_reason": getattr(example, "_cowasm_skip_reason", None),
            "duration_ms": int(getattr(example, "_cowasm_duration_ms", 0)),
        }

    def report_success(self, out, test, example, got):
        row = self.__base(test, example)
        failure_class = "random_unchecked" if getattr(example, "_cowasm_random", False) else None
        row.update({"status": "passed", "actual": got, "failure_class": failure_class})
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
    def __init__(self):
        super().__init__()
        self.tolerances = {}

    def check_output(self, want, got, optionflags):
        if want == COWASM_RANDOM_ACCEPT:
            return True
        if want.startswith(COWASM_TOLERANCE_PREFIX):
            header, _, want_body = want.partition("\\n")
            key = header[len(COWASM_TOLERANCE_PREFIX):]
            tolerance = self.tolerances.get(key)
            if tolerance is None:
                return False
            if super().check_output(want_body, got, optionflags):
                return True
            return self.__check_tolerant_output(want_body, got, tolerance, optionflags)
        if super().check_output(want, got, optionflags):
            return True
        return super().check_output(str(want), str(got), optionflags)

    def __check_tolerant_output(self, want, got, tolerance, optionflags):
        mode = tolerance.get("mode")
        tol = tolerance.get("tolerance")
        if mode not in ("abs", "rel", "hybrid") or not isinstance(
            tol, (builtins.int, builtins.float)
        ):
            return False
        want_tokens = self.__numeric_tokens(want, optionflags)
        got_tokens = self.__numeric_tokens(got, optionflags)
        if len(want_tokens) != len(got_tokens):
            return False
        saw_number = False
        for want_token, got_token in zip(want_tokens, got_tokens):
            if want_token[0] != got_token[0]:
                return False
            if want_token[0] == "text":
                if want_token[1] != got_token[1]:
                    return False
                continue
            saw_number = True
            if not self.__numbers_close(want_token[1], got_token[1], mode, builtins.float(tol)):
                return False
        return saw_number

    def __numeric_tokens(self, text, optionflags):
        tokens = []
        offset = 0
        for match in _cowasm_number_re.finditer(text):
            tokens.append(
                ("text", self.__normalize_text(text[offset:match.start()], optionflags))
            )
            tokens.append(("number", builtins.float(match.group(0).replace(" ", ""))))
            offset = match.end()
        tokens.append(("text", self.__normalize_text(text[offset:], optionflags)))
        return [token for token in tokens if token[0] == "number" or token[1] != ""]

    def __normalize_text(self, text, optionflags):
        if optionflags & doctest.NORMALIZE_WHITESPACE:
            return " ".join(text.split())
        return text

    def __numbers_close(self, want, got, mode, tol):
        if math.isnan(want) or math.isnan(got):
            return math.isnan(want) and math.isnan(got)
        if math.isinf(want) or math.isinf(got):
            return want == got
        diff = abs(want - got)
        if mode == "abs":
            return diff <= tol
        if mode == "rel":
            return diff <= tol * abs(want)
        if want == 0:
            return diff <= tol
        return diff <= tol * abs(want)


def __cowasm_run_file(filename):
    started = time.time()
    __cowasm_note_state(filename, "start_file")
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
        "failure_class": None,
        "failure_detail": None,
        "blocks": [],
    }
    try:
        __cowasm_note_state(filename, "read_source")
        with open(filename, "r", encoding="utf-8") as f:
            original = f.read()
        __cowasm_note_state(filename, "load_namespace")
        parser = doctest.DocTestParser()
        namespace = __cowasm_namespace(filename)
        __cowasm_note_state(filename, "initialize_runner")
        checker = __CowasmOutputChecker()
        runner = __CowasmRecordingRunner(
            checker=checker,
            verbose=False,
            optionflags=doctest.NORMALIZE_WHITESPACE | doctest.ELLIPSIS,
        )
        attempted = 0
        failed = 0
        block_counter = 0
        __cowasm_note_state(filename, "collect_docstrings")
        for name, docstring, line_offset in __cowasm_docstrings(filename, original):
            __cowasm_note_state(filename, "parse_doctest", name, line_offset)
            converted = __cowasm_convert_prompts(docstring)
            test = parser.get_doctest(converted, namespace, name, filename, line_offset)
            if not test.examples:
                continue
            for example in test.examples:
                index = block_counter
                block_counter += 1
                example._cowasm_block_index = index
                example.sage_source = example.source
                example._cowasm_expected = example.want
                example._cowasm_expected_kind = "exact"
                example._cowasm_skip_reason = None
                start_line = None
                end_line = None
                if test.lineno is not None and example.lineno is not None:
                    start_line = test.lineno + example.lineno + 1
                    end_line = start_line + len(example.source.splitlines()) - 1
                __cowasm_note_state(filename, "prepare_example", name, start_line)
                source_hash = _cowasm_source_hash(example.sage_source)
                block_key = __cowasm_block_key(filename, start_line, source_hash)
                example._cowasm_block_key = block_key
                if __cowasm_block_keys and block_key not in __cowasm_block_keys:
                    example.options[doctest.SKIP] = True
                    continue
                if __cowasm_should_skip(example.sage_source):
                    skip_reason = __cowasm_skip_reason(example.sage_source)
                    example._cowasm_skip_reason = skip_reason
                    runner.blocks.append({
                        "block_index": index,
                        "name": test.name,
                        "start_line": start_line,
                        "end_line": end_line,
                        "source": example.sage_source,
                        "expected": example.want,
                        "expected_kind": "skip",
                        "block_key": block_key,
                        "source_hash": source_hash,
                        "tags": _cowasm_tags(example.sage_source),
                        "skip_reason": skip_reason,
                        "actual": "",
                        "status": "skipped",
                        "failure_class": "optional_or_deferred",
                        "duration_ms": 0,
                    })
                    example.options[doctest.SKIP] = True
                else:
                    if __cowasm_is_random(example.sage_source):
                        example._cowasm_random = True
                        example._cowasm_expected_kind = "random"
                        example.want = COWASM_RANDOM_ACCEPT
                    else:
                        tolerance = __cowasm_tolerance(example.sage_source)
                        if tolerance is not None:
                            tolerance_key = "t" + str(index)
                            checker.tolerances[tolerance_key] = tolerance
                            example._cowasm_expected_kind = "tolerance"
                            example.want = __cowasm_tolerance_want(tolerance_key, example.want)
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
                            "expected_kind": "error",
                            "block_key": block_key,
                            "source_hash": source_hash,
                            "tags": _cowasm_tags(example.sage_source),
                            "skip_reason": None,
                            "actual": traceback.format_exc(),
                            "status": "failed",
                            "failure_class": "preparse_error",
                            "duration_ms": 0,
                        })
                        example.options[doctest.SKIP] = True
            __cowasm_note_state(filename, "run_doctest", name, line_offset)
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
    except BaseException as exc:
        detail = __cowasm_state_diagnostic(traceback.format_exc())
        file_result["stderr"] = detail
        file_result["failure_class"] = exc.__class__.__name__
        file_result["failure_detail"] = detail
        file_result["failed_blocks"] = 1
    finally:
        file_result["duration_ms"] = int((time.time() - started) * 1000)
    return file_result


__cowasm_results = {"files": []}
def __cowasm_write_results():
    with open(__cowasm_result_path, "w", encoding="utf-8") as __cowasm_out:
        json.dump(__cowasm_results, __cowasm_out, ensure_ascii=False)


for __cowasm_file in json.loads(__cowasm_files):
    __cowasm_note_state(__cowasm_file, "queued")
    __cowasm_results["files"].append(__cowasm_run_file(__cowasm_file))
    __cowasm_write_results()

__cowasm_write_results()
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

function sqliteExec(dbPath, sql) {
  return execFileSync("sqlite3", [dbPath], {
    input: sql,
    encoding: "utf8",
  });
}

function sqliteScalar(dbPath, sql) {
  return sqliteExec(dbPath, sql).trim();
}

function ensureSqliteColumn(dbPath, table, column, declaration) {
  const columns = sqliteScalar(dbPath, `PRAGMA table_info(${table});`)
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("|")[1]);
  if (!columns.includes(column)) {
    sqliteExec(dbPath, `ALTER TABLE ${table} ADD COLUMN ${column} ${declaration};`);
  }
}

function ensureDoctestSchema(dbPath) {
  const schema = [
    "PRAGMA foreign_keys=ON;",
    `CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      git_commit TEXT NOT NULL,
      sagelite_source_commit TEXT,
      sagelite_package_commit TEXT,
      command TEXT NOT NULL,
      run_profile TEXT DEFAULT 'node',
      runner_version INTEGER DEFAULT 1,
      resource_root TEXT,
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
      stderr TEXT,
      failure_class TEXT,
      failure_detail TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY,
      file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      block_index INTEGER NOT NULL,
      block_key TEXT,
      name TEXT,
      start_line INTEGER,
      end_line INTEGER,
      source TEXT NOT NULL,
      source_hash TEXT,
      expected TEXT,
      expected_kind TEXT,
      actual TEXT,
      status TEXT NOT NULL,
      failure_class TEXT,
      tags TEXT,
      skip_reason TEXT,
      duration_ms INTEGER NOT NULL
    );`,
    "CREATE INDEX IF NOT EXISTS files_run_path_idx ON files(run_id, path);",
    "CREATE INDEX IF NOT EXISTS blocks_file_status_idx ON blocks(file_id, status);",
  ];
  sqliteExec(dbPath, schema.join("\n"));
  ensureSqliteColumn(dbPath, "runs", "run_profile", "TEXT DEFAULT 'node'");
  ensureSqliteColumn(dbPath, "runs", "runner_version", "INTEGER DEFAULT 1");
  ensureSqliteColumn(dbPath, "runs", "resource_root", "TEXT");
  ensureSqliteColumn(dbPath, "runs", "sagelite_source_commit", "TEXT");
  ensureSqliteColumn(dbPath, "runs", "sagelite_package_commit", "TEXT");
  ensureSqliteColumn(dbPath, "files", "failure_class", "TEXT");
  ensureSqliteColumn(dbPath, "files", "failure_detail", "TEXT");
  ensureSqliteColumn(dbPath, "blocks", "block_key", "TEXT");
  ensureSqliteColumn(dbPath, "blocks", "source_hash", "TEXT");
  ensureSqliteColumn(dbPath, "blocks", "expected_kind", "TEXT");
  ensureSqliteColumn(dbPath, "blocks", "tags", "TEXT");
  ensureSqliteColumn(dbPath, "blocks", "skip_reason", "TEXT");
  sqliteExec(dbPath, "CREATE INDEX IF NOT EXISTS blocks_key_idx ON blocks(block_key);");
}

function posixPath(value) {
  return value.split(path.sep).join(path.posix.sep);
}

function isRelativeSubpath(value) {
  return (
    value &&
    value !== ".." &&
    !value.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(value)
  );
}

function stableDoctestPath(filePath, run) {
  const absolute = path.resolve(filePath);
  if (run && run.source_root) {
    const relative = path.relative(run.source_root, absolute);
    if (isRelativeSubpath(relative)) {
      return posixPath(relative);
    }
  }

  const parts = path.normalize(absolute).split(path.sep);
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (parts[i] === "src" && parts[i + 1] === "sage") {
      return parts.slice(i).join(path.posix.sep);
    }
  }

  if (run && run.invocation_cwd) {
    const relative = path.relative(run.invocation_cwd, absolute);
    if (isRelativeSubpath(relative)) {
      return posixPath(relative);
    }
  }
  return posixPath(absolute);
}

function blockKeyFor(file, block, run) {
  if (block.block_key) {
    return block.block_key;
  }
  const line = block.start_line ?? "";
  const sourceHash = block.source_hash || "";
  return `${stableDoctestPath(file.path, run)}:${line}:${sourceHash}`;
}

function writeDoctestSqlite(dbPath, run) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  ensureDoctestSchema(dbPath);
  const insertRun = [
    "PRAGMA foreign_keys=ON;",
    `INSERT INTO runs (
      started_at, finished_at, git_commit, sagelite_source_commit,
      sagelite_package_commit, command,
      run_profile, runner_version, resource_root,
      status, total_blocks, passed_blocks, failed_blocks, skipped_blocks, duration_ms
    ) VALUES (
      ${sqlString(run.started_at)}, ${sqlString(run.finished_at)},
      ${sqlString(run.git_commit)}, ${sqlString(run.sagelite_source_commit)},
      ${sqlString(run.sagelite_package_commit)}, ${sqlString(run.command)},
      ${sqlString(run.run_profile)},
      ${sqlNumber(run.runner_version)}, ${sqlString(run.resource_root)},
      ${sqlString(run.status)},
      ${sqlNumber(run.total_blocks)}, ${sqlNumber(run.passed_blocks)},
      ${sqlNumber(run.failed_blocks)}, ${sqlNumber(run.skipped_blocks)},
      ${sqlNumber(run.duration_ms)}
    );`,
    "SELECT last_insert_rowid();",
  ];
  const runId = sqliteExec(dbPath, insertRun.join("\n")).trim().split(/\s+/).pop();

  const rows = ["PRAGMA foreign_keys=ON;"];
  for (const file of run.files) {
    rows.push(`INSERT INTO files (
      run_id, path, status, total_blocks, passed_blocks, failed_blocks,
      skipped_blocks, duration_ms, stdout, stderr, failure_class, failure_detail
    ) VALUES (
      ${sqlNumber(Number(runId))}, ${sqlString(file.path)}, ${sqlString(file.status)},
      ${sqlNumber(file.total_blocks)}, ${sqlNumber(file.passed_blocks)},
      ${sqlNumber(file.failed_blocks)}, ${sqlNumber(file.skipped_blocks)},
      ${sqlNumber(file.duration_ms)}, ${sqlString(file.stdout)}, ${sqlString(file.stderr)},
      ${sqlString(file.failure_class)}, ${sqlString(file.failure_detail)}
    );`);
    rows.push("SELECT last_insert_rowid();");
    const fileId = "__COWASM_FILE_ID__";
    for (const block of file.blocks || []) {
      rows.push(`INSERT INTO blocks (
        file_id, block_index, block_key, name, start_line, end_line, source,
        source_hash, expected, expected_kind, actual, status, failure_class,
        tags, skip_reason, duration_ms
      ) VALUES (
        ${fileId}, ${sqlNumber(block.block_index)}, ${sqlString(blockKeyFor(file, block, run))},
        ${sqlString(block.name)},
        ${sqlNumber(block.start_line)}, ${sqlNumber(block.end_line)},
        ${sqlString(block.source)}, ${sqlString(block.source_hash)},
        ${sqlString(block.expected)}, ${sqlString(block.expected_kind)},
        ${sqlString(block.actual)}, ${sqlString(block.status)},
        ${sqlString(block.failure_class)}, ${sqlString(block.tags)},
        ${sqlString(block.skip_reason)}, ${sqlNumber(block.duration_ms)}
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
    const output = sqliteExec(dbPath, sql + "\nSELECT last_insert_rowid();\n").trim();
    const fileId = output.split(/\s+/).pop();
    sql = chunks[i].replaceAll("__COWASM_FILE_ID__", fileId);
    fileCursor += 1;
  }
  if (sql.trim()) {
    sqliteExec(dbPath, sql);
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
