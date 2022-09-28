/*
Initialize our WASM setup.

This can be run as a Worker script when importing the wasm module in node.js
in the mode where we use a Worker.
*/

import { readFile } from "fs/promises";
import { createFileSystem } from "wasi-js";
import type { FileSystemSpec } from "wasi-js";
import bindings from "wasi-js/bindings/server";
import { dirname, isAbsolute, join } from "path";
import { fileURLToPath } from "url";
import wasmImport, { Options } from './import.js';
import type { WasmInstance } from '../types.js';
import { isMainThread, parentPort } from "worker_threads";
import initWorker from './init.js';
import debug from "debug";
import os from "os";
import child_process from "child_process";
import posix from "posix-node";
import IOHandler from './io-using-atomics.js';

const log = debug("wasm:worker");

export default async function wasmImportNode(
  name: string,
  options: Options
): Promise<WasmInstance> {
  log("wasmImportNode");
  const path = dirname(join(fileURLToPath(import.meta.url), "..", ".."));
  if (!isAbsolute(name)) {
    // it's critical to make this canonical BEFORE calling the debounced function,
    // or randomly otherwise end up with same module imported twice, which will
    // result in a "hellish nightmare" of subtle bugs.
    name = join(path, name);
  }
  // also fix zip path, if necessary and read in any zip files (so they can be loaded into memfs).
  const fsSpec: FileSystemSpec[] = [];
  for (const X of options.fs ?? []) {
    if (X.type == "zipfile") {
      if (!isAbsolute(X.zipfile)) {
        X.zipfile = join(path, X.zipfile);
      }
      let Y;
      if (X.async) {
        Y = {
          type: "zip-async",
          getData: async () => await readFile(X.zipfile),
          mountpoint: X.mountpoint,
        } as FileSystemSpec;
      } else {
        try {
          Y = {
            type: "zip",
            data: await readFile(X.zipfile),
            mountpoint: X.mountpoint,
          } as FileSystemSpec;
        } catch (err) {
          // non-fatal
          // We *might* use this eventually when building the datafile itself, if we switch to using cpython wasm to build
          // instead of native cpython.
          console.warn(
            `WARNING: Unable to read filesystem datafile '${X.zipfile}' -- falling back to filesystem.`
          );
        }
      }
      fsSpec.push(Y);
    } else {
      fsSpec.push(X);
    }
  }

  const fs = createFileSystem(fsSpec, bindings.fs);

  function importWebAssemblySync(path: string, opts: WebAssembly.Imports) {
    const binary = new Uint8Array(fs.readFileSync(path));
    const mod = new WebAssembly.Module(binary);
    return new WebAssembly.Instance(mod, opts);
  }

  async function importWebAssembly(path: string, opts: WebAssembly.Imports) {
    const binary = new Uint8Array(await readFile(path));
    const mod = new WebAssembly.Module(binary);
    return new WebAssembly.Instance(mod, opts);
  }

  return await wasmImport({
    source: name,
    bindings: { ...bindings, fs, os, child_process, posix },
    options,
    importWebAssembly,
    importWebAssemblySync,
    readFileSync: fs.readFileSync,
  });
}

if (!isMainThread && parentPort != null) {
  log("running as a worker thread.");
  initWorker({
    wasmImport: wasmImportNode,
    parent: parentPort,
    IOHandler,
  });
} else {
  log("running in the main thread (for debugging)");
}
