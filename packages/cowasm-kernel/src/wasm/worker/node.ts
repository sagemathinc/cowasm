/*
Initialize our WASM setup.

This can be run as a Worker script when importing the wasm module in node.js
in the mode where we use a Worker.
*/

import { readFile } from "fs/promises";
import { createFileSystem } from "wasi-js";
import type { FileSystemSpec } from "wasi-js";
import bindings from "wasi-js/dist/bindings/node";
import { dirname, isAbsolute, join } from "path";
import wasmImport, { Options } from "./import";
import type { WasmInstance } from "../types";
import { isMainThread, parentPort } from "worker_threads";
import initWorker from "./init";
import debug from "debug";
import os from "os";
import child_process from "child_process";
import posix from "posix-node";
import IOHandler from "./io-using-atomics";

const log = debug("wasm:worker");

export default async function wasmImportNode(
  name: string,
  options: Options
): Promise<WasmInstance> {
  log("wasmImportNode");
  const path = dirname(join(__filename, "..", ".."));
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

  if (options.sleep == null && posix.sleep != null && posix.usleep != null) {
    // don't have sleep support (since single thread), and we can provide
    // that via posix and not burn 100% cpu.
    const { sleep, usleep } = posix;
    options.sleep = (milliseconds) => {
      const seconds = Math.floor(milliseconds / 1000);
      if (seconds > 0) {
        sleep(seconds);
      }
      const microseconds = Math.floor(
        1000000 * (milliseconds / 1000 - seconds)
      );
      if (microseconds > 0) {
        usleep(microseconds);
      }
    };
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
  // We enable nonblocking stdin if at all possible
  // so that when wasi
  // does fs.readSync(stdin, ...) it blocks and waits
  // for an input character, rather than immediately
  // giving an error or 0 characters, except when one
  // is ready. This is much better than a loop with
  // 100% cpu usage!
  // NOTE
  // - right now enableRawInput is only available on
  //   some platforms, e.g., not on windows.
  try {
    // node script [extra args]
    // node has a really simple model for whether or not
    // input is interactive
    if (process.argv.length > 2) {
      // input is NOT interactive shell; in this case we only
      // set stdin nonblocking; this keeps buffering
      posix.makeStdinNonblocking?.();
    } else {
      // input is interactive shell; we also disable buffering
      posix.enableRawInput?.();
    }
  } catch (_err) {}
}
