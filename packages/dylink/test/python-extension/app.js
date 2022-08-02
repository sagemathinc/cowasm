const WASI = require("../../../wasi/dist/").default;
const bindings = require("../../../wasi/dist/bindings/node").default;
const importWebAssemblyDlopen = require("../../dist").default;
const { nonzeroPositions } = require("../../dist/util");
const { readFileSync } = require("fs");
const assert = require("assert");

function importWebAssemblySync(path, opts) {
  const binary = new Uint8Array(readFileSync(path));
  const mod = new WebAssembly.Module(binary);
  return new WebAssembly.Instance(mod, opts);
}

const table = new WebAssembly.Table({ initial: 1000, element: "anyfunc" });
exports.table = table;

async function main() {
  const memory = new WebAssembly.Memory({ initial: 100 });
  const wasi = new WASI({ bindings });
  const opts = {
    wasi_snapshot_preview1: wasi.wasiImport,
    env: {
      memory,
      __indirect_function_table: table,
      trampolineCall: (funcPtr) => {
        console.log("trampolineCall ", funcPtr);
        const r = table.get(funcPtr)();
        console.log("trampolineCall got back ", r);
        return r;
      },
    },
  };
  const instance = await importWebAssemblyDlopen({
    path: "app.wasm",
    importWebAssemblySync,
    opts,
  });
  wasi.start(instance, memory);
  exports.instance = instance;
  exports.wasi = wasi;
}

main();
