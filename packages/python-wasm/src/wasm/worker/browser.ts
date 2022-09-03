/*
This is the Worker script when importing the wasm module in a web browser.
*/

import { createFileSystem } from "@wapython/wasi";
import type { FileSystemSpec } from "@wapython/wasi";
import bindings from "@wapython/wasi/dist/bindings/browser";
import type WasmInstance from "./instance";
import wasmImport, { Options } from "./import";
import initWorker from "./init";
import debug from "debug";
import { EventEmitter } from "events";
import posix from "./posix-browser";

const log = debug("wasm:worker");

export default async function wasmImportBrowser(
  wasmUrl: string,
  options: Options = {}
): Promise<WasmInstance> {
  log("wasmImportBrowser");
  // also fix zip path, if necessary and read in any zip files (so
  // they can be loaded into memfs).
  const fsSpec: FileSystemSpec[] = [];
  for (const X of options.fs ?? []) {
    if (X.type == "zipurl") {
      let Y;
      if (!X.async) {
        Y = {
          type: "zip",
          data: await (await fetch(X.zipurl)).arrayBuffer(),
          mountpoint: X.mountpoint,
        } as FileSystemSpec;
      } else {
        // we asynchronously load it irregardless of whatever else is happening...
        // TODO:
        Y = {
          type: "zip-async",
          getData: async () => await (await fetch(X.zipurl)).arrayBuffer(),
          mountpoint: X.mountpoint,
        } as FileSystemSpec;
      }
      fsSpec.push(Y);
    } else {
      fsSpec.push(X);
    }
  }

  const fs = createFileSystem(fsSpec);

  // Assumed to be loaded into memfs.
  function importWebAssemblySync(path: string, options: WebAssembly.Imports) {
    const binary = new Uint8Array(fs.readFileSync(path));
    const mod = new WebAssembly.Module(binary);
    return new WebAssembly.Instance(mod, options);
  }

  const wasm = await wasmImport({
    source: wasmUrl,
    bindings: { ...bindings, fs, posix },
    options,
    importWebAssembly,
    importWebAssemblySync,
    readFileSync: (path) => {
      return fs.readFileSync(path);
    },
    maxMemoryMB: 1000,
  });
  return wasm;
}

// Download from our server.
async function importWebAssembly(path: string, options: WebAssembly.Imports) {
  const { instance } = await WebAssembly.instantiateStreaming(
    fetch(path),
    options
  );
  return instance;
}

function main() {
  // in a worker, so do worker stuff
  log("initializing worker");

  class Parent extends EventEmitter {
    public postMessage: (message: any) => void;

    constructor() {
      super();
      this.postMessage = self.postMessage.bind(self);
      self.onmessage = ({ data: message }) => {
        this.emit("message", message);
      };
    }
  }

  const parent = new Parent();

  initWorker({
    wasmImport: wasmImportBrowser,
    parent,
    captureOutput: true,
  });
}

if (self.document == null) {
  main();
}
