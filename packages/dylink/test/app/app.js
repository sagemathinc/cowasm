const importWebAssemblyDlopen = require("../../dist").default;
const { nonzeroPositions } = require("../../dist/util");
const { readFileSync } = require("fs");
const assert = require("assert");

async function importWebAssembly(path, opts) {
  const binary = new Uint8Array(readFileSync(path));
  const mod = new WebAssembly.Module(binary);
  return new WebAssembly.Instance(mod, opts);
}

async function main() {
  const opts = {};
  const instance = await importWebAssemblyDlopen({
    path: "dist/app.wasm",
    importWebAssembly,
    opts,
  });
  console.log("instance.exports = ", instance.exports);
  console.log("nonzero table entries = ", nonzeroPositions(opts.env.__indirect_function_table));

  console.log(instance.exports.pynone_a());

  console.log("instance.exports.add10(2022) = ", instance.exports.add10(2022));
  assert(instance.exports.add10(2022) == 2022 + 10);

  exports.instance = instance;
  exports.opts = opts;
}

main();