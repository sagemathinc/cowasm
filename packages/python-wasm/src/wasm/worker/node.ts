/*
Initialize our WASM setup.

This can be run as a Worker script when importing the wasm module in node.js
in the mode where we use a Worker.
*/

import { readFile } from "fs/promises";
import { readFileSync } from "fs";
import type { FileSystemSpec } from "@wapython/wasi";
import bindings from "@wapython/wasi/dist/bindings/node";
import { dirname, isAbsolute, join } from "path";
import callsite from "callsite";
import wasmImport, { Options } from "./import";
import type { WasmInstance } from "../types";
import { isMainThread, parentPort } from "worker_threads";
import initWorker from "./init";
import debug from "../../debug";

export default async function wasmImportNode(
  name: string,
  options: Options,
  log?: (...args) => void
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
        console.warn(
          `WARNING: Unable to read filesystem datafile '${X.zipfile}' -- falling back to filesystem.`
        );
      }
    } else {
      fs.push(X);
    }
  }

  return await wasmImport({
    source: name,
    bindings,
    options: { ...options, fs },
    log: log ?? debug("wasm-node"),
    importWebAssembly,
    importWebAssemblySync,
  });
}

function importWebAssemblySync(path: string, opts: WebAssembly.Imports) {
  const binary = new Uint8Array(readFileSync(path));
  const mod = new WebAssembly.Module(binary);
  return new WebAssembly.Instance(mod, opts);
}

async function importWebAssembly(path: string, opts: WebAssembly.Imports) {
  const binary = new Uint8Array(await readFile(path));
  const mod = new WebAssembly.Module(binary);
  return new WebAssembly.Instance(mod, opts);
}

if (!isMainThread && parentPort != null) {
  // Running as a worker thread.
  initWorker({
    wasmImport: wasmImportNode,
    parent: parentPort,
    log: debug("wasm-node"),
  });
}
