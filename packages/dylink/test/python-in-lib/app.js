const WASI = require("../../../wasi/dist/").default;
const bindings = require("../../../wasi/dist/bindings/node").default;
const importWebAssemblyDlopen = require("../../dist").default;
const { readFileSync } = require("fs");

function importWebAssemblySync(path, importObject) {
  const binary = new Uint8Array(readFileSync(path));
  const mod = new WebAssembly.Module(binary);
  return new WebAssembly.Instance(mod, importObject);
}

const table = new WebAssembly.Table({ initial: 10000, element: "anyfunc" });
exports.table = table;

async function main() {
  const memory = new WebAssembly.Memory({ initial: 1000 });
  const wasi = new WASI({ bindings });
  const importObject = {
    wasi_snapshot_preview1: wasi.wasiImport,
    env: {
      memory,
      __indirect_function_table: table,
      _Py_CheckEmscriptenSignals: () => {},
      getrandom: (bufPtr, bufLen, _flags) => {
        // NOTE: returning 0 here (our default stub behavior)
        // would result in Python hanging on startup!
        bindings.randomFillSync(
          // @ts-ignore
          new Uint8Array(memory.buffer),
          bufPtr,
          bufLen
        );
        return bufLen;
      },
    },
  };
  const instance = await importWebAssemblyDlopen({
    path: "app.wasm",
    importWebAssemblySync,
    importObject,
    stub: true,
    traceStub: true,
    readFileSync,
  });
  wasi.start(instance, memory);
  exports.instance = instance;
  exports.wasi = wasi;
}

main();
