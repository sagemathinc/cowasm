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
  sagelitePythonEnv,
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
    requiredResourcePaths: [
      "site-packages/sage/all.py",
      "sagelite-electron-smoke.cjs",
      "python.wasm",
    ],
    nativeLibraryPaths: ["deps/libcxx/libcxx.so"],
    sideModulePaths: ["deps/libcxx/libcxx.so"],
    ...overrides,
  };
}

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  mkdir(root, "runtime/platformdirs");
  touch(root, "site-packages/sage/all.py");
  touch(root, "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(
    root,
    validManifest({
      sideModulePaths: [
        "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so",
        "deps/libcxx/libcxx.so",
      ],
    }),
  );

  const manifest = loadSageliteManifest(root);
  assert.deepStrictEqual(manifest.sideModulePaths, [
    "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so",
    "deps/libcxx/libcxx.so",
  ]);
  assert.deepStrictEqual(manifest.pythonPath, [
    "site-packages",
    "runtime/platformdirs",
  ]);
  assert.strictEqual(
    sagelitePythonPath(manifest),
    "site-packages:runtime/platformdirs",
  );
  assert.deepStrictEqual(sagelitePythonEnv(manifest), {
    PYTHONPATH: "site-packages:runtime/platformdirs",
  });
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
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(root, validManifest({ nativeLibraryPaths: ["../escape"] }));

  assert.throws(
    () => loadSageliteManifest(root),
    /root-local POSIX relative paths/,
  );
});

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  touch(root, "runtime-platformdirs.py");
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(
    root,
    validManifest({ pythonPath: ["site-packages", "runtime-platformdirs.py"] }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /pythonPath entry runtime-platformdirs\.py must be a directory/,
  );
});

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  mkdir(root, "runtime/platformdirs");
  touch(root, "site-packages/sage/all.py");
  touch(root, "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(
    root,
    validManifest({
      sideModulePaths: ["deps/libcxx/libcxx.so"],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /sideModulePaths must list every copied \.so resource/,
  );
});

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  mkdir(root, "runtime/platformdirs");
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(root, validManifest());

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths entry python\.wasm does not exist/,
  );
});

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  mkdir(root, "runtime/platformdirs");
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  mkdir(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(root, validManifest());

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths entry python\.wasm must be a file/,
  );
});

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  mkdir(root, "runtime/platformdirs");
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  writeManifest(root, validManifest());

  assert.throws(
    () => loadSageliteManifest(root),
    /nativeLibraryPaths entry deps\/libcxx\/libcxx\.so does not exist/,
  );
});

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  mkdir(root, "runtime/platformdirs");
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  mkdir(root, "deps/libcxx/libcxx.so");
  writeManifest(root, validManifest());

  assert.throws(
    () => loadSageliteManifest(root),
    /nativeLibraryPaths entry deps\/libcxx\/libcxx\.so must be a file/,
  );
});

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  mkdir(root, "runtime/platformdirs");
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(
    root,
    validManifest({
      sideModulePaths: undefined,
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /nativeLibraryPaths requires sideModulePaths/,
  );
});

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  mkdir(root, "runtime/platformdirs");
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  touch(root, "deps/native/libextra.wasm");
  writeManifest(
    root,
    validManifest({
      nativeLibraryPaths: ["deps/libcxx/libcxx.so", "deps/native/libextra.wasm"],
      sideModulePaths: ["deps/libcxx/libcxx.so"],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /nativeLibraryPaths entries must also be listed in sideModulePaths/,
  );
});

withResourceRoot((root) => {
  writeManifest(root, validManifest({ smokeContract: "old-contract" }));

  assert.throws(
    () => loadSageliteManifest(root),
    /unsupported smokeContract "old-contract"/,
  );
});

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  mkdir(root, "runtime/platformdirs");
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(
    root,
    validManifest({
      sideModulePaths: [
        "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so",
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /sideModulePaths entry site-packages\/sage\/structure\/element\.cpython-314-wasm32-wasi\.so does not exist/,
  );
});

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  mkdir(root, "runtime/platformdirs");
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  mkdir(root, "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so");
  writeManifest(
    root,
    validManifest({
      sideModulePaths: [
        "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so",
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /sideModulePaths entry site-packages\/sage\/structure\/element\.cpython-314-wasm32-wasi\.so must be a file/,
  );
});
