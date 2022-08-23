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
  });
  wasi.start(instance, memory);
  exports.instance = instance;
  exports.wasi = wasi;
}

main();
