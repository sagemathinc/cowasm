/*
python-wasm [--no-bundle] [--worker] ...
*/

import { resolve } from "path";
import { asyncPython, syncPython } from "./node";
import { Options } from "./common";

async function main() {
  const PYTHONEXECUTABLE = resolve(process.argv[2]);
  const { noBundle, worker } = processArgs(process.argv);
  const options: Options = { env: { PYTHONEXECUTABLE }, interactive: true };
  if (!noBundle) {
    options.fs = "everything";
  }
  const Python = worker ? asyncPython : syncPython;
  const python = await Python(options);
  const argv = [PYTHONEXECUTABLE].concat(process.argv.slice(3));
  let r = 0;
  try {
    // in async mode the worker thread itself just gets killed, e.g., when python runs
    // import sys; sys.exit(1) and that triggers "this.worker?.on("exit", () => {" in
    // packages/kernel/src/wasm/import.ts.  We don't get back an exit code, and I don't
    // yet know how to get it. This is another drawback of using a worker thread with node.
    r = await python.terminal(argv);
  } catch (_err) {}
  if (argv.includes("-h")) {
    console.log("\npython-wasm [--worker] [--no-bundle] ...");
    console.log(
      "--worker : use a worker thread, instead of single threaded version (NOTE: exit code is always 0)"
    );
    console.log(
      "--no-bundle : do not use the python bundle archive (only for development)"
    );
  }
  process.exit(r);
}

function processArgs(argv: string[]): { noBundle: boolean; worker: boolean } {
  const i = argv.indexOf("--no-bundle");
  const noBundle = i != -1;
  if (noBundle) {
    argv.splice(i, 1);
  }
  const j = argv.indexOf("--worker");
  const worker = j != -1;
  if (worker) {
    argv.splice(j, 1);
  }
  return { noBundle, worker };
}

main();
