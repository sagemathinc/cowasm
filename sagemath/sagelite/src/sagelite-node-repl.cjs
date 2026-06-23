#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");

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
        await new Promise((resolve) => setImmediate(resolve));
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
