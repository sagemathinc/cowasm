#!/usr/bin/env node
const { run } = require("..");
if (process.argv.length <= 2) {
  throw Error("must provide path to .wasm code");
}
process.argv = process.argv.slice(2);
let [name] = process.argv;
run(name);
