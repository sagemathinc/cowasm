#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  expectedSageliteManifest,
  loadSageliteManifest,
  sageliteManifestName,
  sagelitePythonPath,
} = require("../dist/main/sagelite-manifest");

function writeManifest(root, manifest) {
  fs.writeFileSync(
    path.join(root, sageliteManifestName),
    JSON.stringify(manifest, null, 2),
  );
}

function touch(root, relativePath) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "");
}

function mkdir(root, relativePath) {
  fs.mkdirSync(path.join(root, relativePath), { recursive: true });
}

function withResourceRoot(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cowasm-sagelite-"));
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function validManifest(overrides = {}) {
  return {
    ...expectedSageliteManifest,
    pythonPath: ["site-packages", "runtime/platformdirs"],
    requiredResourcePaths: ["site-packages/sage/all.py", "python.wasm"],
    ...overrides,
  };
}

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  mkdir(root, "runtime/platformdirs");
  touch(root, "site-packages/sage/all.py");
  touch(root, "python.wasm");
  writeManifest(root, validManifest());

  const manifest = loadSageliteManifest(root);
  assert.deepStrictEqual(manifest.pythonPath, [
    "site-packages",
    "runtime/platformdirs",
  ]);
  assert.strictEqual(
    sagelitePythonPath(manifest),
    "site-packages:runtime/platformdirs",
  );
});

for (const entry of [
  "/absolute",
  "../escape",
  "has\\backslash",
  "C:/drive",
  "empty//component",
  "./dot",
]) {
  withResourceRoot((root) => {
    writeManifest(root, validManifest({ pythonPath: [entry] }));
    assert.throws(
      () => loadSageliteManifest(root),
      /root-local POSIX relative paths/,
    );
  });
}

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  mkdir(root, "runtime/platformdirs");
  touch(root, "site-packages/sage/all.py");
  writeManifest(root, validManifest());

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths entry python\.wasm does not exist/,
  );
});

withResourceRoot((root) => {
  writeManifest(root, validManifest({ smokeContract: "old-contract" }));

  assert.throws(
    () => loadSageliteManifest(root),
    /unsupported smokeContract "old-contract"/,
  );
});
