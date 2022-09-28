import wasmImport from '../wasm/import-node.js';
import wasmImportNoWorker from '../wasm/worker/node.js';
import { _init, repr, exec, wasm, terminal as _terminal } from './index.js';
import type { FileSystemSpec } from "wasi-js";
import { dirname, join } from "path";
import { fileURLToPath } from 'url';

const PYTHON_WASM = "python.wasm";
const pythonFull = "python-stdlib.zip";
const pythonReadline = "python-readline.zip";
const pythonMinimal = "python-minimal.zip";

// Our tiny termcap file only has one entry, which is for xterm
// so that's all we give you, even if you have a different terminal.
const TERM = "xterm-256color";

export async function init({
  noWorker,
  noZip,
  noReadline,
  debug,
}: {
  noWorker?: boolean;
  noZip?: boolean;
  noReadline?: boolean;
  debug?: boolean;
} = {}) {
  if (debug) {
    noWorker = noZip = true;
  }
  const path = dirname(fileURLToPath(import.meta.url));
  const fs: FileSystemSpec[] = [];
  if (!noZip) {
    // Synchronously load tiny filesystem needed for starting python interpreter.
    fs.push({
      type: "zipfile",
      zipfile: join(path, noReadline ? pythonMinimal : pythonReadline),
      mountpoint: "/usr/lib/python3.11",
    });
    // Load full stdlib python filesystem asynchronously.  Only needed to run actual interesting code.
    // This way can load the wasm file from disk at the same time as the stdlib.
    fs.push({
      type: "zipfile",
      async: true,
      zipfile: join(path, pythonFull),
      mountpoint: "/usr/lib/python3.11",
    });
  }
  if (process.platform == "linux" && noZip) {
    // noZip = use the real filesystem.
    // include dev (except in debug mode) -- it is necessary for python to start when using
    // nodejs windows, but doesn't hurt on linux/macos... except - TODO - it forces
    // **use of unionfs and that leads to fs.existsSync hangs in unistd.ts during builds.**
    // Hence we disable in debug mode.  For example, this happens badly when doing "make test"
    // for the py-cython module on Linux only.  On Macos it's the other way around; this breaks
    // if we don't include dev.
  } else {
    fs.push({ type: "dev" });
  }
  // native: provides stdout,stderr natively, for now; and also the rest of the user's filesystem
  fs.push({ type: "native" });

  let env;
  if (!noZip) {
    env = {
      ...process.env,
      PYTHONHOME: process.env.PYTHONHOME ?? "/usr",
      TERM,
      TERMCAP: "/usr/lib/python3.11/termcap",
    };
  } else {
    env = {
      ...process.env,
      TERM,
      TERMCAP: join(path, "termcap"),
    };
  }

  await _init({
    programName: process.env.PROGRAM_NAME ?? "/usr/bin/zython", // real name or made up name
    python_wasm: join(path, PYTHON_WASM),
    wasmImport: noWorker ? wasmImportNoWorker : wasmImport,
    fs,
    env,
  });
}

async function terminal(
  argv = [process.env.PROGRAM_NAME ?? "/usr/bin/zython"]
): Promise<number> {
  await init();
  return await _terminal(argv);
}

export { repr, exec, wasm, terminal };
