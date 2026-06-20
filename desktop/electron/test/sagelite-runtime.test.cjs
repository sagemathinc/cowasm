#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  candidateSageliteResourceRoots,
  findSageliteRuntime,
} = require("../dist/main/python");
const {
  expectedSageliteManifest,
  sageliteManifestName,
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

function withTempDir(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cowasm-sagelite-runtime-"));
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function validManifest(overrides = {}) {
  return {
    ...expectedSageliteManifest,
    pythonPath: ["site-packages", "deps/platformdirs"],
    requiredResourcePaths: ["site-packages/sage/all.py", "deps/platformdirs/__init__.py"],
    ...overrides,
  };
}

function stageValidResources(root) {
  touch(root, "site-packages/sage/all.py");
  touch(root, "deps/platformdirs/__init__.py");
  writeManifest(root, validManifest());
}

withTempDir((root) => {
  const explicitRoot = path.join(root, "explicit");
  const resourcesPath = path.join(root, "packaged");
  const packagedRoot = path.join(resourcesPath, "electron-resources");

  assert.deepStrictEqual(
    candidateSageliteResourceRoots({
      mainDir: path.join(root, "app", "dist", "main"),
      env: { COWASM_SAGELITE_ELECTRON_RESOURCES: explicitRoot },
      resourcesPath,
    }).slice(0, 2),
    [explicitRoot, packagedRoot],
  );
});

withTempDir((root) => {
  const explicitRoot = path.join(root, "explicit");
  const packagedRoot = path.join(root, "resources", "electron-resources");
  stageValidResources(explicitRoot);
  stageValidResources(packagedRoot);

  assert.deepStrictEqual(
    findSageliteRuntime({
      env: { COWASM_SAGELITE_ELECTRON_RESOURCES: explicitRoot },
      resourcesPath: path.join(root, "resources"),
    }),
    {
      resourceRoot: explicitRoot,
      env: { PYTHONPATH: "site-packages:deps/platformdirs" },
    },
  );
});

withTempDir((root) => {
  const packagedRoot = path.join(root, "resources", "electron-resources");
  stageValidResources(packagedRoot);

  assert.deepStrictEqual(
    findSageliteRuntime({
      env: {},
      resourcesPath: path.join(root, "resources"),
    }),
    {
      resourceRoot: packagedRoot,
      env: { PYTHONPATH: "site-packages:deps/platformdirs" },
    },
  );
});

withTempDir((root) => {
  assert.strictEqual(
    findSageliteRuntime({
      mainDir: path.join(root, "dist", "main"),
      env: {},
      resourcesPath: undefined,
    }),
    null,
  );
});

withTempDir((root) => {
  const explicitRoot = path.join(root, "explicit");
  fs.mkdirSync(explicitRoot, { recursive: true });
  writeManifest(explicitRoot, validManifest({ pythonPath: ["../escape"] }));

  assert.throws(
    () =>
      findSageliteRuntime({
        env: { COWASM_SAGELITE_ELECTRON_RESOURCES: explicitRoot },
        resourcesPath: undefined,
      }),
    /root-local POSIX relative paths/,
  );
});
