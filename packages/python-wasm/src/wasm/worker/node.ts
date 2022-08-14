/*
Initialize our WASM setup.

This can be run as a Worker script when importing the wasm module in node.js
in the mode where we use a Worker.
*/

import { readFile } from "fs/promises";
import { createFileSystem } from "@wapython/wasi";
import type { FileSystemSpec } from "@wapython/wasi";
import bindings from "@wapython/wasi/dist/bindings/node";
import { dirname, isAbsolute, join } from "path";
import callsite from "callsite";
import wasmImport, { Options } from "./import";
import type { WasmInstance } from "../types";
import { isMainThread, parentPort } from "worker_threads";
import initWorker from "./init";
import debug from "../../debug";
import os from "os";
import child_process from "child_process";
import posixZig from "posix-zig";

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
  const fsSpec: FileSystemSpec[] = [];
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
        fsSpec.push(Y);
      } catch (err) {
        // non-fatal
        // We *might* use this eventually when building the datafile itself, if we switch to using cpython wasm to build
        // instead of native cpython.
        console.warn(
          `WARNING: Unable to read filesystem datafile '${X.zipfile}' -- falling back to filesystem.`
        );
      }
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

  let posix;
  try {
    posix = require("posix");
  } catch (_err) {
    posix = {};
  }
  console.log(posixZig);
  for (const f in posixZig) {
    posix[f] = posixZig[f];
  }

  return await wasmImport({
    source: name,
    bindings: { ...bindings, fs, os, child_process, posix },
    options,
    log: log ?? debug("wasm-node"),
    importWebAssembly,
    importWebAssemblySync,
    readFileSync: fs.readFileSync,
  });
}

if (!isMainThread && parentPort != null) {
  // Running as a worker thread.
  initWorker({
    wasmImport: wasmImportNode,
    parent: parentPort,
    log: debug("wasm-node"),
  });
}
