#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  expectedSageliteManifest,
  resolveSageliteExtraResources,
  sageliteManifestName,
} = require("../sagelite-resources");

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

function withResourceRoot(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cowasm-sagelite-forge-"));
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
    requiredResourcePaths: [
      "site-packages/sage/all.py",
      "sagelite-electron-smoke.cjs",
      "python.wasm",
    ],
    ...overrides,
  };
}

withResourceRoot((root) => {
  touch(root, "site-packages/sage/all.py");
  touch(root, "runtime/platformdirs/__init__.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  writeManifest(root, validManifest());

  assert.deepStrictEqual(
    resolveSageliteExtraResources(__dirname, {
      COWASM_SAGELITE_ELECTRON_RESOURCES: root,
    }),
    [root],
  );
});

withResourceRoot((root) => {
  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: path.join(root, "missing"),
      }),
    /Sagelite Electron resources do not exist/,
  );
});

withResourceRoot((root) => {
  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /Sagelite Electron resource manifest does not exist/,
  );
});

withResourceRoot((root) => {
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  writeManifest(root, validManifest({ pythonPath: ["site-packages", "../escape"] }));

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /root-local POSIX relative paths/,
  );
});

withResourceRoot((root) => {
  touch(root, "site-packages/sage/all.py");
  touch(root, "runtime/platformdirs/__init__.py");
  touch(root, "sagelite-electron-smoke.cjs");
  writeManifest(root, validManifest());

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths entry python\.wasm does not exist/,
  );
});

assert.deepStrictEqual(
  resolveSageliteExtraResources(path.join(os.tmpdir(), "cowasm-no-default"), {}),
  [],
);

assert.throws(
  () =>
    resolveSageliteExtraResources(path.join(os.tmpdir(), "cowasm-no-default"), {
      COWASM_REQUIRE_SAGELITE_ELECTRON_RESOURCES: "1",
    }),
  /Sagelite Electron resources do not exist/,
);
