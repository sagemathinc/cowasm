const WASI = require("../../node_modules/wasi-js/dist/").default;
const bindings = require("../../node_modules/wasi-js/dist/bindings/node").default;
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
  const enosys = () => 52;
  for (const name of [
    "sock_accept",
    "sock_recv",
    "sock_send",
    "sock_shutdown",
  ]) {
    if (wasi.wasiImport[name] == null) {
      wasi.wasiImport[name] = enosys;
    }
  }
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
  exports.instance = instance;
  exports.wasi = wasi;
}

main();
