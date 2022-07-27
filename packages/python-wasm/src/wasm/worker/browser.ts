/*
This is the Worker script when importing the wasm module in a web browser.
*/

import type { FileSystemSpec } from "@wapython/wasi";
import bindings from "@wapython/wasi/dist/bindings/browser";
import type WasmInstance from "./instance";
import wasmImport, { Options } from "./import";
import initWorker from "./init";
import debug from "debug";
import { EventEmitter } from "events";

export default async function wasmImportBrowser(
  wasmUrl: string,
  options: Options = {},
  log?: (...args) => void
): Promise<WasmInstance> {
  console.log("wasmImportBrowser");
  // also fix zip path, if necessary and read in any zip files (so
  // they can be loaded into memfs).
  const fs: FileSystemSpec[] = [];
  for (const X of options.fs ?? []) {
    if (X.type == "zipurl") {
      const Y = {
        type: "zip",
        data: await (await fetch(X.zipurl)).arrayBuffer(),
        mountpoint: X.mountpoint,
      } as FileSystemSpec;
      fs.push(Y);
    } else {
      fs.push(X);
    }
  }
  return await wasmImport(
    wasmUrl,
    fetch(wasmUrl),
    bindings,
    {
      ...options,
      fs,
    },
    log
  );
}

function main() {
  // in a worker, so do worker stuff

  const log = debug("worker:browser");

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
    log,
  });
}

if (self.document == null) {
  main();
}
