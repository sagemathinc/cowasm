const dylink = require("../../dist").default;
const { showTable } = require("../../dist/util");
const { readFileSync } = require("fs");
const assert = require("assert");

const binary = new Uint8Array(readFileSync("dist/app.wasm"));
const mod = new WebAssembly.Module(binary);
const opts = {};
dylink(opts);
const instance = new WebAssembly.Instance(mod, opts);
console.log("instance.exports = ", instance.exports);
showTable(opts.env.__indirect_function_table);

console.log(instance.exports.pynone_a());

console.log(
  "instance.exports.add10(2022) = ",
  instance.exports.add10(2022)
);
assert(instance.exports.add10(2022) == 2022 + 10);

exports.instance = instance;
exports.opts = opts;
