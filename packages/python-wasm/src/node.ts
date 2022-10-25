import { syncKernel, asyncKernel, FileSystemSpec } from "@cowasm/kernel";
import { join } from "path";
import { existsSync } from "fs";
import debug from "debug";

const log = debug("python-wasm");

import { Options, PythonWasmSync, PythonWasmAsync } from "./common";

const python_wasm = join(__dirname, "python.wasm");
const pythonSandbox = join(__dirname, "python-sandbox.zip");
const pythonFull = join(__dirname, "python-stdlib.zip");
const pythonReadline = join(__dirname, "python-readline.zip");
const pythonMinimal = join(__dirname, "python-minimal.zip");

// For now this is the best we can do.  TODO: cleanest solution in general would be to also include the
// python3.wasm binary (which has main) from the cpython package, to support running python from python.
// The following will only work in the build-from-source dev environment.
const PYTHONEXECUTABLE = join(__dirname, "../../cpython/bin/python-wasm");

export async function syncPython(opts?: Options): Promise<PythonWasmSync> {
  return (await createPython(true, opts)) as PythonWasmSync;
}

export async function asyncPython(opts?: Options): Promise<PythonWasmAsync> {
  return (await createPython(false, opts)) as PythonWasmAsync;
}

// also make this the default export for consistency with browser api.
export default asyncPython;

async function createPython(
  sync: boolean,
  opts?: Options
): Promise<PythonWasmSync | PythonWasmAsync> {
  log("creating Python with sync = ", sync, ", opts = ", opts);
  const fs = getFilesystem(opts);
  let env: any = { PYTHONEXECUTABLE };
  let wasm = python_wasm;
  if (opts?.fs == "sandbox") {
    wasm = "/usr/lib/python3.11/python.wasm";
  }
  if (fs[0].type == "zipfile") {
    env.PYTHONHOME = "/usr";
  }
  if (opts?.env != null) {
    env = { ...env, ...opts.env };
  }
  const kernel = sync
    ? await syncKernel({ env, fs })
    : await asyncKernel({ env, fs });
  log("done");
  log("initializing python");
  const python = sync
    ? new PythonWasmSync(kernel as any, wasm)
    : new PythonWasmAsync(kernel as any, wasm);
  await python.init();
  log("done");
  return python;
}

function getFilesystem(opts?: Options): FileSystemSpec[] {
  if (opts?.fs == "sandbox") {
    return [
      {
        type: "zipfile",
        zipfile: pythonSandbox,
        mountpoint: "/usr/lib/python3.11",
      },
      { type: "native" },
    ];
  }
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
