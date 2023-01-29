import { syncKernel, asyncKernel, FileSystemSpec } from "@cowasm/kernel";
import { join } from "path";
import { existsSync } from "fs";
import debug from "debug";

const log = debug("python-wasm");

import { Options, PythonWasmSync, PythonWasmAsync } from "./common";

export type { Options, PythonWasmSync, PythonWasmAsync };

// This is used for build testing (all packages have a path).
export const path = __dirname;

const python_wasm = join(__dirname, "python.wasm");
const pythonEverything = join(__dirname, "python-everything.zip");
const pythonStdlib = join(__dirname, "python-stdlib.zip");
const pythonReadline = join(__dirname, "python-readline.zip");
const pythonMinimal = join(__dirname, "python-minimal.zip");

// For now this is the best we can do.  TODO: cleanest solution in general would be to also include the
// python3.wasm binary (which has main) from the cpython package, to support running python from python.
// The following will only work in the build-from-source dev environment.
const PYTHONEXECUTABLE = join(__dirname, "../../cpython/bin/python-wasm");

export async function syncPython(
  opts: Options = { fs: "everything" }
): Promise<PythonWasmSync> {
  return (await createPython(true, opts)) as PythonWasmSync;
}

export async function asyncPython(
  opts: Options = { fs: "everything" }
): Promise<PythonWasmAsync> {
  return (await createPython(false, opts)) as PythonWasmAsync;
}

// also make this the default export for consistency with browser api.
export default asyncPython;

async function createPython(
  sync: boolean,
  opts: Options
): Promise<PythonWasmSync | PythonWasmAsync> {
  opts = { fs: "everything", ...opts }; // default fs is everything
  log("creating Python; sync = ", sync, ", opts = ", opts);
  const fs = getFilesystem(opts);
  let env: any = { PYTHONEXECUTABLE };
  let wasm = python_wasm;
  if (opts?.fs == "everything") {
    wasm = "/usr/lib/python3.11/python.wasm";
  }
  if (opts?.fs == "everything") {
    env.PYTHONHOME = "/usr";
  }
  if (opts?.env != null) {
    env = { ...env, ...opts.env };
  }
  const kernel = sync
    ? await syncKernel({ env, fs })
    : await asyncKernel({
        env,
        fs,
        interactive: opts?.interactive,
        noStdio: opts?.noStdio,
      });
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
  if (opts?.fs == "everything") {
    return [
      {
        type: "zipfile",
        zipfile: pythonEverything,
        mountpoint: "/usr/lib/python3.11",
      },
      { type: "native" },
    ];
  }
  if (opts?.fs == "stdlib") {
    return [
      {
        type: "zipfile",
        zipfile: pythonStdlib,
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
        zipfile: pythonStdlib,
        mountpoint: "/usr/lib/python3.11",
      },
      // And the rest of the native filesystem.   **Sandboxing is not at all our goal here yet.**
      { type: "native" },
    ];
  } else {
    // native
    return [{ type: "native" }];
  }
}
