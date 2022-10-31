/*
dash-wasm [--worker] ...
*/

import { asyncDash, syncDash } from "./node";
import { supportsPosix } from "@cowasm/kernel";
import { Options } from "./common";

async function main() {
  const { worker } = processArgs(process.argv);
  if (process.platform == "win32") {
    console.log("Press enter a few times.");
  }
  const options: Options = { interactive: true }; // todo -- what if not interactive (?)
  const Dash = worker ? asyncDash : syncDash;
  const dash = await Dash(options);
  const argv = process.argv.slice(1);
  let r = 0;
  try {
    // TODO: in async mode the worker thread itself just gets killed... See note about python in python-wasm/src/node-terminal.ts
    r = await dash.terminal(argv);
  } catch (_err) {}
  if (argv.includes("-h")) {
    console.log(`${process.argv[1]} [--worker] ...`);
    console.log(
      "--worker : use a worker thread, instead of single threaded version (NOTE: exit code is always 0)"
    );
  }
  process.exit(r);
}

function processArgs(argv: string[]): { worker: boolean } {
  const j = argv.indexOf("--worker");
  if (j != -1) {
    argv.splice(j, 1);
  }
  let worker = false;
  if (!supportsPosix()) {
    worker = true;
  } else {
    worker = j != -1;
  }
  return { worker };
}

main();
