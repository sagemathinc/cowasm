#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const manifestName = "sagelite-electron-resources.json";
const expectedManifest = {
  schemaVersion: 2,
  resourceKind: "cowasm-sagelite-electron-resources",
  pythonAbi: "cpython-314-wasm32-wasi",
  pythonPlatform: "wasi",
  smokeContract: "exact-arithmetic-matrix-v1",
};
const pythonWasmModule = process.env.COWASM_PYTHON_WASM_NODE || "python-wasm";
const { asyncPython } = require(pythonWasmModule);

function loadPythonPath() {
  if (process.env.PYTHONPATH) {
    return process.env.PYTHONPATH;
  }

  const resourceRoot = path.resolve(
    process.env.COWASM_SAGELITE_ELECTRON_RESOURCES || process.cwd(),
  );
  const manifestPath = path.join(resourceRoot, manifestName);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  validateManifestContract(manifestPath, manifest);
  if (!Array.isArray(manifest.pythonPath) || manifest.pythonPath.length === 0) {
    throw new Error(`${manifestPath} must define a non-empty pythonPath array`);
  }
  validateRelativeEntries(manifestPath, "pythonPath", manifest.pythonPath);
  for (const entry of manifest.pythonPath) {
    const entryPath = path.join(resourceRoot, entry);
    if (!fs.existsSync(entryPath)) {
      throw new Error(`${manifestPath} pythonPath entry ${entry} does not exist`);
    }
  }
  if (manifest.requiredResourcePaths !== undefined) {
    if (!Array.isArray(manifest.requiredResourcePaths)) {
      throw new Error(`${manifestPath} requiredResourcePaths must be an array`);
    }
    validateRelativeEntries(
      manifestPath,
      "requiredResourcePaths",
      manifest.requiredResourcePaths,
    );
    for (const entry of manifest.requiredResourcePaths) {
      const entryPath = path.join(resourceRoot, entry);
      if (!fs.existsSync(entryPath)) {
        throw new Error(`${manifestPath} required resource ${entry} does not exist`);
      }
    }
  }

  process.chdir(resourceRoot);
  return manifest.pythonPath.join(":");
}

function validateManifestContract(manifestPath, manifest) {
  for (const [fieldName, expectedValue] of Object.entries(expectedManifest)) {
    if (manifest[fieldName] !== expectedValue) {
      throw new Error(
        `${manifestPath} has unsupported ${fieldName} ${JSON.stringify(
          manifest[fieldName],
        )}; expected ${JSON.stringify(expectedValue)}`,
      );
    }
  }
}

function validateRelativeEntries(manifestPath, fieldName, entries) {
  for (const entry of entries) {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error(`${manifestPath} contains an invalid ${fieldName} entry`);
    }
    const parts = entry.split("/");
    if (
      path.isAbsolute(entry) ||
      entry.includes(":") ||
      entry.includes("\\") ||
      parts.some((part) => part === "" || part === "." || part === "..")
    ) {
      throw new Error(
        `${manifestPath} ${fieldName} entries must be root-local POSIX relative paths`,
      );
    }
  }
}

async function main() {
  const pythonPath = loadPythonPath();
  const python = await asyncPython({
    fs: "everything",
    noStdio: true,
    env: { PYTHONPATH: pythonPath },
  });
  python.kernel.on("stdout", (data) => process.stdout.write(data));
  python.kernel.on("stderr", (data) => process.stderr.write(data));
  try {
    await python.exec(String.raw`
import sage.all
from sage.all import ZZ, QQ, Integers, GF, PolynomialRing, factor, prime_pi
from sage.matrix.constructor import matrix

assert ZZ(2) + ZZ(3) == ZZ(5)
g, s, t = ZZ(240).xgcd(ZZ(46))
assert g == ZZ(2)
assert s * ZZ(240) + t * ZZ(46) == g
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
