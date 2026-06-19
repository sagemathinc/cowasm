#!/usr/bin/env node
"use strict";

const pythonWasmModule = process.env.COWASM_PYTHON_WASM_NODE || "python-wasm";
const { asyncPython } = require(pythonWasmModule);

async function main() {
  const python = await asyncPython({
    fs: "everything",
    noStdio: true,
    env: { PYTHONPATH: process.env.PYTHONPATH || "" },
  });
  python.kernel.on("stdout", (data) => process.stdout.write(data));
  python.kernel.on("stderr", (data) => process.stderr.write(data));
  try {
    await python.exec(String.raw`
import sage.all
from sage.all import ZZ, QQ, PolynomialRing, factor, prime_pi
from sage.matrix.constructor import matrix

assert ZZ(2) + ZZ(3) == ZZ(5)
assert QQ(6, 15) == QQ(2, 5)
R = PolynomialRing(QQ, 'x')
x = R.gen()
assert (x + 1) * (x - 1) == x**2 - 1
assert list(factor(2**31 - 1)) == [(ZZ(2147483647), 1)]
assert prime_pi(10**6) == 78498

A = matrix(ZZ, [[1, 2], [3, 4]])
assert A.det() == ZZ(-2)
assert A * A == matrix(ZZ, [[7, 10], [15, 22]])
B = matrix(QQ, [[1, 2], [3, 5]])
assert B.det() == QQ(-1)
assert B.inverse() * B == matrix(QQ, [[1, 0], [0, 1]])
`);
    console.log("sagelite-electron-ok relative resources smoke");
  } finally {
    python.terminate();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
