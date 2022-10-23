import { syncKernel, asyncKernel, FileSystemSpec } from "@cowasm/kernel";
import { join } from "path";
import { existsSync } from "fs";
import debug from "debug";

const log = debug("python-wasm");

import { Options, PythonWasmSync, PythonWasmAsync } from "./common";

const python_wasm = join(__dirname, "python.wasm");
const pythonFull = join(__dirname, "python-stdlib.zip");
const pythonReadline = join(__dirname, "python-readline.zip");
const pythonMinimal = join(__dirname, "python-minimal.zip");

// For now this is the best we can do.  TODO: cleanest solution in general would be to also include the
// python3.wasm binary (which has main) from the cpython package, to support running python from python.
// The following will only work in the build-from-source dev environment.
const PYTHONEXECUTABLE = join(__dirname, "../../cpython/bin/python-wasm");

// Running in main thread

export async function syncPython(opts?: Options): Promise<PythonWasmSync> {
  log("creating sync CoWasm kernel...");
  const fs = getFilesystem(opts);
  const env: any = { PYTHONEXECUTABLE };
  if (fs[0].type == "zipfile") {
    env.PYTHONHOME = "/usr";
  }
  const kernel = await syncKernel({ env, fs });
  log("done");
  log("initializing python");
  const python = new PythonWasmSync(kernel, python_wasm);
  python.init();
  log("done");
  return python;
}

export async function asyncPython(opts?: Options): Promise<PythonWasmAsync> {
  log("creating async CoWasm kernel...");
  const fs = getFilesystem(opts);
  const env: any = { PYTHONEXECUTABLE };
  if (fs[0].type == "zipfile") {
    env.PYTHONHOME = "/usr";
  }
  const kernel = await asyncKernel({ env, fs });
  log("done");
  log("initializing python");
  const python = new PythonWasmAsync(kernel, python_wasm);
  await python.init();
  log("done");
  return python;
}

// also make this the default export for consistency with browser api.
export default asyncPython;

function getFilesystem(opts?: Options): FileSystemSpec[] {
  if (opts?.fs == "bundle" || !existsSync(PYTHONEXECUTABLE)) {
    // explicitly requested or not dev environment.
    return [
      // This will result in synchronously loading a tiny filesystem needed for starting python interpreter.
      {
        type: "zipfile",
        zipfile: opts?.noReadline ? pythonMinimal : pythonReadline,
        mountpoint: "/usr/lib/python3.11",
      },
      // Load full stdlib python filesystem asynchronously.  Only needed to run actual interesting code.
      // This way can load the wasm file from disk at the same time as the stdlib.
      {
        type: "zipfile",
        async: true,
        zipfile: pythonFull,
        mountpoint: "/usr/lib/python3.11",
      },
      // And the rest of the native filesystem.   Sandboxing is not at all our goal here.
      { type: "native" },
    ];
  } else {
    return [{ type: "native" }];
  }
}
