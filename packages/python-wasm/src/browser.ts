import { asyncKernel, FileSystemSpec } from "@cowasm/kernel";
import { Options, PythonWasmAsync } from "./common";
export type { Options, PythonWasmAsync };

import { fetchPackages } from "./packages";
import debug from "debug";
const log = debug("python-wasm");

import wasmUrl from "./python.wasm";
import pythonFull from "./python-stdlib.zip";
import pythonMinimal from "./python-minimal.zip";
import pythonReadline from "./python-readline.zip";
const PYTHONEXECUTABLE = "/usr/lib/python.wasm";

// We ONLY provide async version, since sync version isn't
// possible anymore since dynamic module loading has to be
// sync and browsers don't allow sync webassmbly loading.
export default async function asyncPython(
  opts?: Options
): Promise<PythonWasmAsync> {
  log("creating async CoWasm kernel...");
  const fs = getFilesystem(opts);
  log("fs = ", fs);
  const kernel = await asyncKernel({
    env: {
      PYTHONHOME: "/usr",
      PYTHONEXECUTABLE,
      ...opts?.env,
    },
    fs,
  });
  log("done");
  log("fetching ", PYTHONEXECUTABLE);
  await Promise.all([
    kernel.waitUntilFsLoaded(),

    kernel.fetch(wasmUrl, PYTHONEXECUTABLE),

    // TODO: we have to await since once Python starts it synchronously takes over
    // completely and rest of the fetches just can't finish.  Longterm we'll use
    // a completely different model for packages, of course.
    fetchPackages(kernel),
  ]);

  log("initializing python");
  const python = new PythonWasmAsync(kernel, PYTHONEXECUTABLE);
  await python.init();

  log("done");
  return python;
}

function getFilesystem(opts?: Options): FileSystemSpec[] {
  // For ref, this is the not efficient version
  //   return [
  //     {
  //       type: "zipurl",
  //       zipurl: pythonFull,
  //       mountpoint: "/usr/lib/python3.11",
  //     },
  //     { type: "dev" },
  //   ];

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
