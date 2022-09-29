import WASI from "../../../wasi-js/dist/index.js";
import bindings from "../../../wasi-js/dist/bindings/server.js";
import importWebAssemblyDlopen from "../../dist/index.js";
import { nonzeroPositions } from "../../dist/util.js";
import { readFileSync } from "fs";
import assert from "assert";

function importWebAssemblySync(path, importObject) {
  const binary = new Uint8Array(readFileSync(path));
  const mod = new WebAssembly.Module(binary);
  return new WebAssembly.Instance(mod, importObject);
}

const table = new WebAssembly.Table({ initial: 1000, element: "anyfunc" });

async function main() {
  const memory = new WebAssembly.Memory({ initial: 100 });
  const wasi = new WASI({ bindings });
  const importObject = {
    wasi_snapshot_preview1: wasi.wasiImport,
    env: {
      memory,
      __indirect_function_table: table,
      //time: () => new Date().valueOf();
    },
  };
  const instance = await importWebAssemblyDlopen({
    path: "app.wasm",
    importWebAssemblySync,
    importObject,
    stub: true,
    readFileSync,
    allowMainExports: true,
  });
  wasi.start(instance, memory);
}

main();
