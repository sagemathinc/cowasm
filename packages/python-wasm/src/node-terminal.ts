/*
python-wasm [--dev] [--worker]  ...
*/

import { resolve } from "path";
import { asyncPython, syncPython } from "./node";
import { Options } from "./common";

async function main() {
  const PYTHONEXECUTABLE = resolve(process.argv[2]);
  const { dev, worker } = processArgs(process.argv);
  const options: Options = { env: { PYTHONEXECUTABLE } };
  if (!dev) {
    options.fs = "sandbox";
  }
  const python = await (worker ? asyncPython : syncPython)(options);
  const argv = [PYTHONEXECUTABLE].concat(process.argv.slice(3));
  const r = await python.terminal(argv);
  if (argv.includes("-h")) {
    console.log("\npython-wasm [--dev] [--worker]  ...");
    console.log(
      "--dev      : devel mode, so filesystem is just full native filesystem; otherwise, use files packages in a self-contained archive"
    );
    console.log(
      "--worker   : if true, use a worker thread for WebAssembly with SharedArrayBuffer and atomics; otherwise, uses a single thread"
    );
  }
  process.exit(r);
}

function processArgs(argv: string[]): { dev: boolean; worker: boolean } {
  const i = argv.indexOf("--dev");
  const dev = i != -1;
  if (dev) {
    argv.splice(i, 1);
  }
  const j = argv.indexOf("--worker");
  const worker = j != -1;
  if (worker) {
    argv.splice(j, 1);
  }
  return { dev, worker };
}

main();
