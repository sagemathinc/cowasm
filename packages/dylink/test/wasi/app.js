import WASI from "../../../wasi-js/dist/index.js";
import bindings from "../../../wasi-js/dist/bindings/server.js";
import importWebAssemblyDlopen from "../../dist/index.js";
import { nonzeroPositions } from "../../dist/util.js";
import { readFileSync } from "fs";
import assert from "assert";

function importWebAssemblySync(path, opts) {
  const binary = new Uint8Array(readFileSync(path));
  const mod = new WebAssembly.Module(binary);
  return new WebAssembly.Instance(mod, opts);
}

async function main() {
  const memory = new WebAssembly.Memory({ initial: 100 });
  const wasi = new WASI({ bindings });
  const importObject = {
    wasi_snapshot_preview1: wasi.wasiImport,
    env: {
      memory,
    },
  };
  const instance = await importWebAssemblyDlopen({
    path: "app.wasm",
    importWebAssemblySync,
    importObject,
    readFileSync,
    stub: "silent",
    allowMainExports: true,
  });
  wasi.start(instance, memory);
}

main();
