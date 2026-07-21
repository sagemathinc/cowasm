#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execFileSync, spawn } = require("child_process");

const sageliteManifestName = "sagelite-electron-resources.json";
const doctestRunnerVersion = 129;

class DoctestRunInterrupted extends Error {
  constructor(signal) {
    super(`sage -t interrupted by ${signal || "signal"}`);
    this.name = "DoctestRunInterrupted";
    this.signal = signal || null;
  }
}

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
  if (args[0] === "--doctest-worker") {
    const code = await runDoctestWorker(args.slice(1), invocationCwd, {
      manifest,
      resourceRoot,
      sagelitePythonEnv,
    });
    await exitCliMode(code);
  }
  if (args[0] === "-t" || args[0] === "--test") {
    const code = await runDoctestMode(args.slice(1), invocationCwd, {
      manifest,
      resourceRoot,
      sagelitePythonEnv,
    });
    await exitCliMode(code);
  }

  const python = await createSagelitePython({
    manifest,
    resourceRoot,
    sagelitePythonEnv,
  });

  await python.exec(`
import builtins
import code
import sys
import warnings

warnings.filterwarnings(
    "ignore",
    message=r"Option .*at_startup=True.* for lazy import .* not needed anymore",
    category=UserWarning,
)
from sage.all import *
from sage.repl.preparse import preparse as __cowasm_sagelite_preparse
from sage.repl.display.fancy_repr import (
    LargeMatrixHelpRepr as __CowasmLargeMatrixHelpRepr,
    SomeIPythonRepr as __CowasmSomeIPythonRepr,
    TallListRepr as __CowasmTallListRepr,
)
from sage.misc.html import HtmlFragment as __CowasmHtmlFragment
from sage.structure.element import Matrix as __CowasmMatrix
from sage.structure.sequence import Sequence_generic as __CowasmSequence

__cowasm_sagelite_displayhook_delegate = sys.displayhook
__cowasm_sagelite_large_matrix_repr = __CowasmLargeMatrixHelpRepr()
__cowasm_sagelite_ipython_repr = __CowasmSomeIPythonRepr()
__cowasm_sagelite_tall_list_repr = __CowasmTallListRepr()

def __cowasm_sagelite_displayhook(value):
    if isinstance(value, __CowasmSequence):
        if value is not None:
            builtins._ = value
            formatted = __cowasm_sagelite_tall_list_repr.format_string(value)
            if formatted == "--- object not handled by representer ---":
                formatted = repr(list(value))
            print(formatted)
        return
    if isinstance(value, __CowasmHtmlFragment):
        if value is not None:
            builtins._ = value
            print(str(value))
        return
    if isinstance(value, dict):
        if value is not None:
            builtins._ = value
            formatted = __cowasm_sagelite_ipython_repr.format_string(value)
            if formatted == "--- object not handled by representer ---":
                formatted = repr(value)
            print(formatted)
        return
    if isinstance(value, __CowasmMatrix):
        formatted = __cowasm_sagelite_large_matrix_repr.format_string(value)
        if formatted != "--- object not handled by representer ---":
            if value is not None:
                builtins._ = value
                print(formatted)
            return
    __cowasm_sagelite_displayhook_delegate(value)

sys.displayhook = __cowasm_sagelite_displayhook

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

async function exitCliMode(code) {
  process.exitCode = code;
  await Promise.all([flushWritable(process.stdout), flushWritable(process.stderr)]);
  process.exit(code);
}

function flushWritable(stream) {
  return new Promise((resolve) => {
    if (!stream || !stream.writable || stream.destroyed) {
      resolve();
      return;
    }
    stream.write("", resolve);
  });
}

async function createSagelitePython({ manifest, resourceRoot, sagelitePythonEnv }) {
  const { asyncPython } = require(resolvePythonWasmModule());
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
  const envDbPath =
    process.env.COWASM_SAGELITE_DOCTEST_DB || process.env.SAGELITE_DOCTEST_DB;
  const fileArgs = [];
  const options = {
    dbPath: envDbPath
      ? path.resolve(invocationCwd, envDbPath)
      : path.resolve(invocationCwd, "sagelite-doctest-results.sqlite3"),
    timeoutSeconds: 0,
    long: false,
    optional: false,
    optionalFeatures: [],
    deferred: false,
    deferredFeatures: [],
    blockKeys: [],
    lines: [],
    profile: process.env.COWASM_SAGELITE_DOCTEST_PROFILE || "node",
    sourceRoot: process.env.COWASM_SAGELITE_DOCTEST_SOURCE_ROOT
      ? path.resolve(invocationCwd, process.env.COWASM_SAGELITE_DOCTEST_SOURCE_ROOT)
      : null,
    tmpDirRoot: process.env.COWASM_SAGELITE_DOCTEST_TMPDIR
      ? path.resolve(invocationCwd, process.env.COWASM_SAGELITE_DOCTEST_TMPDIR)
      : null,
    jobs: parseDoctestJobs(process.env.COWASM_SAGELITE_DOCTEST_JOBS || "1"),
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
    } else if (arg === "--tmpdir") {
      i += 1;
      if (i >= args.length) {
        throw new Error("--tmpdir requires a path");
      }
      options.tmpDirRoot = path.resolve(invocationCwd, args[i]);
    } else if (arg.startsWith("--tmpdir=")) {
      options.tmpDirRoot = path.resolve(invocationCwd, arg.slice("--tmpdir=".length));
    } else if (arg === "-T" || arg === "--timeout") {
      i += 1;
      if (i >= args.length) {
        throw new Error(`${arg} requires a timeout in seconds`);
      }
      options.timeoutSeconds = Number(args[i]);
    } else if (arg.startsWith("--timeout=")) {
      options.timeoutSeconds = Number(arg.slice("--timeout=".length));
    } else if (arg === "-j" || arg === "--jobs") {
      i += 1;
      if (i >= args.length) {
        throw new Error(`${arg} requires a positive job count`);
      }
      options.jobs = parseDoctestJobs(args[i], arg);
    } else if (arg.startsWith("--jobs=")) {
      options.jobs = parseDoctestJobs(arg.slice("--jobs=".length), "--jobs");
    } else if (arg === "--long" || arg === "-l") {
      options.long = true;
    } else if (arg === "--optional") {
      options.optional = true;
    } else if (arg.startsWith("--optional=")) {
      options.optionalFeatures.push(
        ...parseDoctestFeatureList(arg.slice("--optional=".length)),
      );
    } else if (arg === "--deferred") {
      options.deferred = true;
    } else if (arg.startsWith("--deferred=")) {
      options.deferredFeatures.push(
        ...parseDoctestFeatureList(arg.slice("--deferred=".length), "--deferred"),
      );
    } else if (arg === "--block-key") {
      i += 1;
      if (i >= args.length) {
        throw new Error("--block-key requires a block key");
      }
      options.blockKeys.push(args[i]);
    } else if (arg.startsWith("--block-key=")) {
      options.blockKeys.push(arg.slice("--block-key=".length));
    } else if (arg === "--line") {
      i += 1;
      if (i >= args.length) {
        throw new Error("--line requires a source line number");
      }
      options.lines.push(parseDoctestLine(args[i]));
    } else if (arg.startsWith("--line=")) {
      options.lines.push(parseDoctestLine(arg.slice("--line=".length)));
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
        fileArgs.push(file);
      }
      break;
    } else if (arg.startsWith("-")) {
      throw new Error(`unsupported sage -t option in Sagelite: ${arg}`);
    } else {
      fileArgs.push(arg);
    }
  }
  if (!Number.isFinite(options.timeoutSeconds) || options.timeoutSeconds < 0) {
    throw new Error("timeout must be a nonnegative number of seconds");
  }
  if (!Number.isInteger(options.jobs) || options.jobs < 1) {
    throw new Error("jobs must be a positive integer");
  }
  if (fileArgs.length === 0) {
    throw new Error("sage -t requires at least one file");
  }
  if (options.blockKeys.some((key) => !key)) {
    throw new Error("--block-key requires a nonempty block key");
  }
  if (options.blockKeys.length > 0 && options.lines.length > 0) {
    throw new Error("--block-key and --line cannot be combined");
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
  options.files = fileArgs.map((file) =>
    resolveDoctestFilePath(file, invocationCwd, options.sourceRoot),
  );
  return options;
}

function resolveDoctestFilePath(file, invocationCwd, sourceRoot) {
  if (path.isAbsolute(file)) {
    return path.resolve(file);
  }

  const cwdPath = path.resolve(invocationCwd, file);
  if (fs.existsSync(cwdPath) || !sourceRoot) {
    return cwdPath;
  }

  const sourceRootPath = path.resolve(sourceRoot, file);
  if (fs.existsSync(sourceRootPath)) {
    return sourceRootPath;
  }
  return cwdPath;
}

function parseDoctestLine(value) {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error("--line requires a positive integer source line number");
  }
  return Number(value);
}

function parseDoctestJobs(value, optionName = "jobs") {
  if (!/^[1-9][0-9]*$/.test(String(value))) {
    throw new Error(`${optionName} requires a positive integer`);
  }
  return Number(value);
}

function parseDoctestFeatureList(value, optionName = "--optional") {
  const features = value
    .split(/[,\s]+/)
    .map((feature) => feature.trim().toLowerCase())
    .filter(Boolean);
  if (features.length === 0) {
    throw new Error(`${optionName}=FEATURE requires at least one feature`);
  }
  return features;
}

async function runDoctestMode(args, invocationCwd, pythonOptions) {
  const options = parseDoctestArgs(args, invocationCwd);
  const cancellation = createDoctestCancellation();
  const cleanupSignalHandlers = installDoctestSignalHandlers(cancellation);
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
    tmp_dir_root: options.tmpDirRoot,
    invocation_cwd: invocationCwd,
    status: "running",
    total_blocks: 0,
    passed_blocks: 0,
    failed_blocks: 0,
    skipped_blocks: 0,
    duration_ms: 0,
    files: [],
  };
  fs.mkdirSync(path.dirname(options.dbPath), { recursive: true });
  const tmpDirRoot = options.tmpDirRoot || path.dirname(options.dbPath);
  fs.mkdirSync(tmpDirRoot, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(tmpDirRoot, ".sagelite-doctest-"));
  const begin = Date.now();
  let runId = null;
  let runError = null;
  const pendingResults = new Map();
  let nextCheckpointIndex = 0;
  const checkpointResult = (result) => {
    pendingResults.set(result.index, result);
    while (pendingResults.has(nextCheckpointIndex)) {
      const nextResult = pendingResults.get(nextCheckpointIndex);
      pendingResults.delete(nextCheckpointIndex);
      if (runId !== null) {
        writeDoctestTaskResult(options.dbPath, runId, run, nextResult);
      }
      appendDoctestTaskResult(run, nextResult);
      if (runId !== null) {
        refreshDoctestRunTotals(run, begin);
        updateDoctestRun(options.dbPath, runId, run);
      }
      nextCheckpointIndex += 1;
    }
  };
  try {
    ensureDoctestSchema(options.dbPath);
    runId = insertDoctestRun(options.dbPath, run);
    await runDoctestFileTasks({
      files: options.files,
      jobs: Math.min(options.jobs, options.files.length),
      tmpDir,
      options,
      invocationCwd,
      resourceRoot: pythonOptions.resourceRoot,
      cancellation,
      onResult: checkpointResult,
    });
    if (cancellation.cancelled) {
      throw new DoctestRunInterrupted(cancellation.signal);
    }
    run.status = "finished";
  } catch (err) {
    runError = err;
    if (err instanceof DoctestRunInterrupted) {
      run.status = "interrupted";
    } else {
      run.status = "error";
    }
  } finally {
    run.finished_at = new Date().toISOString();
    refreshDoctestRunTotals(run, begin);
    if (cancellation.cancelled) {
      run.status = "interrupted";
    } else if (run.status === "finished") {
      run.status = run.failed_blocks === 0 ? "passed" : "failed";
    }
    if (run.status === "error" && run.failed_blocks === 0 && run.files.length > 0) {
      run.failed_blocks = run.files.length;
    }
    try {
      if (runId !== null) {
        updateDoctestRun(options.dbPath, runId, run);
      } else {
        writeDoctestSqlite(options.dbPath, run);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    cleanupSignalHandlers();
  }
  printDoctestSummary(options.dbPath, run, invocationCwd);
  if (runError && !(runError instanceof DoctestRunInterrupted)) {
    throw runError;
  }
  return run.status === "passed" ? 0 : 1;
}

function createDoctestCancellation() {
  const activeChildren = new Map();
  const cancellation = {
    cancelled: false,
    signal: null,
    cancel(signal) {
      if (cancellation.cancelled) {
        return;
      }
      cancellation.cancelled = true;
      cancellation.signal = signal || null;
      for (const terminate of activeChildren.values()) {
        terminate();
      }
    },
    registerChild(child) {
      let forceKill = null;
      const terminate = () => {
        if (child.exitCode !== null || child.signalCode !== null || child.killed) {
          return;
        }
        child.kill("SIGTERM");
        forceKill = setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null) {
            child.kill("SIGKILL");
          }
        }, 2000);
      };
      activeChildren.set(child, terminate);
      if (cancellation.cancelled) {
        terminate();
      }
      return () => {
        if (forceKill) {
          clearTimeout(forceKill);
        }
        activeChildren.delete(child);
      };
    },
  };
  return cancellation;
}

function installDoctestSignalHandlers(cancellation) {
  const signals = ["SIGINT", "SIGTERM"];
  const handlers = new Map();
  for (const signal of signals) {
    const handler = () => {
      if (cancellation.cancelled) {
        process.exit(signal === "SIGINT" ? 130 : 143);
      }
      process.stderr.write(
        `sage -t interrupted by ${signal}; checkpointing completed doctest results...\n`,
      );
      cancellation.cancel(signal);
    };
    handlers.set(signal, handler);
    process.once(signal, handler);
  }
  return () => {
    for (const [signal, handler] of handlers.entries()) {
      process.removeListener(signal, handler);
    }
  };
}

async function runDoctestFileTasks({
  files,
  jobs,
  tmpDir,
  options,
  invocationCwd,
  resourceRoot,
  cancellation = null,
  onResult = null,
}) {
  const results = new Array(files.length);
  let nextIndex = 0;
  async function workerLoop() {
    while (true) {
      if (cancellation && cancellation.cancelled) {
        throw new DoctestRunInterrupted(cancellation.signal);
      }
      const index = nextIndex;
      nextIndex += 1;
      if (index >= files.length) {
        return;
      }
      const result = await runDoctestFileTask({
        index,
        file: files[index],
        tmpDir,
        options,
        invocationCwd,
        resourceRoot,
        cancellation,
      });
      results[index] = result;
      if (onResult) {
        onResult(result);
      }
    }
  }
  await Promise.all(Array.from({ length: jobs }, () => workerLoop()));
  return results;
}

async function runDoctestFileTask({
  index,
  file,
  tmpDir,
  options,
  invocationCwd,
  resourceRoot,
  cancellation = null,
}) {
  const resultPath = path.join(tmpDir, `result-${index}.json`);
  const statePath = path.join(tmpDir, `state-${index}.json`);
  const workerOptionsPath = path.join(tmpDir, `worker-${index}.json`);
  const fileBegin = Date.now();
  try {
    let lastErr = null;
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (attempt > 1) {
        for (const stalePath of [resultPath, statePath]) {
          fs.rmSync(stalePath, { force: true });
        }
      }
      try {
        await runDoctestFileWorker({
          workerOptionsPath,
          file,
          resultPath,
          statePath,
          long: options.long,
          optional: options.optional,
          optionalFeatures: options.optionalFeatures,
          deferred: options.deferred,
          deferredFeatures: options.deferredFeatures,
          blockKeys: options.blockKeys,
          lines: options.lines,
          sourceRoot: options.sourceRoot,
          invocationCwd,
          resourceRoot,
          timeoutSeconds: options.timeoutSeconds,
          cancellation,
        });
        const parsed = readJsonFile(resultPath);
        return { index, files: parsed && Array.isArray(parsed.files) ? parsed.files : [] };
      } catch (err) {
        const parsed = readJsonFile(resultPath);
        if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
          return { index, files: parsed.files };
        }
        lastErr = err;
        if (err instanceof DoctestRunInterrupted) {
          throw err;
        }
        if (attempt < maxAttempts && isRetriableDoctestWorkerError(err)) {
          continue;
        }
        break;
      }
    }
    {
      const err = lastErr;
      if (!err) {
        throw new Error(`sage -t worker did not produce a result for ${file}`);
      }
      const state = readJsonFile(statePath);
      const failedPath =
        state && typeof state.current_file === "string" ? state.current_file : file;
      return {
        index,
        errorFile: makeDoctestErrorFile(
          failedPath,
          err,
          Date.now() - fileBegin,
          state,
        ),
      };
    }
  } finally {
    for (const filePath of [workerOptionsPath, resultPath, statePath]) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

function isRetriableDoctestWorkerError(err) {
  if (!err || err.doctestTimedOut) {
    return false;
  }
  return typeof err.doctestWorkerSignal === "string" && err.doctestWorkerSignal.length > 0;
}

async function runDoctestWorker(args, invocationCwd, pythonOptions) {
  if (args.length !== 1) {
    throw new Error("--doctest-worker requires one JSON options path");
  }
  const payload = JSON.parse(fs.readFileSync(args[0], "utf8"));
  let python = null;
  try {
    python = await createSagelitePython(pythonOptions);
    const code = buildDoctestPython({
      files: [payload.file],
      resultPath: payload.resultPath,
      statePath: payload.statePath,
      long: payload.long,
      optional: payload.optional,
      optionalFeatures: payload.optionalFeatures || [],
      deferred: payload.deferred || false,
      deferredFeatures: payload.deferredFeatures || [],
      blockKeys: payload.blockKeys || [],
      lines: payload.lines || [],
      sourceRoot: payload.sourceRoot,
      invocationCwd: payload.invocationCwd || invocationCwd,
    });
    await python.exec(code);
    await python.kernel.flushOutput(250);
    return 0;
  } finally {
    if (python) {
      python.terminate();
    }
  }
}

function runDoctestFileWorker({
  workerOptionsPath,
  file,
  resultPath,
  statePath,
  long,
  optional,
  optionalFeatures,
  deferred,
  deferredFeatures,
  blockKeys,
  lines,
  sourceRoot,
  invocationCwd,
  resourceRoot,
  timeoutSeconds,
  cancellation = null,
}) {
  fs.writeFileSync(
    workerOptionsPath,
    JSON.stringify(
      {
        file,
        resultPath,
        statePath,
        long,
        optional,
        optionalFeatures,
        deferred,
        deferredFeatures,
        blockKeys,
        lines,
        sourceRoot,
        invocationCwd,
      },
      null,
      2,
    ),
  );
  const childEnv = {
    ...process.env,
    COWASM_SAGELITE_ELECTRON_RESOURCES: resourceRoot,
  };
  return new Promise((resolve, reject) => {
    if (cancellation && cancellation.cancelled) {
      reject(new DoctestRunInterrupted(cancellation.signal));
      return;
    }
    const child = spawn(process.execPath, [__filename, "--doctest-worker", workerOptionsPath], {
      cwd: invocationCwd,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const unregisterChild = cancellation
      ? cancellation.registerChild(child)
      : () => {};
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let timeout = null;
    let forceKill = null;
    if (timeoutSeconds) {
      timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        forceKill = setTimeout(() => {
          child.kill("SIGKILL");
        }, 2000);
      }, timeoutSeconds * 1000);
    }
    child.stdout.on("data", (data) => {
      stdout = limitDiagnosticText(stdout + data.toString());
    });
    child.stderr.on("data", (data) => {
      stderr = limitDiagnosticText(stderr + data.toString());
    });
    child.on("error", (err) => {
      unregisterChild();
      if (timeout) {
        clearTimeout(timeout);
      }
      if (forceKill) {
        clearTimeout(forceKill);
      }
      reject(err);
    });
    child.on("close", (code, signal) => {
      unregisterChild();
      if (timeout) {
        clearTimeout(timeout);
      }
      if (forceKill) {
        clearTimeout(forceKill);
      }
      if (timedOut) {
        const err = new Error(`sage -t timed out after ${timeoutSeconds}s for ${file}`);
        err.stdout = stdout;
        err.stderr = stderr;
        err.doctestTimedOut = true;
        reject(err);
        return;
      }
      if (cancellation && cancellation.cancelled) {
        reject(new DoctestRunInterrupted(cancellation.signal || signal));
        return;
      }
      if (code === 0) {
        resolve();
        return;
      }
      const detail = [
        `sage -t worker exited with status ${code}${signal ? ` signal ${signal}` : ""} for ${file}`,
        stderr ? `stderr:\n${stderr}` : "",
        stdout ? `stdout:\n${stdout}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const err = new Error(detail);
      err.stdout = stdout;
      err.stderr = stderr;
      err.doctestWorkerCode = code;
      err.doctestWorkerSignal = signal;
      reject(err);
    });
  });
}

function appendDoctestFiles(run, parsed) {
  if (!parsed || !Array.isArray(parsed.files)) {
    return;
  }
  for (const file of parsed.files) {
    run.files.push(file);
  }
}

function appendDoctestTaskResult(run, result) {
  if (Array.isArray(result.files)) {
    for (const file of result.files) {
      run.files.push(file);
    }
  }
  if (result.errorFile) {
    run.files.push(result.errorFile);
  }
}

function makeDoctestErrorFile(failedPath, err, durationMs, state = null) {
  const rawDetail = String(err && err.stack ? err.stack : err);
  const detail = doctestStateDiagnostic(state, rawDetail);
  return {
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
  };
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
  const context = [`doctest state: ${parts.join("; ")}`];
  if (typeof state.source === "string" && state.source) {
    context.push(`doctest source:\n${truncateDoctestStateText(state.source)}`);
  }
  if (typeof state.expected === "string" && state.expected) {
    context.push(`doctest expected:\n${truncateDoctestStateText(state.expected)}`);
  }
  return `${context.join("\n")}\n${detail}`;
}

function truncateDoctestStateText(value) {
  const maxLength = 1200;
  return value.length > maxLength
    ? `${value.slice(0, maxLength)}\n... truncated ...`
    : value;
}

function limitDiagnosticText(value) {
  const maxLength = 20000;
  return value.length > maxLength ? value.slice(value.length - maxLength) : value;
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

function buildDoctestPython({
  files,
  resultPath,
  statePath,
  long,
  optional,
  optionalFeatures,
  deferred,
  deferredFeatures,
  blockKeys,
  lines,
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
import types
import warnings

warnings.filterwarnings(
    "ignore",
    message=r"Option .*at_startup=True.* for lazy import .* not needed anymore",
    category=UserWarning,
)

from sage.all import *
from sage.repl.preparse import preparse as __cowasm_sagelite_preparse
from sage.repl.display.fancy_repr import (
    LargeMatrixHelpRepr as __CowasmLargeMatrixHelpRepr,
    SomeIPythonRepr as __CowasmSomeIPythonRepr,
    TallListRepr as __CowasmTallListRepr,
)
from sage.misc.html import HtmlFragment as __CowasmHtmlFragment
from sage.structure.element import Matrix as __CowasmMatrix
from sage.structure.sequence import Sequence_generic as __CowasmSequence

__cowasm_files = ${JSON.stringify(JSON.stringify(files))}
__cowasm_result_path = ${JSON.stringify(resultPath)}
__cowasm_state_path = ${JSON.stringify(statePath)}
__cowasm_long = ${long ? "True" : "False"}
__cowasm_optional = ${optional ? "True" : "False"}
__cowasm_optional_features = set(json.loads(${JSON.stringify(JSON.stringify(optionalFeatures))}))
__cowasm_deferred = ${deferred ? "True" : "False"}
__cowasm_deferred_features = set(json.loads(${JSON.stringify(JSON.stringify(deferredFeatures))}))
__cowasm_block_keys = set(json.loads(${JSON.stringify(JSON.stringify(blockKeys))}))
__cowasm_lines = set(json.loads(${JSON.stringify(JSON.stringify(lines))}))
__cowasm_source_root = ${sourceRoot ? JSON.stringify(sourceRoot) : "None"}
__cowasm_invocation_cwd = ${JSON.stringify(invocationCwd)}
__cowasm_current_state = {}
__cowasm_state_unset = object()

__cowasm_deferred_re = re.compile(
    r"#.*\\b(not implemented|not tested|known bug|py2)\\b",
    re.IGNORECASE,
)
__cowasm_optional_re = re.compile(
    r"(?:#|[,;])\\s*(optional|needs)\\b",
    re.IGNORECASE,
)
__cowasm_optional_tag_re = re.compile(
    r"(?:#|[,;])\\s*(optional|needs)\\b(?P<features>[^\\n]*)",
    re.IGNORECASE,
)
__cowasm_long_re = re.compile(r"#.*\\blong time\\b", re.IGNORECASE)
__cowasm_random_re = re.compile(r"#.*\\brandom\\b", re.IGNORECASE)
__cowasm_tol_re = re.compile(r"#.*\\b(abs tol|rel tol|tol)\\b", re.IGNORECASE)
__cowasm_tol_directive_re = re.compile(
    r"#.*?\\b((?:abs(?:olute)?|rel(?:ative)?)\\s+tol(?:erance)?|tol(?:erance)?)\\b(?:\\s+([-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?))?",
    re.IGNORECASE,
)
_cowasm_literal_ellipsis_prefix = "__COWASM_LITERAL_ELLIPSIS__:"
_cowasm_literal_numeric_ellipsis_re = re.compile(
    r"(?<![\\w.])([-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?)\\.\\.\\."
)
_cowasm_number_re = re.compile(
    r"(?<![\\w.])[ \\t]*[-+]?[ \\t]*(?:(?:\\d+\\.\\d*)|(?:\\.\\d+)|(?:\\d+))(?:[eE][-+]?\\d+)?(?![\\w.])"
)
COWASM_RANDOM_ACCEPT = "__COWASM_RANDOM_ACCEPT__\\n"
COWASM_TOLERANCE_PREFIX = "__COWASM_TOLERANCE__"
COWASM_LEADING_ELLIPSIS_SENTINEL = "__COWASM_LEADING_ELLIPSIS__"


def __cowasm_doctest_showwarning(message, category, filename, lineno, file=None, line=None):
    output = warnings.formatwarning(message, category, "doctest", lineno, line)
    if file is not None:
        file.write(output)
    else:
        sys.stdout.write(output)


__cowasm_active_displayhook_globals = None
__cowasm_displayhook_delegate = None
__cowasm_large_matrix_repr = __CowasmLargeMatrixHelpRepr()
__cowasm_ipython_repr = __CowasmSomeIPythonRepr()
__cowasm_tall_list_repr = __CowasmTallListRepr()


def __cowasm_doctest_display_large_matrix(value):
    if not isinstance(value, __CowasmMatrix):
        return False
    formatted = __cowasm_large_matrix_repr.format_string(value)
    if formatted == "--- object not handled by representer ---":
        return False
    sys.stdout.write(formatted + "\\n")
    return True


def __cowasm_doctest_displayhook(value):
    try:
        if isinstance(value, __CowasmSequence):
            formatted = __cowasm_tall_list_repr.format_string(value)
            if formatted == "--- object not handled by representer ---":
                formatted = repr(list(value))
            sys.stdout.write(formatted + "\\n")
        elif isinstance(value, __CowasmHtmlFragment):
            sys.stdout.write(str(value) + "\\n")
        elif isinstance(value, dict):
            formatted = __cowasm_ipython_repr.format_string(value)
            if formatted == "--- object not handled by representer ---":
                formatted = repr(value)
            sys.stdout.write(formatted + "\\n")
        elif isinstance(value, (list, tuple)):
            from sage.repl.display.fancy_repr import TallListRepr
            formatted = TallListRepr().format_string(value)
            if formatted != "--- object not handled by representer ---":
                sys.stdout.write(formatted + "\\n")
            elif __cowasm_displayhook_delegate is not None:
                __cowasm_displayhook_delegate(value)
            else:
                sys.__displayhook__(value)
        elif __cowasm_doctest_display_large_matrix(value):
            pass
        elif __cowasm_displayhook_delegate is not None:
            __cowasm_displayhook_delegate(value)
        else:
            sys.__displayhook__(value)
    except Exception as exc:
        type_name = type(value).__qualname__
        module_name = type(value).__module__
        if module_name and module_name not in ("builtins", "__main__"):
            type_name = module_name + "." + type_name
        sys.stdout.write(
            f"<repr(<{type_name} at 0x{id(value):x}>) failed: "
            f"{type(exc).__name__}: {exc}>\\n"
        )
    if value is not None and __cowasm_active_displayhook_globals is not None:
        __cowasm_active_displayhook_globals["_"] = value


def __cowasm_doctest_expects_warning(test):
    for example in test.examples:
        if example.options.get(doctest.SKIP, False):
            continue
        if "Warning:" in getattr(example, "want", ""):
            return True
    return False


def __cowasm_note_state(
    current_file=None,
    phase=None,
    name=None,
    line=None,
    source=__cowasm_state_unset,
    expected=__cowasm_state_unset,
):
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
    if source is not __cowasm_state_unset:
        if source is None:
            __cowasm_current_state.pop("source", None)
        else:
            __cowasm_current_state["source"] = source
    if expected is not __cowasm_state_unset:
        if expected is None:
            __cowasm_current_state.pop("expected", None)
        else:
            __cowasm_current_state["expected"] = expected
    try:
        with open(__cowasm_state_path, "w", encoding="utf-8") as __cowasm_state:
            json.dump(__cowasm_current_state, __cowasm_state)
    except BaseException:
        pass


def __cowasm_limited_state_text(value):
    max_length = 1200
    if len(value) <= max_length:
        return value
    return value[:max_length] + "\\n... truncated ..."


def __cowasm_state_diagnostic(detail):
    parts = []
    phase = __cowasm_current_state.get("phase")
    current_file = __cowasm_current_state.get("current_file")
    name = __cowasm_current_state.get("name")
    line = __cowasm_current_state.get("line")
    source = __cowasm_current_state.get("source")
    expected = __cowasm_current_state.get("expected")
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
    context = ["doctest state: " + "; ".join(parts)]
    if source:
        context.append("doctest source:\\n" + __cowasm_limited_state_text(source))
    if expected:
        context.append("doctest expected:\\n" + __cowasm_limited_state_text(expected))
    return "\\n".join(context) + "\\n" + detail


def _cowasm_exception_detail(exc):
    if isinstance(exc, ModuleNotFoundError) and getattr(exc, "name", None):
        return f"missing module: {exc.name}"
    if isinstance(exc, ImportError):
        message = str(exc).strip()
        return f"import error: {message}" if message else "import error"
    message = str(exc).strip()
    if message:
        return f"{exc.__class__.__name__}: {message}"
    return exc.__class__.__name__


def __cowasm_resolve_core_lazy_namespace(namespace):
    direct_imports = {
        "RR": ("sage.rings.real_mpfr", "RR"),
        "CC": ("sage.rings.complex_mpfr", "CC"),
        "RIF": ("sage.rings.real_mpfi", "RIF"),
        "CIF": ("sage.rings.complex_interval", "CIF"),
        "RDF": ("sage.rings.real_double", "RDF"),
        "CDF": ("sage.rings.complex_double", "CDF"),
        "RLF": ("sage.rings.real_lazy", "RLF"),
        "RBF": ("sage.rings.real_arb", "RBF"),
        "CBF": ("sage.rings.complex_arb", "CBF"),
        "AA": ("sage.rings.qqbar", "AA"),
        "QQbar": ("sage.rings.qqbar", "QQbar"),
        "I": ("sage.rings.imaginary_unit", "I"),
    }
    for name, (module_name, object_name) in direct_imports.items():
        value = namespace.get(name)
        get_object = getattr(value, "_get_object", None)
        if get_object is not None:
            try:
                namespace[name] = get_object()
                continue
            except BaseException:
                pass
        try:
            module = importlib.import_module(module_name)
            namespace[name] = getattr(module, object_name)
        except BaseException:
            pass


def __cowasm_seed_common_doctest_globals(namespace):
    imports = (
        ("sage.combinat.combination", ("Combinations",)),
        ("sage.combinat.alternating_sign_matrix", ("AlternatingSignMatrices",)),
        ("sage.combinat.binary_tree", ("BinaryTree",)),
        ("sage.combinat.combinat", ("CombinatorialObject", "fibonacci", "stirling_number2")),
        ("sage.combinat.free_module", ("CombinatorialFreeModule",)),
        ("sage.combinat.gelfand_tsetlin_patterns", ("GelfandTsetlinPattern", "GelfandTsetlinPatterns")),
        ("sage.combinat.composition", ("Composition",)),
        ("sage.combinat.integer_vector", ("IntegerVectors",)),
        ("sage.combinat.integer_lists", ("IntegerListsLex",)),
        ("sage.combinat.non_decreasing_parking_function", ("NonDecreasingParkingFunction", "NonDecreasingParkingFunctions")),
        ("sage.combinat.parking_functions", ("ParkingFunction",)),
        ("sage.combinat.ordered_tree", ("OrderedTree",)),
        ("sage.combinat.partition", ("Partition", "Partitions", "PartitionsInBox")),
        ("sage.combinat.perfect_matching", ("PerfectMatching",)),
        ("sage.combinat.permutation", ("Arrangements", "Permutation", "Permutations")),
        ("sage.combinat.regular_sequence", ("RegularSequenceRing",)),
        ("sage.combinat.set_partition_ordered", ("OrderedSetPartition", "OrderedSetPartitions")),
        ("sage.combinat.skew_tableau", ("SemistandardSkewTableaux", "SkewTableau", "SkewTableaux")),
        ("sage.combinat.species.recursive_species", ("CombinatorialSpecies",)),
        ("sage.combinat.symmetric_group_algebra", ("SymmetricGroupAlgebra",)),
        ("sage.combinat.tableau", ("SemistandardTableau", "SemistandardTableaux", "StandardTableau", "StandardTableaux", "Tableau", "Tableaux")),
        ("sage.combinat.tableau_tuple", ("StandardTableauTuple", "StandardTableauTuples", "TableauTuples")),
        ("sage.combinat.partition_tuple", ("PartitionTuple", "PartitionTuples")),
        ("sage.combinat.posets.lattices", ("LatticePoset",)),
        ("sage.combinat.posets.posets", ("Poset",)),
        ("sage.combinat.subset", ("Subsets", "powerset", "subsets")),
        ("sage.combinat.vector_partition", ("VectorPartitions",)),
        ("sage.combinat.words.word", ("Word",)),
        ("sage.combinat.words.alphabet", ("Alphabet",)),
        ("sage.combinat.words.word_generators", ("words",)),
        ("sage.combinat.words.word_options", ("WordOptions",)),
        ("sage.combinat.words.words", ("InfiniteWords", "Words")),
        ("sage.combinat.words.lyndon_word", ("LyndonWords",)),
        ("sage.combinat.words.morphism", ("WordMorphism",)),
        ("sage.monoids.free_abelian_monoid", ("FreeAbelianMonoid",)),
        ("sage.monoids.free_monoid", ("FreeMonoid",)),
        ("sage.monoids.string_monoid", (
            "AlphabeticStrings", "BinaryStrings", "HexadecimalStrings",
            "OctalStrings", "Radix64Strings",
        )),
        ("sage.categories.additive_groups", ("AdditiveGroups",)),
        ("sage.categories.additive_magmas", ("AdditiveMagmas",)),
        ("sage.categories.additive_monoids", ("AdditiveMonoids",)),
        ("sage.categories.additive_semigroups", ("AdditiveSemigroups",)),
        ("sage.categories.algebras", ("Algebras",)),
        ("sage.categories.algebra_ideals", ("AlgebraIdeals",)),
        ("sage.categories.bialgebras", ("Bialgebras",)),
        ("sage.categories.bimodules", ("Bimodules",)),
        ("sage.categories.coalgebras", ("Coalgebras",)),
        ("sage.categories.coalgebras_with_basis", ("CoalgebrasWithBasis",)),
        ("sage.categories.chain_complexes", ("ChainComplexes",)),
        ("sage.categories.commutative_additive_groups", ("CommutativeAdditiveGroups",)),
        ("sage.categories.division_rings", ("DivisionRings",)),
        ("sage.categories.euclidean_domains", ("EuclideanDomains",)),
        ("sage.categories.enumerated_sets", ("EnumeratedSets",)),
        ("sage.categories.fields", ("Fields",)),
        ("sage.categories.functor", ("IdentityFunctor",)),
        ("sage.categories.finite_fields", ("FiniteFields",)),
        ("sage.categories.finite_sets", ("FiniteSets",)),
        ("sage.categories.homset", ("End", "Hom")),
        ("sage.categories.commutative_rings", ("CommutativeRings",)),
        ("sage.categories.domains", ("Domains",)),
        ("sage.categories.rings", ("Rings",)),
        ("sage.categories.rngs", ("Rngs",)),
        ("sage.categories.finite_enumerated_sets", ("FiniteEnumeratedSets",)),
        ("sage.categories.infinite_enumerated_sets", ("InfiniteEnumeratedSets",)),
        ("sage.categories.algebras_with_basis", ("AlgebrasWithBasis",)),
        ("sage.categories.commutative_additive_monoids", ("CommutativeAdditiveMonoids",)),
        ("sage.categories.commutative_additive_semigroups", ("CommutativeAdditiveSemigroups",)),
        ("sage.categories.coxeter_groups", ("CoxeterGroups",)),
        ("sage.categories.finite_coxeter_groups", ("FiniteCoxeterGroups",)),
        ("sage.categories.finite_weyl_groups", ("FiniteWeylGroups",)),
        ("sage.categories.finite_dimensional_algebras_with_basis", ("FiniteDimensionalAlgebrasWithBasis",)),
        ("sage.categories.finite_dimensional_hopf_algebras_with_basis", ("FiniteDimensionalHopfAlgebrasWithBasis",)),
        ("sage.categories.finite_dimensional_modules_with_basis", ("FiniteDimensionalModulesWithBasis",)),
        ("sage.categories.graded_algebras", ("GradedAlgebras",)),
        ("sage.categories.graded_algebras_with_basis", ("GradedAlgebrasWithBasis",)),
        ("sage.categories.lie_algebras", ("LieAlgebras",)),
        ("sage.categories.lie_conformal_algebras", ("LieConformalAlgebras",)),
        ("sage.algebras.lie_algebras.all", ("lie_algebras",)),
        ("sage.algebras.lie_conformal_algebras.all", ("LieConformalAlgebra", "lie_conformal_algebras")),
        ("sage.algebras.commutative_dga", ("GradedCommutativeAlgebra",)),
        ("sage.algebras.clifford_algebra", ("ExteriorAlgebra",)),
        ("sage.algebras.free_algebra", ("FreeAlgebra",)),
        ("sage.algebras.weyl_algebra", ("DifferentialWeylAlgebra",)),
        ("sage.algebras.octonion_algebra", ("OctonionAlgebra",)),
        ("sage.algebras.steenrod.steenrod_algebra", ("SteenrodAlgebra", "Sq")),
        ("sage.categories.graded_modules", ("GradedModules",)),
        ("sage.categories.graded_modules_with_basis", ("GradedModulesWithBasis",)),
        ("sage.categories.graded_hopf_algebras_with_basis", ("GradedHopfAlgebrasWithBasis",)),
        ("sage.categories.category", ("Category",)),
        ("sage.categories.group_algebras", ("GroupAlgebras",)),
        ("sage.categories.hopf_algebras", ("HopfAlgebras",)),
        ("sage.categories.hopf_algebras_with_basis", ("HopfAlgebrasWithBasis",)),
        ("sage.categories.left_modules", ("LeftModules",)),
        ("sage.categories.lattice_posets", ("LatticePosets",)),
        ("sage.categories.modular_abelian_varieties", ("ModularAbelianVarieties",)),
        ("sage.categories.morphism", ("Morphism",)),
        ("sage.categories.modules", ("Modules",)),
        ("sage.categories.modules_with_basis", ("ModulesWithBasis",)),
        ("sage.categories.number_fields", ("NumberFields",)),
        ("sage.categories.objects", ("Objects",)),
        ("sage.categories.principal_ideal_domains", ("PrincipalIdealDomains",)),
        ("sage.categories.quotient_fields", ("QuotientFields",)),
        ("sage.categories.right_modules", ("RightModules",)),
        ("sage.categories.ring_ideals", ("RingIdeals",)),
        ("sage.categories.sets_cat", ("Sets",)),
        ("sage.categories.sets_with_grading", ("SetsWithGrading",)),
        ("sage.categories.sets_with_partial_maps", ("SetsWithPartialMaps",)),
        ("sage.categories.schemes", ("Schemes",)),
        ("sage.categories.simplicial_complexes", ("SimplicialComplexes",)),
        ("sage.categories.vector_spaces", ("VectorSpaces",)),
        ("sage.categories.crystals", ("Crystals",)),
        ("sage.categories.finite_groups", ("FiniteGroups",)),
        ("sage.categories.groups", ("Groups",)),
        ("sage.categories.magmas", ("Magmas",)),
        ("sage.categories.monoids", ("Monoids",)),
        ("sage.categories.permutation_groups", ("PermutationGroups",)),
        ("sage.combinat.posets.poset_examples", ("Posets", "posets")),
        ("sage.categories.semigroups", ("Semigroups",)),
        ("sage.categories.semirings", ("Semirings",)),
        ("sage.categories.tensor", ("tensor",)),
        ("sage.categories.unique_factorization_domains", ("UniqueFactorizationDomains",)),
        ("sage.categories.finite_monoids", ("FiniteMonoids",)),
        ("sage.categories.finite_semigroups", ("FiniteSemigroups",)),
        ("sage.combinat.root_system.cartan_type", ("CartanType",)),
        ("sage.combinat.root_system.coxeter_type", ("CoxeterType",)),
        ("sage.combinat.root_system.root_system", ("RootSystem", "WeylDim")),
        ("sage.geometry.toric_lattice", ("ToricLattice",)),
        ("sage.functions.bessel", ("bessel_J",)),
        ("sage.calculus.transforms.dwt", ("WaveletTransform",)),
        ("sage.functions.jacobi", ("jacobi",)),
        ("sage.functions.log", ("ln",)),
        ("sage.functions.trig", ("cos", "cot", "sin", "tan")),
        ("sage.functions.transcendental", ("dickman_rho",)),
        ("sage.functions.other", ("ceil", "floor", "imag", "imag_part", "real", "real_part")),
        ("sage.graphs.graph", ("Graph",)),
        ("sage.graphs.digraph", ("DiGraph",)),
        ("sage.graphs.bipartite_graph", ("BipartiteGraph",)),
        ("sage.graphs.all", ("graphs", "digraphs")),
        ("sage.groups.abelian_gps.abelian_group", ("AbelianGroup",)),
        ("sage.groups.matrix_gps.linear", ("GL", "SL")),
        ("sage.homology.chain_complex", ("ChainComplex",)),
        ("sage.logic.all", ("propcalc", "SymbolicLogic")),
        ("sage.misc.functional", ("sqrt",)),
        ("sage.modular.drinfeld_modform.ring", ("DrinfeldModularForms",)),
        ("sage.modular.modsym.g1list", ("G1list",)),
        ("sage.modular.modsym.p1list", ("P1List",)),
        ("sage.modules.free_module_element", ("random_vector",)),
        ("sage.plot.colors", ("hue",)),
        ("sage.plot.graphics", ("Graphics",)),
        ("sage.plot.arc", ("arc",)),
        ("sage.plot.bar_chart", ("bar_chart",)),
        ("sage.plot.line", ("line",)),
        ("sage.plot.circle", ("circle",)),
        ("sage.plot.ellipse", ("ellipse",)),
        ("sage.plot.matrix_plot", ("matrix_plot",)),
        ("sage.plot.plot", ("list_plot_loglog",)),
        ("sage.plot.point", ("point", "point2d")),
        ("sage.plot.polygon", ("polygon",)),
        ("sage.stats.all", ("distributions",)),
        ("sage.probability.probability_distribution", ("RealDistribution",)),
        ("sage.quadratic_forms.quadratic_form", ("DiagonalQuadraticForm", "QuadraticForm")),
        ("sage.modules.free_module", ("FreeModule", "VectorSpace", "span")),
        ("sage.modules.free_module_element", ("vector",)),
        ("sage.tensor.modules.finite_rank_free_module", ("FiniteRankFreeModule",)),
        ("sage.sets.condition_set", ("ConditionSet",)),
        ("sage.sets.disjoint_union_enumerated_sets", ("DisjointUnionEnumeratedSets",)),
        ("sage.sets.finite_enumerated_set", ("FiniteEnumeratedSet",)),
        ("sage.sets.finite_set_maps", ("FiniteSetMaps",)),
        ("sage.sets.family", ("Family",)),
        ("sage.sets.integer_range", ("IntegerRange",)),
        ("sage.sets.non_negative_integers", ("NonNegativeIntegers",)),
        ("sage.sets.primes", ("Primes",)),
        ("sage.sets.recursively_enumerated_set", ("RecursivelyEnumeratedSet",)),
        ("sage.sets.set", ("Set",)),
        ("sage.schemes.affine.affine_space", ("AffineSpace",)),
        ("sage.schemes.generic.spec", ("Spec",)),
        ("sage.schemes.projective.projective_space", ("ProjectiveSpace",)),
        ("sage.schemes.product_projective.space", ("ProductProjectiveSpaces",)),
        ("sage.schemes.weighted_projective.weighted_projective_space", ("WeightedProjectiveSpace",)),
    )
    for module_name, names in imports:
        try:
            module = importlib.import_module(module_name)
        except BaseException:
            continue
        for name in names:
            value = getattr(module, name)
            namespace.setdefault(name, value)
            try:
                import sage.all as sage_all
                if not hasattr(sage_all, name):
                    setattr(sage_all, name, value)
            except BaseException:
                pass
    try:
        import sage.algebras.catalog as algebras
        namespace.setdefault("algebras", algebras)
    except BaseException:
        pass
    try:
        import sage.algebras.free_algebra_quotient
    except BaseException:
        pass
    try:
        import sage.combinat.path_tableaux.catalog as path_tableaux
        namespace.setdefault("path_tableaux", path_tableaux)
        try:
            import sage.all as sage_all
            if not hasattr(sage_all, "path_tableaux"):
                setattr(sage_all, "path_tableaux", path_tableaux)
        except BaseException:
            pass
    except BaseException:
        pass
    try:
        from sage.crypto.all import key_exchange
        namespace.setdefault("key_exchange", key_exchange)
        try:
            import sage.all as sage_all
            if not hasattr(sage_all, "key_exchange"):
                setattr(sage_all, "key_exchange", key_exchange)
        except BaseException:
            pass
    except BaseException:
        pass
    try:
        from sage.crypto import mq
        namespace.setdefault("mq", mq)
        try:
            import sage.all as sage_all
            if not hasattr(sage_all, "mq"):
                setattr(sage_all, "mq", mq)
        except BaseException:
            pass
    except BaseException:
        pass
    try:
        import sage.coding.codes_catalog as codes
        namespace.setdefault("codes", codes)
        try:
            import sage.all as sage_all
            if not hasattr(sage_all, "codes"):
                setattr(sage_all, "codes", codes)
        except BaseException:
            pass
    except BaseException:
        pass
    try:
        from sage.rings.real_mpfr import RealField
        namespace.setdefault("e", math.e)
        namespace.setdefault("pi", RealField(200).pi())
        namespace.setdefault("NaN", RealField()(float("nan")))
    except BaseException:
        pass
    try:
        import sage.combinat.designs.design_catalog as designs
        namespace.setdefault("designs", designs)
        try:
            import sage.all as sage_all
            if not hasattr(sage_all, "designs"):
                setattr(sage_all, "designs", designs)
        except BaseException:
            pass
    except BaseException:
        pass
    try:
        import sage.groups.groups_catalog as groups
        namespace.setdefault("groups", groups)
        try:
            import sage.all as sage_all
            if not hasattr(sage_all, "groups"):
                setattr(sage_all, "groups", groups)
        except BaseException:
            pass
    except BaseException:
        pass
    try:
        import sage.dynamics.cellular_automata.catalog as cellular_automata
        namespace.setdefault("cellular_automata", cellular_automata)
        try:
            import sage.all as sage_all
            if not hasattr(sage_all, "cellular_automata"):
                setattr(sage_all, "cellular_automata", cellular_automata)
        except BaseException:
            pass
    except BaseException:
        pass
    try:
        from sage.combinat.species.all import species
        namespace.setdefault("species", species)
        try:
            import sage.all as sage_all
            if not hasattr(sage_all, "species"):
                setattr(sage_all, "species", species)
        except BaseException:
            pass
    except BaseException:
        pass
    try:
        import sage.stats.all as stats
        namespace.setdefault("stats", stats)
        try:
            import sage.all as sage_all
            if not hasattr(sage_all, "stats"):
                setattr(sage_all, "stats", stats)
        except BaseException:
            pass
    except BaseException:
        pass
    try:
        import sage.game_theory.catalog as game_theory
        namespace.setdefault("game_theory", game_theory)
        try:
            import sage.all as sage_all
            if not hasattr(sage_all, "game_theory"):
                setattr(sage_all, "game_theory", game_theory)
        except BaseException:
            pass
    except BaseException:
        pass
    try:
        import sage.dynamics.finite_dynamical_system_catalog as finite_dynamical_systems
        namespace.setdefault("finite_dynamical_systems", finite_dynamical_systems)
        try:
            import sage.all as sage_all
            if not hasattr(sage_all, "finite_dynamical_systems"):
                setattr(sage_all, "finite_dynamical_systems", finite_dynamical_systems)
        except BaseException:
            pass
    except BaseException:
        pass
    try:
        from sage.combinat.posets.poset_examples import Posets as CatalogPosets
        from sage.combinat.posets.poset_examples import posets as posets_catalog
        namespace["Posets"] = CatalogPosets
        namespace.setdefault("posets", posets_catalog)
        try:
            import sage.all as sage_all
            setattr(sage_all, "Posets", CatalogPosets)
            if not hasattr(sage_all, "posets"):
                setattr(sage_all, "posets", posets_catalog)
        except BaseException:
            pass
    except BaseException:
        pass
    if "Modules" in namespace:
        namespace.setdefault("RingModules", namespace["Modules"])
    if "ModulesWithBasis" in namespace:
        namespace.setdefault("FreeModules", namespace["ModulesWithBasis"])
    try:
        from sage.categories.posets import Posets as CategoryPosets
        namespace.setdefault("PartiallyOrderedSets", CategoryPosets)
    except BaseException:
        if "Posets" in namespace:
            namespace.setdefault("PartiallyOrderedSets", namespace["Posets"])
    if "RingIdeals" in namespace:
        namespace.setdefault("Ideals", namespace["RingIdeals"])
    try:
        from sage.structure.debug_options import debug
        debug.refine_category_hash_check = True
    except BaseException:
        pass


def __cowasm_install_doctest_backend():
    try:
        from sage.repl.rich_output import get_display_manager
        from sage.repl.rich_output.backend_doctest import BackendDoctest
        dm = get_display_manager()
        if getattr(dm, "_backend", None).__class__ is not BackendDoctest:
            dm.switch_backend(BackendDoctest())
    except BaseException:
        pass


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


def __cowasm_directive_only_source(source):
    lines = [line.strip() for line in source.splitlines() if line.strip()]
    if not lines or not all(line.startswith("#") for line in lines):
        return False
    return bool(_cowasm_tags(source))


def __cowasm_merge_directive_source(directive_source, source):
    if not directive_source:
        return source
    if (
        __cowasm_directive_only_source(directive_source)
        and __cowasm_directive_only_source(source)
    ):
        lines = directive_source.rstrip().splitlines()
        for line in source.rstrip().splitlines():
            if line not in lines:
                lines.append(line)
        return "\\n".join(lines)
    return directive_source.rstrip() + "\\n" + source


def __cowasm_inline_directive_source(source):
    match = re.search(r"#.*$", source)
    if not match:
        return None
    directive = match.group(0)
    return directive if _cowasm_tags(directive) else None


def __cowasm_deferred_tags(source):
    return [match.group(1).lower() for match in __cowasm_deferred_re.finditer(source)]


def __cowasm_normalized_feature(value):
    return re.sub(r"[\\s_]+", "-", value.strip().lower())


def __cowasm_deferred_enabled(source):
    if not __cowasm_deferred_re.search(source):
        return True
    if __cowasm_deferred:
        return True
    return any(
        __cowasm_normalized_feature(tag) in __cowasm_deferred_features
        for tag in __cowasm_deferred_tags(source)
    )


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
    return bool(features and all(feature in __cowasm_optional_features for feature in features))


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
    standalone_directives = {}
    inline_directives = {}
    inline_sources = {}
    active_directive_source = None
    suppress_skipped_inline_block = False
    for lineno, line in enumerate(text.splitlines(True), start=1):
        line = __cowasm_restore_collapsed_continuation_prompts(line)
        prompt = re.match(r"^(\\s*)sage:( ?)(.*?)(\\r?\\n?)$", line)
        if suppress_skipped_inline_block and not prompt:
            if not line.strip():
                suppress_skipped_inline_block = False
                out.append(line)
            else:
                out.append("\\n")
            continue
        if prompt:
            suppress_skipped_inline_block = False
        if prompt:
            source = prompt.group(3)
            if __cowasm_directive_only_source(source):
                active_directive_source = __cowasm_merge_directive_source(
                    active_directive_source,
                    source,
                )
                line = "\\n"
            else:
                inline_directive_source = __cowasm_inline_directive_source(source)
                if inline_directive_source:
                    inline_directives[lineno] = inline_directive_source
                    inline_sources[lineno] = (
                        source[: source.index(inline_directive_source)].rstrip()
                    )
                    if __cowasm_should_skip(inline_directive_source):
                        line = (
                            prompt.group(1)
                            + "sage:"
                            + prompt.group(2)
                            + "pass"
                            + prompt.group(4)
                        )
                        suppress_skipped_inline_block = True
                    else:
                        line = (
                            prompt.group(1)
                            + "sage:"
                            + prompt.group(2)
                            + inline_sources[lineno]
                            + prompt.group(4)
                        )
                if active_directive_source:
                    standalone_directives[lineno] = active_directive_source
                    active_directive_source = None
        line = re.sub(
            r"(?m)^(\\s*)\\.\\.\\.(?!\\.:)",
            lambda match: match.group(1) + COWASM_LEADING_ELLIPSIS_SENTINEL,
            line,
        )
        line = re.sub(r"(?m)^(\\s*)sage:( ?)", r"\\1>>> ", line)
        line = re.sub(r"(?m)^(\\s*)\\.\\.\\.\\.:( ?)", r"\\1... ", line)
        out.append(line)
    return "".join(out), standalone_directives, inline_directives, inline_sources


def __cowasm_restore_collapsed_continuation_prompts(line):
    match = re.match(r"^(\\s*)sage:( ?)", line)
    if not match or "....:" not in line:
        return line
    indent = match.group(1)
    return re.sub(
        r"[ \\t]+\\.\\.\\.\\.:( ?)",
        " \\\\\\n" + indent + "....: ",
        line,
    )


def __cowasm_restore_protected_expected_output(text):
    return text.replace(COWASM_LEADING_ELLIPSIS_SENTINEL, "...")


def __cowasm_file_directive_source(text):
    directives = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if not stripped.startswith("#"):
            break
        match = re.match(r"#\\s*sage\\.doctest:\\s*(.*)$", stripped, re.IGNORECASE)
        if match:
            directive = match.group(1).strip()
            if directive:
                directives.append("# " + directive)
    return "\\n".join(directives) if directives else None


def __cowasm_file_directive_skip_result(filename, directive_source):
    source_hash = _cowasm_source_hash(directive_source)
    skip_reason = __cowasm_skip_reason(directive_source)
    return {
        "path": filename,
        "status": "passed",
        "total_blocks": 1,
        "passed_blocks": 0,
        "failed_blocks": 0,
        "skipped_blocks": 1,
        "duration_ms": 0,
        "stdout": "",
        "stderr": "",
        "failure_class": None,
        "failure_detail": None,
        "blocks": [{
            "block_index": 0,
            "name": os.path.basename(filename) + "[file-directive]",
            "start_line": 1,
            "end_line": 1,
            "source": directive_source,
            "expected": "",
            "expected_kind": "file_skip",
            "block_key": __cowasm_block_key(filename, 1, source_hash),
            "source_hash": source_hash,
            "tags": _cowasm_tags(directive_source),
            "skip_reason": skip_reason,
            "actual": "",
            "status": "skipped",
            "failure_class": "optional_or_deferred",
            "duration_ms": 0,
        }],
    }


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


def __cowasm_triple_quoted_docstrings(filename, text):
    pattern = re.compile(r"(?i)(?:\\b[rubf]+)?('''|\\\"\\\"\\\")")
    position = 0
    index = 0
    while True:
        match = pattern.search(text, position)
        if not match:
            return
        quote = match.group(1)
        content_start = match.end()
        content_end = text.find(quote, content_start)
        if content_end < 0:
            return
        content = text[content_start:content_end]
        filtered, _ = __cowasm_filtered_text_with_prompts(content)
        if filtered:
            line_base = text.count("\\n", 0, match.start())
            index += 1
            yield f"{os.path.basename(filename)}[{index}]", filtered, line_base
        position = content_end + len(quote)


def __cowasm_raw_docstring_source(text, node):
    segment = ast.get_source_segment(text, node)
    if not segment:
        return None
    match = re.match(r"(?is)^\\s*(?:[rubf]+)?('''|\\\"\\\"\\\")", segment)
    if not match:
        return None
    quote = match.group(1)
    content_start = match.end()
    content_end = segment.rfind(quote)
    if content_end < content_start:
        return None
    return segment[content_start:content_end]


def __cowasm_docstrings(filename, text):
    if not filename.endswith(".py"):
        if filename.endswith(".pyx"):
            yielded = False
            for item in __cowasm_triple_quoted_docstrings(filename, text):
                yielded = True
                yield item
            if yielded:
                return
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
    docstrings = []
    module_name = os.path.splitext(os.path.basename(filename))[0]
    stack = [(module_name, tree)]
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
                raw_docstring = __cowasm_raw_docstring_source(text, first.value)
                docstrings.append((
                    max(0, first.lineno - 1),
                    name,
                    raw_docstring if raw_docstring is not None else first.value.value,
                ))
        for child in body:
            if isinstance(child, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                stack.append((f"{name}.{child.name}", child))
    extra_index = 0
    for node in getattr(tree, "body", [])[1:]:
        if (
            isinstance(node, ast.Expr)
            and isinstance(node.value, ast.Constant)
            and isinstance(node.value.value, str)
        ):
            raw_docstring = __cowasm_raw_docstring_source(text, node.value)
            docstring = raw_docstring if raw_docstring is not None else node.value.value
            filtered, _ = __cowasm_filtered_text_with_prompts(docstring)
            if filtered:
                extra_index += 1
                docstrings.append((
                    max(0, node.lineno - 1),
                    f"{module_name}[{extra_index}]",
                    docstring,
                ))
    for line_offset, name, docstring in sorted(docstrings, key=lambda item: item[0]):
        yield name, docstring, line_offset


def __cowasm_should_skip(source):
    if not __cowasm_deferred_enabled(source):
        return True
    if not __cowasm_optional_enabled(source):
        return True
    if not __cowasm_long and __cowasm_long_re.search(source):
        return True
    return False


def __cowasm_skip_reason(source):
    deferred_tags = __cowasm_deferred_tags(source)
    if deferred_tags and not __cowasm_deferred_enabled(source):
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


def __cowasm_filter_miss_detail():
    if __cowasm_lines:
        lines = ", ".join(str(line) for line in sorted(__cowasm_lines))
        return f"no doctest block matched --line {lines}"
    keys = ", ".join(sorted(__cowasm_block_keys))
    return f"no doctest block matched --block-key {keys}"


def __cowasm_module_name_from_path(filename):
    base, ext = os.path.splitext(filename)
    if ext not in (".py", ".pyx"):
        return None
    parts = os.path.normpath(base).split(os.sep)
    if "sage" not in parts:
        return None
    i = len(parts) - 1 - parts[::-1].index("sage")
    return ".".join(parts[i:])


# Tested-module globals cover internal helper doctests that Sage normally
# reaches through its broader startup surface.  Keep explicit absence checks
# out of that compatibility seed.
__cowasm_tested_module_global_exclusions = {
    "sage.misc.dev_tools": frozenset((
        "find_objects_from_name",
        "import_statement_string",
    )),
}


def __cowasm_seed_tested_module_doctest_globals(namespace, module_name):
    if module_name == "sage.rings.cfinite_sequence":
        try:
            from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
            from sage.rings.rational_field import QQ
        except BaseException:
            return
        namespace.setdefault("x", PolynomialRing(QQ, "x").gen())


def __cowasm_namespace(filename):
    namespace = {}
    exec("from sage.all import *", namespace)
    __cowasm_install_doctest_backend()
    __cowasm_resolve_core_lazy_namespace(namespace)
    try:
        from sage.functions.generalized import sign, sgn
        namespace.setdefault("sign", sign)
        namespace.setdefault("sgn", sgn)
    except BaseException:
        pass
    __cowasm_seed_common_doctest_globals(namespace)
    module_name = __cowasm_module_name_from_path(filename)
    if module_name:
        try:
            module = importlib.import_module(module_name)
        except BaseException:
            pass
        else:
            excluded_names = __cowasm_tested_module_global_exclusions.get(
                module_name, ()
            )
            for name, value in vars(module).items():
                if name not in excluded_names:
                    namespace.setdefault(name, value)
            __cowasm_seed_tested_module_doctest_globals(namespace, module_name)
            __cowasm_resolve_core_lazy_namespace(namespace)
    namespace["__name__"] = "__main__"
    try:
        from sage.repl.user_globals import set_globals
        set_globals(namespace)
    except BaseException:
        pass
    from sage.misc.session import init as __cowasm_session_init
    __cowasm_session_init(namespace)
    return namespace


def __cowasm_restore_protected_namespace(namespace, protected_namespace):
    if protected_namespace is None:
        return
    for name in list(namespace):
        if name not in protected_namespace:
            namespace.pop(name, None)
    for name, value in protected_namespace.items():
        if namespace.get(name) is not value:
            namespace[name] = value


def __cowasm_register_main_globals(namespace):
    main_module = sys.modules.get("__main__")
    if main_module is None:
        return
    main_namespace = vars(main_module)
    for name, value in namespace.items():
        if (
            isinstance(value, (types.FunctionType, type))
            and getattr(value, "__module__", None) == "__main__"
        ):
            main_namespace[name] = value


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
        sage_source = getattr(example, "sage_source", example.source)
        effective_source = getattr(example, "_cowasm_effective_source", sage_source)
        return {
            "block_index": getattr(example, "_cowasm_block_index", len(self.blocks)),
            "name": test.name,
            "start_line": start_line,
            "end_line": end_line,
            "source": sage_source,
            "expected": getattr(example, "_cowasm_expected", example.want),
            "expected_kind": getattr(example, "_cowasm_expected_kind", "exact"),
            "block_key": getattr(example, "_cowasm_block_key", None),
            "source_hash": _cowasm_source_hash(sage_source),
            "tags": _cowasm_tags(effective_source),
            "skip_reason": getattr(example, "_cowasm_skip_reason", None),
            "duration_ms": int(getattr(example, "_cowasm_duration_ms", 0)),
        }

    def report_start(self, out, test, example):
        start_line = None
        if test.lineno is not None and example.lineno is not None:
            start_line = test.lineno + example.lineno + 1
        globals()["__cowasm_note_state"](
            test.filename,
            "run_example",
            test.name,
            start_line,
            getattr(example, "sage_source", example.source),
            getattr(example, "_cowasm_expected", example.want),
        )
        super().report_start(out, test, example)

    def report_success(self, out, test, example, got):
        globals()["__cowasm_register_main_globals"](test.globs)
        if getattr(example, "_cowasm_record_block", True) is False:
            return
        row = self.__base(test, example)
        failure_class = "random_unchecked" if getattr(example, "_cowasm_random", False) else None
        row.update({"status": "passed", "actual": got, "failure_class": failure_class})
        self.blocks.append(row)

    def report_failure(self, out, test, example, got):
        row = self.__base(test, example)
        row.update({
            "status": "failed",
            "actual": got,
            "failure_class": "output_mismatch",
            "failure_detail": "expected output mismatch",
        })
        self.blocks.append(row)

    def report_unexpected_exception(self, out, test, example, exc_info):
        row = self.__base(test, example)
        row.update({
            "status": "failed",
            "actual": "".join(traceback.format_exception(*exc_info)),
            "failure_class": exc_info[0].__name__,
            "failure_detail": _cowasm_exception_detail(exc_info[1]),
        })
        self.blocks.append(row)


class __CowasmExpectedKeyboardInterrupt(Exception):
    pass


__CowasmExpectedKeyboardInterrupt.__name__ = "KeyboardInterrupt"
__CowasmExpectedKeyboardInterrupt.__qualname__ = "KeyboardInterrupt"
__CowasmExpectedKeyboardInterrupt.__module__ = "builtins"


def __cowasm_expects_keyboard_interrupt(test):
    return any(
        example.want.lstrip().startswith("Traceback (most recent call last):")
        and re.search(r"(?m)^KeyboardInterrupt(?::|$)", example.want)
        and not example.options.get(doctest.SKIP, False)
        for example in test.examples
    )


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
            return (
                self.__check_tolerant_output(want_body, got, tolerance, optionflags)
                or self.__check_literal_dict_output(
                    want_body,
                    got,
                    tolerance,
                    optionflags,
                )
            )
        if super().check_output(want, got, optionflags):
            return True
        if self.__check_warning_output(want, got, optionflags):
            return True
        if self.__check_literal_dict_output(want, got, optionflags=optionflags):
            return True
        if self.__check_exception_line_output(want, got, optionflags):
            return True
        if self.__check_traceback_output(want, got, optionflags):
            return True
        return super().check_output(str(want), str(got), optionflags)

    def __check_warning_output(self, want, got, optionflags):
        normalized_want = self.__normalize_expected_warning_output(want)
        if normalized_want != want and super().check_output(normalized_want, got, optionflags):
            return True
        if "Warning:" in want:
            for got_variant in self.__warning_extra_block_variants(got):
                if super().check_output(want, got_variant, optionflags):
                    return True
                if (
                    normalized_want != want
                    and super().check_output(normalized_want, got_variant, optionflags)
                ):
                    return True
        got_lines = got.splitlines(True)
        prefix = ""
        for index, line in enumerate(got_lines):
            prefix += line
            if "Warning:" not in prefix:
                continue
            remaining = "".join(got_lines[index + 1:])
            if super().check_output(want, remaining, optionflags):
                return True
            if (
                normalized_want != want
                and super().check_output(normalized_want, remaining, optionflags)
            ):
                return True
        return False

    def __warning_extra_block_variants(self, text):
        variants = []
        seen = {text}
        pending = [text]
        while pending and len(variants) < 32:
            current = pending.pop()
            for start, end in self.__warning_block_spans(current):
                variant = current[:start] + current[end:]
                if variant in seen:
                    continue
                seen.add(variant)
                variants.append(variant)
                pending.append(variant)
                if len(variants) >= 32:
                    break
        return variants

    def __warning_block_spans(self, text):
        spans = []
        header_re = re.compile(
            r"(?m)^doctest:\\d+: [A-Za-z_]\\w*(?:\\.[A-Za-z_]\\w*)*Warning: .*?(?:\\r?\\n|$)"
        )
        for match in header_re.finditer(text):
            end = match.end()
            while True:
                next_end = self.__warning_detail_line_end(text, end)
                if next_end == end:
                    break
                end = next_end
            spans.append((match.start(), end))
        return spans

    def __warning_detail_line_end(self, text, start):
        if start >= len(text):
            return start
        line_end = text.find("\\n", start)
        if line_end == -1:
            line_end = len(text)
        else:
            line_end += 1
        line = text[start:line_end]
        if re.match(r"See https?://", line):
            return line_end
        return start

    def __normalize_expected_warning_output(self, text):
        text = re.sub(
            r"(?m)^([ \\t]*)doctest:warning\\r?\\n[ \\t]*\\.\\.\\.\\r?\\n[ \\t]*([A-Za-z_]\\w*(?:\\.[A-Za-z_]\\w*)*Warning):([^\\r\\n]*)\\r?\\n",
            r"\\1doctest:...: \\2:\\3\\n",
            text,
        )
        text = re.sub(
            r"(?m)^([ \\t]*)doctest:warning\\.\\.\\.:\\r?\\n[ \\t]*([A-Za-z_]\\w*(?:\\.[A-Za-z_]\\w*)*Warning):\\r?\\n",
            r"\\1doctest:...: \\2: \\n",
            text,
        )
        text = re.sub(
            r"(?m)^([ \\t]*)doctest:warning\\.\\.\\.:\\r?\\n[ \\t]*([A-Za-z_]\\w*(?:\\.[A-Za-z_]\\w*)*Warning): ",
            r"\\1doctest:...: \\2: ",
            text,
        )
        return re.sub(
            r"(?m)^([ \\t]*)doctest:warning\\.\\.\\.\\r?\\n[ \\t]*([A-Za-z_]\\w*(?:\\.[A-Za-z_]\\w*)*Warning): ",
            r"\\1doctest:...: \\2: ",
            text,
        )

    def __check_literal_dict_output(self, want, got, tolerance=None, optionflags=0):
        want = want.strip()
        got = got.strip()
        if not want.startswith("{") or not want.endswith("}"):
            return False
        if not got.startswith("{") or not got.endswith("}"):
            return False
        try:
            want_tree = self.__canonical_literal_node(ast.parse(want, mode="eval"))
            got_tree = self.__canonical_literal_node(ast.parse(got, mode="eval"))
            return self.__literal_nodes_equal(want_tree, got_tree, tolerance)
        except (SyntaxError, ValueError, TypeError):
            pass
        try:
            want_tree = self.__canonical_literal_node(
                ast.parse(self.__literal_expected_ellipsis_text(want), mode="eval")
            )
            got_tree = self.__canonical_literal_node(ast.parse(got, mode="eval"))
            return self.__literal_nodes_equal(want_tree, got_tree, tolerance)
        except (SyntaxError, ValueError, TypeError):
            return self.__check_ellipsis_dict_output(want, got, optionflags)

    def __check_ellipsis_dict_output(self, want, got, optionflags):
        if "..." not in want:
            return False
        want_items = self.__top_level_dict_items(want)
        got_items = self.__top_level_dict_items(got)
        if want_items is None or got_items is None or len(want_items) != len(got_items):
            return False
        remaining = list(got_items)
        match_flags = optionflags | doctest.ELLIPSIS
        for want_key, want_value in want_items:
            match_index = None
            for index, (got_key, got_value) in enumerate(remaining):
                if super().check_output(
                    want_key,
                    got_key,
                    match_flags,
                ) and super().check_output(
                    want_value,
                    got_value,
                    match_flags,
                ):
                    match_index = index
                    break
            if match_index is None:
                return False
            remaining.pop(match_index)
        return not remaining

    def __top_level_dict_items(self, text):
        body = text.strip()[1:-1].strip()
        if not body:
            return []
        items = []
        for item in self.__split_top_level(body, ","):
            if not item:
                continue
            pair = self.__split_top_level_once(item, ":")
            if pair is None:
                return None
            items.append(pair)
        return items

    def __split_top_level_once(self, text, separator):
        parts = self.__split_top_level(text, separator, maxsplit=1)
        if len(parts) != 2:
            return None
        return parts[0], parts[1]

    def __split_top_level(self, text, separator, maxsplit=None):
        parts = []
        current = []
        depth = 0
        quote = None
        escaped = False
        for char in text:
            if quote is not None:
                current.append(char)
                if escaped:
                    escaped = False
                elif char == "\\\\":
                    escaped = True
                elif char == quote:
                    quote = None
                continue
            if char in ("'", '"'):
                quote = char
                current.append(char)
            elif char in "([{":
                depth += 1
                current.append(char)
            elif char in ")]}":
                depth -= 1
                if depth < 0:
                    return []
                current.append(char)
            elif char == separator and depth == 0 and (
                maxsplit is None or len(parts) < maxsplit
            ):
                parts.append("".join(current).strip())
                current = []
            else:
                current.append(char)
        if quote is not None or depth != 0:
            return []
        parts.append("".join(current).strip())
        return parts

    def __literal_expected_ellipsis_text(self, text):
        def replace_numeric_ellipsis(match):
            return repr(_cowasm_literal_ellipsis_prefix + match.group(1))

        return _cowasm_literal_numeric_ellipsis_re.sub(replace_numeric_ellipsis, text)

    def __canonical_literal_node(self, node):
        if isinstance(node, ast.Expression):
            return self.__canonical_literal_node(node.body)
        if isinstance(node, ast.Constant):
            return ("constant", node.value)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            value = ast.literal_eval(node)
            return ("constant", value)
        if isinstance(node, ast.List):
            return ("list", tuple(self.__canonical_literal_node(item) for item in node.elts))
        if isinstance(node, ast.Tuple):
            return ("tuple", tuple(self.__canonical_literal_node(item) for item in node.elts))
        if isinstance(node, ast.Dict):
            items = []
            for key, value in zip(node.keys, node.values):
                if key is None:
                    raise ValueError("dictionary unpacking is not supported")
                items.append((
                    self.__canonical_literal_node(key),
                    self.__canonical_literal_node(value),
                ))
            return ("dict", tuple(items))
        raise ValueError(f"unsupported literal output node: {type(node).__name__}")

    def __literal_nodes_equal(self, want, got, tolerance=None):
        if want[0] != got[0]:
            return False
        if want[0] == "constant":
            return self.__literal_constants_equal(want[1], got[1], tolerance)
        if want[0] in ("list", "tuple"):
            return len(want[1]) == len(got[1]) and all(
                self.__literal_nodes_equal(want_item, got_item, tolerance)
                for want_item, got_item in zip(want[1], got[1])
            )
        if want[0] == "dict":
            remaining = list(got[1])
            for want_key, want_value in want[1]:
                match_index = None
                for index, (got_key, got_value) in enumerate(remaining):
                    if self.__literal_nodes_exact_equal(
                        want_key, got_key
                    ) and self.__literal_nodes_equal(want_value, got_value, tolerance):
                        match_index = index
                        break
                if match_index is None:
                    return False
                remaining.pop(match_index)
            return not remaining
        return False

    def __literal_constants_equal(self, want, got, tolerance=None):
        if isinstance(want, builtins.str) and want.startswith(_cowasm_literal_ellipsis_prefix):
            return super().check_output(
                want[len(_cowasm_literal_ellipsis_prefix):] + "...",
                str(got),
                doctest.ELLIPSIS,
            )
        if isinstance(want, (builtins.int, builtins.float)) and not isinstance(
            want, builtins.bool
        ):
            if isinstance(got, (builtins.int, builtins.float)) and not isinstance(
                got, builtins.bool
            ):
                mode = "hybrid"
                tol = 1e-15
                if tolerance is not None:
                    mode = tolerance.get("mode", mode)
                    tol = tolerance.get("tolerance", tol)
                return self.__numbers_close(
                    builtins.float(want), builtins.float(got), mode, builtins.float(tol)
                )
        return want == got

    def __literal_nodes_exact_equal(self, want, got):
        return want == got

    def __check_exception_line_output(self, want, got, optionflags):
        want_error = self.__exception_output(want)
        got_error = self.__exception_output(got)
        if want_error is None or got_error is None:
            return False
        return self.__exception_lines_match(want_error, got_error, optionflags)

    def __check_traceback_output(self, want, got, optionflags):
        want_error = self.__traceback_exception(want)
        got_error = self.__traceback_exception(got)
        if want_error is None or got_error is None:
            return False
        return self.__exception_lines_match(want_error, got_error, optionflags)

    def __traceback_exception(self, text):
        lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
        if not lines or lines[0] != "Traceback (most recent call last):":
            return None
        return self.__exception_from_lines(lines[1:])

    def __exception_output(self, text):
        lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
        if not lines or lines[0] == "Traceback (most recent call last):":
            return None
        return self.__exception_from_lines(lines)

    def __exception_from_lines(self, lines):
        candidates = []
        for index, line in enumerate(lines):
            exception_class, detail = self.__split_exception_line(line)
            if exception_class is None and line.endswith("..."):
                exception_class, _ = self.__split_exception_line(line[:-3].rstrip())
                if exception_class is not None:
                    detail = "..."
            if exception_class is None or not self.__looks_like_exception_class(exception_class):
                continue
            candidates.append((index, exception_class, detail))
        if not candidates:
            return None
        index, exception_class, detail = candidates[-1]
        continuation = [line for line in lines[index + 1:] if line != "..."]
        normalized_detail = " ".join([detail] + continuation).strip()
        if normalized_detail:
            return exception_class + ": " + normalized_detail
        return exception_class

    def __exception_lines_match(self, want, got, optionflags):
        want_class, want_detail = self.__split_exception_line(want)
        got_class, got_detail = self.__split_exception_line(got)
        if want_class is None or got_class is None:
            return False
        if not self.__looks_like_exception_class(want_class):
            return False
        if want_class.rsplit(".", 1)[-1] != got_class.rsplit(".", 1)[-1]:
            return False
        return want_detail == got_detail or super().check_output(
            want_detail, got_detail, optionflags
        )

    def __looks_like_exception_class(self, name):
        return name.rsplit(".", 1)[-1][:1].isupper()

    def __split_exception_line(self, line):
        head, separator, detail = line.partition(":")
        head = head.strip()
        if not re.match(
            r"^[A-Za-z_]\\w*(?:\\.(?:[A-Za-z_]\\w*|<locals>))*$",
            head,
        ):
            return None, None
        if not separator:
            return head, ""
        return head, detail.strip()

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
    __cowasm_note_state(filename, "start_file", source=None, expected=None)
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
        __cowasm_note_state(filename, "read_source", source=None, expected=None)
        with open(filename, "r", encoding="utf-8") as f:
            original = f.read()
        file_directive_source = __cowasm_file_directive_source(original)
        if (
            file_directive_source
            and not __cowasm_lines
            and not __cowasm_block_keys
            and __cowasm_should_skip(file_directive_source)
        ):
            file_result = __cowasm_file_directive_skip_result(filename, file_directive_source)
            return file_result
        parser = doctest.DocTestParser()
        namespace = None
        protected_namespace = None
        pending_namespace = {}
        __cowasm_note_state(filename, "initialize_runner", source=None, expected=None)
        checker = __CowasmOutputChecker()
        runner = __CowasmRecordingRunner(
            checker=checker,
            verbose=False,
            optionflags=doctest.NORMALIZE_WHITESPACE | doctest.ELLIPSIS,
        )
        attempted = 0
        failed = 0
        block_counter = 0
        selected_blocks = 0
        __cowasm_note_state(filename, "collect_docstrings", source=None, expected=None)
        for name, docstring, line_offset in __cowasm_docstrings(filename, original):
            __cowasm_restore_protected_namespace(namespace, protected_namespace)
            __cowasm_note_state(filename, "parse_doctest", name, line_offset, None, None)
            converted, standalone_directives, inline_directives, inline_sources = __cowasm_convert_prompts(docstring)
            test = parser.get_doctest(
                converted,
                namespace if namespace is not None else pending_namespace,
                name,
                filename,
                line_offset,
            )
            if not test.examples:
                continue
            for example in test.examples:
                example.want = __cowasm_restore_protected_expected_output(example.want)
            line_setup_examples = set()
            line_setup_targets = {}
            if __cowasm_lines:
                converted_lines = converted.splitlines()
                example_locations = []
                for candidate in test.examples:
                    candidate_start_line = None
                    candidate_relative_start = candidate.lineno
                    candidate_relative_physical_end = None
                    if test.lineno is not None and candidate.lineno is not None:
                        candidate_start_line = test.lineno + candidate.lineno + 1
                        candidate_physical_line_count = (
                            len(candidate.source.splitlines())
                            + len(candidate.want.splitlines())
                        )
                        candidate_relative_physical_end = (
                            candidate.lineno
                            + max(candidate_physical_line_count, 1)
                        )
                    example_locations.append({
                        "example": candidate,
                        "start_line": candidate_start_line,
                        "relative_start": candidate_relative_start,
                        "relative_physical_end": candidate_relative_physical_end,
                    })
                for position, location in enumerate(example_locations):
                    current_start_line = location["start_line"]
                    if current_start_line not in __cowasm_lines:
                        continue
                    selected_example = location["example"]
                    current_relative_start = location["relative_start"]
                    for previous_position in range(position - 1, -1, -1):
                        previous = example_locations[previous_position]
                        previous_example = previous["example"]
                        previous_relative_end = previous["relative_physical_end"]
                        if (
                            current_start_line is None
                            or current_relative_start is None
                            or previous_relative_end is None
                        ):
                            break
                        if any(
                            line.strip()
                            for line in converted_lines[
                                previous_relative_end:current_relative_start
                            ]
                        ):
                            break
                        if __cowasm_directive_only_source(previous_example.source):
                            current_start_line = previous["start_line"]
                            current_relative_start = previous["relative_start"]
                            continue
                        line_setup_examples.add(previous_example)
                        line_setup_targets.setdefault(previous_example, set()).add(
                            selected_example
                        )
                        current_start_line = previous["start_line"]
                        current_relative_start = previous["relative_start"]
            active_directive_source = None
            previous_physical_end_line = None
            for example in test.examples:
                start_line = None
                end_line = None
                physical_end_line = None
                if test.lineno is not None and example.lineno is not None:
                    start_line = test.lineno + example.lineno + 1
                    end_line = start_line + len(example.source.splitlines()) - 1
                    physical_line_count = (
                        len(example.source.splitlines()) + len(example.want.splitlines())
                    )
                    physical_end_line = start_line + max(physical_line_count, 1) - 1
                if (
                    active_directive_source
                    and previous_physical_end_line is not None
                    and start_line is not None
                    and start_line > previous_physical_end_line + 2
                ):
                    active_directive_source = None
                mapped_directive_source = (
                    standalone_directives.get(example.lineno + 1)
                    if example.lineno is not None
                    else None
                )
                if mapped_directive_source:
                    active_directive_source = __cowasm_merge_directive_source(
                        active_directive_source,
                        mapped_directive_source,
                    )
                mapped_inline_directive_source = (
                    inline_directives.get(example.lineno + 1)
                    if example.lineno is not None
                    else None
                )
                mapped_inline_source = (
                    inline_sources.get(example.lineno + 1)
                    if example.lineno is not None
                    else None
                )
                if __cowasm_directive_only_source(example.source):
                    active_directive_source = __cowasm_merge_directive_source(
                        active_directive_source,
                        example.source,
                    )
                    previous_physical_end_line = physical_end_line
                    example.options[doctest.SKIP] = True
                    continue
                index = block_counter
                block_counter += 1
                example._cowasm_block_index = index
                example.sage_source = (
                    (mapped_inline_source + "\\n")
                    if mapped_inline_source is not None
                    else example.source
                )
                example._cowasm_effective_source = __cowasm_merge_directive_source(
                    file_directive_source,
                    __cowasm_merge_directive_source(
                        active_directive_source,
                        __cowasm_merge_directive_source(
                            mapped_inline_directive_source,
                            example.sage_source,
                        ),
                    ),
                )
                example._cowasm_expected = example.want
                example._cowasm_expected_kind = "exact"
                example._cowasm_skip_reason = None
                __cowasm_note_state(
                    filename,
                    "prepare_example",
                    name,
                    start_line,
                    example.sage_source,
                    example.want,
                )
                source_hash = _cowasm_source_hash(example.sage_source)
                block_key = __cowasm_block_key(filename, start_line, source_hash)
                example._cowasm_block_key = block_key
                line_selected = bool(__cowasm_lines and start_line in __cowasm_lines)
                line_setup = bool(
                    __cowasm_lines
                    and not line_selected
                    and example in line_setup_examples
                )
                example._cowasm_record_block = not line_setup
                if line_setup:
                    example._cowasm_expected_kind = "line_setup"
                if __cowasm_lines and not line_selected and not line_setup:
                    example.options[doctest.SKIP] = True
                    previous_physical_end_line = physical_end_line
                    continue
                if __cowasm_block_keys and block_key not in __cowasm_block_keys:
                    example.options[doctest.SKIP] = True
                    previous_physical_end_line = physical_end_line
                    continue
                if not line_setup:
                    selected_blocks += 1
                if __cowasm_should_skip(example._cowasm_effective_source):
                    skip_reason = __cowasm_skip_reason(example._cowasm_effective_source)
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
                        "tags": _cowasm_tags(example._cowasm_effective_source),
                        "skip_reason": skip_reason,
                        "actual": "",
                        "status": "skipped",
                        "failure_class": "optional_or_deferred",
                        "duration_ms": 0,
                    })
                    example.options[doctest.SKIP] = True
                    previous_physical_end_line = physical_end_line
                else:
                    if line_setup and example.exc_msg is None:
                        example.want = COWASM_RANDOM_ACCEPT
                    elif __cowasm_is_random(example._cowasm_effective_source):
                        example._cowasm_random = True
                        example._cowasm_expected_kind = "random"
                        example.want = COWASM_RANDOM_ACCEPT
                    else:
                        tolerance = __cowasm_tolerance(example._cowasm_effective_source)
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
                            "tags": _cowasm_tags(example._cowasm_effective_source),
                            "skip_reason": None,
                            "actual": traceback.format_exc(),
                            "status": "failed",
                            "failure_class": "preparse_error",
                            "duration_ms": 0,
                        })
                        example.options[doctest.SKIP] = True
                previous_physical_end_line = physical_end_line
            for setup_example, target_examples in line_setup_targets.items():
                if not any(
                    not target.options.get(doctest.SKIP, False)
                    for target in target_examples
                ):
                    setup_example.options[doctest.SKIP] = True
            __cowasm_note_state(filename, "run_doctest", name, line_offset, None, None)
            if any(not example.options.get(doctest.SKIP, False) for example in test.examples):
                if namespace is None:
                    __cowasm_note_state(filename, "load_namespace", source=None, expected=None)
                    namespace = __cowasm_namespace(filename)
                    protected_namespace = dict(namespace)
                test.globs = namespace
            before = time.time()
            global __cowasm_active_displayhook_globals
            global __cowasm_displayhook_delegate
            warning_context = None
            old_showwarning = warnings.showwarning
            old_displayhook = sys.displayhook
            old_dunder_displayhook = sys.__displayhook__
            if __cowasm_doctest_expects_warning(test):
                warning_context = warnings.catch_warnings()
                warning_context.__enter__()
                warnings.simplefilter("always", Warning)
            warnings.showwarning = __cowasm_doctest_showwarning
            __cowasm_active_displayhook_globals = test.globs
            __cowasm_displayhook_delegate = old_dunder_displayhook
            sys.__displayhook__ = __cowasm_doctest_displayhook
            expected_keyboard_interrupt = __cowasm_expects_keyboard_interrupt(test)
            previous_doctest_keyboard_interrupt = getattr(
                doctest,
                "KeyboardInterrupt",
                __cowasm_state_unset,
            )
            if expected_keyboard_interrupt:
                doctest.KeyboardInterrupt = __CowasmExpectedKeyboardInterrupt
            try:
                result = runner.run(test, clear_globs=False)
            finally:
                if expected_keyboard_interrupt:
                    if previous_doctest_keyboard_interrupt is __cowasm_state_unset:
                        del doctest.KeyboardInterrupt
                    else:
                        doctest.KeyboardInterrupt = previous_doctest_keyboard_interrupt
                sys.displayhook = old_displayhook
                sys.__displayhook__ = old_dunder_displayhook
                __cowasm_displayhook_delegate = None
                __cowasm_active_displayhook_globals = None
                warnings.showwarning = old_showwarning
                if warning_context is not None:
                    warning_context.__exit__(None, None, None)
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
        if (__cowasm_lines or __cowasm_block_keys) and selected_blocks == 0:
            file_result["status"] = "error"
            file_result["failed_blocks"] = 1
            file_result["failure_class"] = "doctest_filter_miss"
            file_result["failure_detail"] = __cowasm_filter_miss_detail()
            file_result["stderr"] = file_result["failure_detail"]
        else:
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
  return execFileSync("sqlite3", ["-cmd", ".timeout 30000", dbPath], {
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
      source_root TEXT,
      tmp_dir_root TEXT,
      invocation_cwd TEXT,
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
      failure_detail TEXT,
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
  ensureSqliteColumn(dbPath, "runs", "source_root", "TEXT");
  ensureSqliteColumn(dbPath, "runs", "tmp_dir_root", "TEXT");
  ensureSqliteColumn(dbPath, "runs", "invocation_cwd", "TEXT");
  ensureSqliteColumn(dbPath, "runs", "sagelite_source_commit", "TEXT");
  ensureSqliteColumn(dbPath, "runs", "sagelite_package_commit", "TEXT");
  ensureSqliteColumn(dbPath, "files", "failure_class", "TEXT");
  ensureSqliteColumn(dbPath, "files", "failure_detail", "TEXT");
  ensureSqliteColumn(dbPath, "blocks", "block_key", "TEXT");
  ensureSqliteColumn(dbPath, "blocks", "source_hash", "TEXT");
  ensureSqliteColumn(dbPath, "blocks", "expected_kind", "TEXT");
  ensureSqliteColumn(dbPath, "blocks", "failure_detail", "TEXT");
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
  const runId = insertDoctestRun(dbPath, run);
  try {
    for (const file of run.files) {
      const fileId = insertDoctestFile(dbPath, runId, file);
      try {
        insertDoctestBlocks(dbPath, fileId, file, run);
      } catch (err) {
        deleteDoctestFile(dbPath, fileId);
        throw err;
      }
    }
  } catch (err) {
    deleteDoctestRun(dbPath, runId);
    throw err;
  }
}

function writeDoctestTaskResult(dbPath, runId, run, result) {
  const files = [];
  if (Array.isArray(result.files)) {
    files.push(...result.files);
  }
  if (result.errorFile) {
    files.push(result.errorFile);
  }
  for (const file of files) {
    const fileId = insertDoctestFile(dbPath, runId, file);
    try {
      insertDoctestBlocks(dbPath, fileId, file, run);
    } catch (err) {
      deleteDoctestFile(dbPath, fileId);
      throw err;
    }
  }
}

function refreshDoctestRunTotals(run, begin) {
  run.duration_ms = Date.now() - begin;
  run.total_blocks = run.files.reduce((n, file) => n + file.total_blocks, 0);
  run.passed_blocks = run.files.reduce((n, file) => n + file.passed_blocks, 0);
  run.failed_blocks = run.files.reduce((n, file) => n + file.failed_blocks, 0);
  run.skipped_blocks = run.files.reduce((n, file) => n + file.skipped_blocks, 0);
}

function insertDoctestRun(dbPath, run) {
  const rows = [
    "PRAGMA foreign_keys=ON;",
    "BEGIN IMMEDIATE;",
    `INSERT INTO runs (
      started_at, finished_at, git_commit, sagelite_source_commit,
      sagelite_package_commit, command,
      run_profile, runner_version, resource_root, source_root, tmp_dir_root,
      invocation_cwd,
      status, total_blocks, passed_blocks, failed_blocks, skipped_blocks, duration_ms
    ) VALUES (
      ${sqlString(run.started_at)}, ${sqlString(run.finished_at)},
      ${sqlString(run.git_commit)}, ${sqlString(run.sagelite_source_commit)},
      ${sqlString(run.sagelite_package_commit)}, ${sqlString(run.command)},
      ${sqlString(run.run_profile)},
      ${sqlNumber(run.runner_version)}, ${sqlString(run.resource_root)},
      ${sqlString(run.source_root)}, ${sqlString(run.tmp_dir_root)},
      ${sqlString(run.invocation_cwd)},
      ${sqlString(run.status)},
      ${sqlNumber(run.total_blocks)}, ${sqlNumber(run.passed_blocks)},
      ${sqlNumber(run.failed_blocks)}, ${sqlNumber(run.skipped_blocks)},
      ${sqlNumber(run.duration_ms)}
    );`,
    "SELECT last_insert_rowid();",
    "COMMIT;",
  ];
  const rawRunId = sqliteExec(dbPath, rows.join("\n")).trim();
  if (!/^\d+$/.test(rawRunId)) {
    throw new Error(`could not determine doctest run id from sqlite output: ${rawRunId}`);
  }
  return Number(rawRunId);
}

function updateDoctestRun(dbPath, runId, run) {
  sqliteExec(
    dbPath,
    `PRAGMA foreign_keys=ON;
    BEGIN IMMEDIATE;
    UPDATE runs SET
      finished_at = ${sqlString(run.finished_at)},
      status = ${sqlString(run.status)},
      total_blocks = ${sqlNumber(run.total_blocks)},
      passed_blocks = ${sqlNumber(run.passed_blocks)},
      failed_blocks = ${sqlNumber(run.failed_blocks)},
      skipped_blocks = ${sqlNumber(run.skipped_blocks)},
      duration_ms = ${sqlNumber(run.duration_ms)}
    WHERE id = ${sqlNumber(runId)};
    COMMIT;`,
  );
}

function insertDoctestFile(dbPath, runId, file) {
  const rows = [
    "PRAGMA foreign_keys=ON;",
    "BEGIN IMMEDIATE;",
    `INSERT INTO files (
      run_id, path, status, total_blocks, passed_blocks, failed_blocks,
      skipped_blocks, duration_ms, stdout, stderr, failure_class, failure_detail
    ) VALUES (
      ${sqlNumber(runId)},
      ${sqlString(file.path)}, ${sqlString(file.status)},
      ${sqlNumber(file.total_blocks)}, ${sqlNumber(file.passed_blocks)},
      ${sqlNumber(file.failed_blocks)}, ${sqlNumber(file.skipped_blocks)},
      ${sqlNumber(file.duration_ms)}, ${sqlString(file.stdout)}, ${sqlString(file.stderr)},
      ${sqlString(file.failure_class)}, ${sqlString(file.failure_detail)}
    );`,
    "SELECT last_insert_rowid();",
    "COMMIT;",
  ];
  const rawFileId = sqliteExec(dbPath, rows.join("\n")).trim();
  if (!/^\d+$/.test(rawFileId)) {
    throw new Error(`could not determine doctest file id from sqlite output: ${rawFileId}`);
  }
  return Number(rawFileId);
}

function insertDoctestBlocks(dbPath, fileId, file, run) {
  const blocks = file.blocks || [];
  const chunkSize = 250;
  for (let offset = 0; offset < blocks.length; offset += chunkSize) {
    const rows = ["PRAGMA foreign_keys=ON;", "BEGIN IMMEDIATE;"];
    for (const block of blocks.slice(offset, offset + chunkSize)) {
      rows.push(`INSERT INTO blocks (
        file_id, block_index, block_key, name, start_line, end_line, source,
        source_hash, expected, expected_kind, actual, status, failure_class,
        failure_detail, tags, skip_reason, duration_ms
      ) VALUES (
        ${sqlNumber(fileId)},
        ${sqlNumber(block.block_index)}, ${sqlString(blockKeyFor(file, block, run))},
        ${sqlString(block.name)},
        ${sqlNumber(block.start_line)}, ${sqlNumber(block.end_line)},
        ${sqlString(block.source)}, ${sqlString(block.source_hash)},
        ${sqlString(block.expected)}, ${sqlString(block.expected_kind)},
        ${sqlString(block.actual)}, ${sqlString(block.status)},
        ${sqlString(block.failure_class)}, ${sqlString(block.failure_detail)},
        ${sqlString(block.tags)},
        ${sqlString(block.skip_reason)}, ${sqlNumber(block.duration_ms)}
      );`);
    }
    rows.push("COMMIT;");
    sqliteExec(dbPath, rows.join("\n"));
  }
}

function deleteDoctestFile(dbPath, fileId) {
  sqliteExec(
    dbPath,
    `PRAGMA foreign_keys=ON;\nDELETE FROM files WHERE id = ${sqlNumber(fileId)};`,
  );
}

function deleteDoctestRun(dbPath, runId) {
  sqliteExec(
    dbPath,
    `PRAGMA foreign_keys=ON;\nDELETE FROM runs WHERE id = ${sqlNumber(runId)};`,
  );
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
