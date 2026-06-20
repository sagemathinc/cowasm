#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const pythonWasmModule = process.env.COWASM_PYTHON_WASM_NODE || "python-wasm";
const { asyncPython } = require(pythonWasmModule);
const {
  loadSageliteManifest,
  sagelitePythonEnv,
} = loadSageliteManifestTools();

function loadSageliteManifestTools() {
  const candidates = [
    path.join(process.cwd(), "sagelite-manifest-common.cjs"),
    path.resolve(
      __dirname,
      "../../../desktop/electron/src/sagelite-manifest-common.js",
    ),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return require(candidate);
    }
  }
  throw new Error(
    `Sagelite Electron manifest validator not found; tried ${candidates.join(", ")}`,
  );
}

function loadPythonEnv() {
  if (process.env.PYTHONPATH) {
    return {
      PYTHONPATH: process.env.PYTHONPATH,
      COWASM_SAGELITE_RESOURCE_ROOT:
        process.env.COWASM_SAGELITE_RESOURCE_ROOT || process.cwd(),
    };
  }

  const resourceRoot = path.resolve(
    process.env.COWASM_SAGELITE_ELECTRON_RESOURCES || process.cwd(),
  );
  const manifest = loadSageliteManifest(resourceRoot);
  process.chdir(resourceRoot);
  return sagelitePythonEnv(manifest, resourceRoot);
}

async function main() {
  const env = loadPythonEnv();
  const python = await asyncPython({
    fs: "everything",
    noStdio: true,
    env,
  });
  python.kernel.on("stdout", (data) => process.stdout.write(data));
  python.kernel.on("stderr", (data) => process.stderr.write(data));
  try {
    await python.exec(String.raw`
import sage.all
import sage.libs.flint.fmpz_poly_sage
import os
from cypari2 import Pari, objtogen
from cypari2 import _pari_runtime_probe as pari_probe
from sage.all import (
    ZZ,
    QQ,
    Integers,
    GF,
    PolynomialRing,
    binomial,
    factor,
    factorial,
    gcd,
    prime_pi,
    xgcd,
)
from sage.matrix.constructor import identity_matrix, matrix
from sage.modules.free_module import FreeModule

assert os.environ['COWASM_SAGELITE_RESOURCE_ROOT'] == os.getcwd()
assert ZZ(2) + ZZ(3) == ZZ(5)
g, s, t = ZZ(240).xgcd(ZZ(46))
assert g == ZZ(2)
assert s * ZZ(240) + t * ZZ(46) == g
assert gcd(ZZ(84), ZZ(126)) == ZZ(42)
g2, s2, t2 = xgcd(ZZ(240), ZZ(46))
assert g2 == ZZ(2)
assert s2 * ZZ(240) + t2 * ZZ(46) == g2
assert binomial(20, 8) == ZZ(125970)
assert factorial(10) == ZZ(3628800)
M = FreeModule(ZZ, 3)
v = M([1, 2, 3])
w = M([4, 5, 6])
assert v + w == M([5, 7, 9])
assert v.dot_product(w) == ZZ(32)
assert 2 * v == M([2, 4, 6])
V = FreeModule(QQ, 2)
q = V([QQ(1, 2), QQ(2, 3)])
assert q.denominator() == 6
I = ZZ.ideal(7)
assert I.gen() == ZZ(7)
Z7 = Integers(7)
assert Z7(3) + Z7(5) == Z7(1)
F7 = GF(7)
assert F7(3) * F7(5) == F7(1)
assert QQ(6, 15) == QQ(2, 5)
R = PolynomialRing(QQ, 'x')
x = R.gen()
assert (x + 1) * (x - 1) == x**2 - 1
q, r = (x**3 - 1).quo_rem(x - 1)
assert r == 0
assert q == x**2 + x + 1
f = x**4 - 1
assert f.derivative() == 4*x**3
assert f(QQ(2)) == QQ(15)
ZZx = PolynomialRing(ZZ, 'x')
y = ZZx.gen()
assert (y + 2) * (y + 3) == y**2 + 5*y + 6
assert list(factor(2**31 - 1)) == [(ZZ(2147483647), 1)]
assert prime_pi(10**6) == 78498
try:
    PolynomialRing(ZZ, 'x', implementation='FLINT')
except NotImplementedError as err:
    assert 'WASI' in str(err)
else:
    raise AssertionError('explicit FLINT polynomial implementation should be rejected on WASI')
for module in [
    'sage.rings.polynomial.polynomial_integer_dense_flint',
    'sage.rings.polynomial.polynomial_rational_flint',
    'sage.rings.polynomial.polynomial_zmod_flint',
]:
    try:
        __import__(module)
    except ImportError as err:
        assert 'disabled on CoWasm WASI' in str(err)
    else:
        raise AssertionError(f'{module} should fail closed on WASI')

pari = Pari()
assert pari_probe.eval_long('2+3') == 5
assert pari_probe.eval_long('primepi(10000)') == 1229
assert pari_probe.eval_long('factorback(factor(360))') == 360
assert pari_probe.eval_long('znorder(Mod(2,101))') == 100
assert pari_probe.eval_long('polisirreducible(x^2+1)') == 1
assert pari_probe.eval_long('ellcard(ellinit([0,-1]), 5)') == 6
assert pari_probe.check_error_recovery() == 'caught=e_INV recovered=221'
assert str(pari('2+3')) == '5'
assert str(pari('primepi(10^6)')) == '78498'
assert str(pari('factorback(factor(360))')) == '360'
assert str(pari('znorder(Mod(2,101))')) == '100'
assert str(pari('polisirreducible(x^2+1)')) == '1'
assert str(pari('ellcard(ellinit([0,-1]), 5)')) == '6'
for label, thunk in [
    ('non-string Pari input', lambda: pari(5)),
    ('Gen conversion', lambda: objtogen('2+3')),
]:
    try:
        thunk()
    except NotImplementedError as err:
        assert 'full Gen conversion' in str(err)
    else:
        raise AssertionError(f'{label} should fail closed on WASI')

A = matrix(ZZ, [[1, 2], [3, 4]])
assert A.det() == ZZ(-2)
assert A * A == matrix(ZZ, [[7, 10], [15, 22]])
B = matrix(QQ, [[1, 2], [3, 5]])
assert B.det() == QQ(-1)
assert B.inverse() * B == matrix(QQ, [[1, 0], [0, 1]])
C = matrix(ZZ, [[2, 1], [1, 2]])
assert C.trace() == ZZ(4)
assert C.charpoly()(C) == matrix(ZZ, [[0, 0], [0, 0]])
I = identity_matrix(QQ, 3)
assert I.det() == QQ(1)
D = matrix(QQ, [[1, 2, 3], [0, 1, 4], [5, 6, 0]])
assert D.det() == QQ(1)
assert D.inverse() * D == matrix(
    QQ,
    3,
    3,
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
)
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
