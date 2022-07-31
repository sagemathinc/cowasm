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
  const opts = {};
  const instance = await importWebAssemblyDlopen({
    path: "app.wasm",
    importWebAssemblySync,
    opts,
  });
  //  console.log("instance.exports = ", instance.exports);

  // console.log("instance.exports.pynone_a()=", instance.exports.pynone_a());

  console.log("instance.exports.add10(2022) = ", instance.exports.add10(2022));
  assert(instance.exports.add10(2022) == 2022 + 10);

  console.log(
    "instance.exports.add10b(2022) = ",
    instance.exports.add10b(2022)
  );
  assert(instance.exports.add10b(2022) == 2022 + 10);

  console.log(
    "instance.exports.add389(2022) = ",
    instance.exports.add389(2022)
  );
  assert(instance.exports.add389(2022) == 2022 + 389);

  console.log(
    "nonzero table entries = ",
    nonzeroPositions(opts.env.__indirect_function_table)
  );

  console.log("pynones_match = ", instance.exports.pynones_match());
  assert(instance.exports.pynones_match() == 1);

  exports.instance = instance;
  exports.opts = opts;

  console.log("All tests passed!");
}

main();
