import { syncKernel, asyncKernel, FileSystemSpec } from "@cowasm/kernel";
import { Options, PythonWasmSync, PythonWasmAsync } from "./common";
import debug from "debug";
const log = debug("python-wasm");

import wasmUrl from "./python.wasm";
import pythonFull from "./python-stdlib.zip";
import pythonMinimal from "./python-minimal.zip";
import pythonReadline from "./python-readline.zip";
const PYTHONEXECUTABLE = "/usr/lib/python.wasm";

// Running in main thread

export async function syncPython(opts?: Options): Promise<PythonWasmSync> {
  log("syncPython");
  // we create the kernel *and* fetch python.wasm in parallel.
  const kernel = await syncKernel({
    env: { PYTHONHOME: "/usr", PYTHONEXECUTABLE },
    fs: getFilesystem(opts),
  });
  log("done");
  await kernel.waitUntilFsLoaded();
  log("fetching ", PYTHONEXECUTABLE);
  await kernel.fetch(wasmUrl, PYTHONEXECUTABLE);
  log("initializing python");
  const python = new PythonWasmSync(kernel, PYTHONEXECUTABLE);
  python.init();
  log("done");
  return python;
}

export async function asyncPython(opts?: Options): Promise<PythonWasmAsync> {
  log("creating async CoWasm kernel...");
  const kernel = await asyncKernel({
    env: { PYTHONHOME: "/usr", PYTHONEXECUTABLE },
    fs: getFilesystem(opts),
  });
  log("done");
  await kernel.waitUntilFsLoaded();
  log("fetching ", PYTHONEXECUTABLE);
  await kernel.fetch(wasmUrl, PYTHONEXECUTABLE);
  log("initializing python");
  const python = new PythonWasmAsync(kernel, PYTHONEXECUTABLE);
  await python.init();
  log("done");
  return python;
}

function getFilesystem(opts?: Options): FileSystemSpec[] {
  return [
    // This will result in synchronously loading a tiny filesystem needed for starting python interpreter.
    {
      type: "zipurl",
      zipurl: opts?.noReadline ? pythonMinimal : pythonReadline,
      mountpoint: "/usr/lib/python3.11",
    },
    { type: "dev" },
    // Load full stdlib python filesystem asynchronously.  Only needed to run actual interesting code.
    // This way can load the wasm file from disk at the same time as the stdlib.
    {
      type: "zipurl",
      async: true,
      zipurl: pythonFull,
      mountpoint: "/usr/lib/python3.11",
    },
  ];
}
