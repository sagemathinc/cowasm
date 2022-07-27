/*
This is the Worker script when importing the wasm module in node.js.
*/

import { readFile } from "fs/promises";
import type { FileSystemSpec } from "@wapython/wasi";
import bindings from "@wapython/wasi/dist/bindings/node";
import { dirname, isAbsolute, join } from "path";
import callsite from "callsite";
import wasmImport, { Options } from "./import";
import type WasmInstance from "./instance";
import { isMainThread, parentPort } from "worker_threads";
import initWorker from "./init";
import debug from "../../debug";

async function wasmImportNode(
  name: string,
  options: Options = {},
  log: (...args) => void
): Promise<WasmInstance> {
  const path = dirname(join(callsite()[1]?.getFileName() ?? "", "..", ".."));
  if (!isAbsolute(name)) {
    // it's critical to make this canonical BEFORE calling the debounced function,
    // or randomly otherwise end up with same module imported twice, which will
    // result in a "hellish nightmare" of subtle bugs.
    name = join(path, name);
  }
  // also fix zip path, if necessary and read in any zip files (so they can be loaded into memfs).
  const fs: FileSystemSpec[] = [];
  for (const X of options.fs ?? []) {
    if (X.type == "zipfile") {
      if (!isAbsolute(X.zipfile)) {
        X.zipfile = join(path, X.zipfile);
      }
      try {
        const Y = {
          type: "zip",
          data: await readFile(X.zipfile),
          mountpoint: X.mountpoint,
        } as FileSystemSpec;
        fs.push(Y);
      } catch (err) {
        // non-fatal
        // We *might* use this eventually when building the datafile itself, if we switch to using cpython wasm to build
        // instead of native cpython.
        console.warn(`WARNING: Unable to read filesystem datafile '${X.zipfile}' -- falling back to filesystem.`);
      }
    } else {
      fs.push(X);
    }
  }
  const source = await readFile(name);
  return await wasmImport(name, source, bindings, { ...options, fs }, log);
}

if (isMainThread || parentPort == null) {
  throw Error("bug -- this should only be loaded in the worker thread");
}

const log = debug("worker:node");
initWorker({ wasmImport: wasmImportNode, parent: parentPort, log });
