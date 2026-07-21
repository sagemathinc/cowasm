import { syncKernel, asyncKernel, FileSystemSpec } from "@cowasm/kernel";
import { join } from "path";
import { existsSync } from "fs";
import { rootCertificates } from "tls";
import debug from "debug";

const log = debug("python-wasm");

import { Options, PythonWasmSync, PythonWasmAsync } from "./common";
import { PYTHON_LIB } from "./constants";

export type { Options, PythonWasmSync, PythonWasmAsync };

// This is used for build testing (all packages have a path).
export const path = __dirname;

const python_wasm = join(__dirname, "python.wasm");
const pythonEverything = join(__dirname, "python-everything.zip");
const pythonStdlib = join(__dirname, "python-stdlib.zip");
const pythonReadline = join(__dirname, "python-readline.zip");
const pythonMinimal = join(__dirname, "python-minimal.zip");
const NODE_ROOT_CERTIFICATES =
  "/usr/share/cowasm/node-root-certificates.pem";

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
  const useNodeRootCertificates =
    process.env.SSL_CERT_FILE == null &&
    opts.env?.SSL_CERT_FILE == null;
  const fs = getFilesystem(opts, useNodeRootCertificates);
  let env: any = { PYTHONEXECUTABLE };
  if (useNodeRootCertificates) {
    env.SSL_CERT_FILE = NODE_ROOT_CERTIFICATES;
  }
  let wasm = python_wasm;
  if (opts?.fs == "everything") {
    wasm = `${PYTHON_LIB}/python.wasm`;
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
  if (!opts.noInit) {
    await python.init();
    log("done");
  }
  return python;
}

function getFilesystem(
  opts: Options | undefined,
  useNodeRootCertificates: boolean
): FileSystemSpec[] {
  const trustStore: FileSystemSpec[] = useNodeRootCertificates
    ? [
        {
          type: "mem",
          contents: {
            [NODE_ROOT_CERTIFICATES]: `${rootCertificates.join("\n")}\n`,
          },
        },
      ]
    : [];
  if (opts?.fs == "everything") {
    return [
      ...trustStore,
      {
        type: "zipfile",
        zipfile: pythonEverything,
        mountpoint: PYTHON_LIB,
      },
      { type: "native" },
    ];
  }
  if (opts?.fs == "stdlib") {
    return [
      ...trustStore,
      {
        type: "zipfile",
        zipfile: pythonStdlib,
        mountpoint: PYTHON_LIB,
      },
      { type: "native" },
    ];
  }
  if (opts?.fs == "bundle" || !existsSync(PYTHONEXECUTABLE)) {
    // explicitly requested or not dev environment.
    return [
      ...trustStore,
      // This will result in synchronously loading a tiny filesystem needed for starting python interpreter.
      {
        type: "zipfile",
        zipfile: opts?.noReadline ? pythonMinimal : pythonReadline,
        mountpoint: PYTHON_LIB,
      },
      // Load full stdlib python filesystem asynchronously.  Only needed to run actual interesting code.
      // This way can load the wasm file from disk at the same time as the stdlib.
      {
        type: "zipfile",
        async: true,
        zipfile: pythonStdlib,
        mountpoint: PYTHON_LIB,
      },
      // And the rest of the native filesystem.   **Sandboxing is not at all our goal here yet.**
      { type: "native" },
    ];
  } else {
    // native
    return [...trustStore, { type: "native" }];
  }
}
