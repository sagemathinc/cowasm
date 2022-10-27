/*
python-wasm [--no-bundle] [--no-worker] ...
*/

import { resolve } from "path";
import { asyncPython, syncPython } from "./node";
import { Options } from "./common";

async function main() {
  const PYTHONEXECUTABLE = resolve(process.argv[2]);
  const { noBundle, noWorker } = processArgs(process.argv);
  const options: Options = { env: { PYTHONEXECUTABLE }, interactive: true };
  if (!noBundle) {
    options.fs = "everything";
  }
  const Python = noWorker ? syncPython : asyncPython;
  const python = await Python(options);
  const argv = [PYTHONEXECUTABLE].concat(process.argv.slice(3));
  const r = await python.terminal(argv);
  if (argv.includes("-h")) {
    console.log("\npython-wasm [--no-worker] [--no-bundle] ...");
    console.log(
      "--no-worker : use single threaded version, instead of a worker thread"
    );
    console.log(
      "--no-bundle : do not use the python library bundle archive (only for development)"
    );
  }
  process.exit(r);
}

function processArgs(argv: string[]): { noBundle: boolean; noWorker: boolean } {
  const i = argv.indexOf("--no-bundle");
  const noBundle = i != -1;
  if (noBundle) {
    argv.splice(i, 1);
  }
  const j = argv.indexOf("--no-worker");
  const noWorker = j != -1;
  if (noWorker) {
    argv.splice(j, 1);
  }
  return { noBundle, noWorker };
}

main();
