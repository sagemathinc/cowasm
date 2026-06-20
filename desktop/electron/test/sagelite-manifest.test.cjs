#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  expectedSageliteManifest,
  expectedSagelitePythonPath,
  expectedSageliteRuntimeDependencyPaths,
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

function stagePythonPath(root) {
  for (const entry of expectedSagelitePythonPath) {
    mkdir(root, entry);
  }
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
    pythonPath: [...expectedSagelitePythonPath],
    runtimeDependencyPaths: [...expectedSageliteRuntimeDependencyPaths],
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
  stagePythonPath(root);
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
  assert.deepStrictEqual(manifest.pythonPath, expectedSagelitePythonPath);
  assert.strictEqual(
    sagelitePythonPath(manifest),
    expectedSagelitePythonPath.join(":"),
  );
  assert.deepStrictEqual(sagelitePythonEnv(manifest), {
    PYTHONPATH: expectedSagelitePythonPath.join(":"),
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
  stagePythonPath(root);
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
  stagePythonPath(root);
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(
    root,
    validManifest({
      pythonPath: ["site-packages", "runtime/platformdirs", "site-packages"],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /pythonPath entries must not contain duplicates/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  writeManifest(root, validManifest({ runtimeDependencyPaths: undefined }));

  assert.throws(
    () => loadSageliteManifest(root),
    /runtimeDependencyPaths must be an array/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  writeManifest(
    root,
    validManifest({ runtimeDependencyPaths: ["deps/platformdirs"] }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /runtimeDependencyPaths must match the Sagelite Electron runtime contract/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
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
  stagePythonPath(root);
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(
    root,
    validManifest({
      sideModulePaths: ["deps/libcxx/libcxx.so", "deps/libcxx/libcxx.so"],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /sideModulePaths entries must not contain duplicates/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
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
  stagePythonPath(root);
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
  stagePythonPath(root);
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
  stagePythonPath(root);
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
  stagePythonPath(root);
  touch(root, "site-packages/sage/all.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(
    root,
    validManifest({
      nativeLibraryPaths: ["deps/libcxx/libcxx.so", "deps/libcxx/libcxx.so"],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /nativeLibraryPaths entries must not contain duplicates/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
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
  stagePythonPath(root);
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
  stagePythonPath(root);
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
  stagePythonPath(root);
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
