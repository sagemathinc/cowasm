#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  afterCopySageliteExtraResources,
  expectedSageliteManifest,
  normalizeCopiedSageliteExtraResource,
  packagedSageliteResourceDirname,
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

function mkdir(root, relativePath) {
  fs.mkdirSync(path.join(root, relativePath), { recursive: true });
}

function copyTree(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
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
    nativeLibraryPaths: ["deps/libcxx/libcxx.so"],
    ...overrides,
  };
}

function stageValidResources(root) {
  touch(root, "site-packages/sage/all.py");
  touch(root, "runtime/platformdirs/__init__.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(root, validManifest());
}

withResourceRoot((root) => {
  touch(root, "site-packages/sage/all.py");
  touch(root, "runtime/platformdirs/__init__.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
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
  touch(root, "deps/libcxx/libcxx.so");
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
  touch(root, "runtime-platformdirs.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(
    root,
    validManifest({ pythonPath: ["site-packages", "runtime-platformdirs.py"] }),
  );

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /pythonPath entry runtime-platformdirs\.py must be a directory/,
  );
});

withResourceRoot((root) => {
  touch(root, "site-packages/sage/all.py");
  touch(root, "runtime/platformdirs/__init__.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(root, validManifest());

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths entry python\.wasm does not exist/,
  );
});

withResourceRoot((root) => {
  touch(root, "site-packages/sage/all.py");
  touch(root, "runtime/platformdirs/__init__.py");
  touch(root, "sagelite-electron-smoke.cjs");
  mkdir(root, "python.wasm");
  touch(root, "deps/libcxx/libcxx.so");
  writeManifest(root, validManifest());

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths entry python\.wasm must be a file/,
  );
});

withResourceRoot((root) => {
  touch(root, "site-packages/sage/all.py");
  touch(root, "runtime/platformdirs/__init__.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  writeManifest(root, validManifest());

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /nativeLibraryPaths entry deps\/libcxx\/libcxx\.so does not exist/,
  );
});

withResourceRoot((root) => {
  touch(root, "site-packages/sage/all.py");
  touch(root, "runtime/platformdirs/__init__.py");
  touch(root, "sagelite-electron-smoke.cjs");
  touch(root, "python.wasm");
  mkdir(root, "deps/libcxx/libcxx.so");
  writeManifest(root, validManifest());

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /nativeLibraryPaths entry deps\/libcxx\/libcxx\.so must be a file/,
  );
});

assert.deepStrictEqual(
  resolveSageliteExtraResources(path.join(os.tmpdir(), "cowasm-no-default"), {}),
  [],
);

withResourceRoot((root) => {
  const sourceRoot = path.join(root, "custom-sagelite-resources");
  const stagingPath = path.join(root, "stage");
  stageValidResources(sourceRoot);
  copyTree(
    sourceRoot,
    path.join(stagingPath, "resources", path.basename(sourceRoot)),
  );

  normalizeCopiedSageliteExtraResource(sourceRoot, stagingPath);

  assert.ok(
    fs.existsSync(
      path.join(
        stagingPath,
        "resources",
        packagedSageliteResourceDirname,
        sageliteManifestName,
      ),
    ),
  );
  assert.ok(
    !fs.existsSync(
      path.join(stagingPath, "resources", path.basename(sourceRoot)),
    ),
  );
});

withResourceRoot((root) => {
  const sourceRoot = path.join(root, "override-name");
  const stagingPath = path.join(root, "stage");
  stageValidResources(sourceRoot);
  const hook = afterCopySageliteExtraResources(__dirname, {
    COWASM_SAGELITE_ELECTRON_RESOURCES: sourceRoot,
  });
  copyTree(
    sourceRoot,
    path.join(stagingPath, "resources", path.basename(sourceRoot)),
  );

  hook(stagingPath, "21.3.0", process.platform, process.arch, (err) => {
    assert.ifError(err);
  });

  assert.ok(
    fs.existsSync(
      path.join(
        stagingPath,
        "resources",
        packagedSageliteResourceDirname,
        sageliteManifestName,
      ),
    ),
  );
});

withResourceRoot((root) => {
  const sourceRoot = path.join(root, "darwin-override");
  const stagingPath = path.join(root, "stage");
  const resourceParent = path.join(
    stagingPath,
    "CoWasm Desktop.app",
    "Contents",
    "Resources",
  );
  stageValidResources(sourceRoot);
  copyTree(sourceRoot, path.join(resourceParent, path.basename(sourceRoot)));

  normalizeCopiedSageliteExtraResource(sourceRoot, stagingPath, "darwin");

  assert.ok(
    fs.existsSync(
      path.join(
        resourceParent,
        packagedSageliteResourceDirname,
        sageliteManifestName,
      ),
    ),
  );
  assert.ok(!fs.existsSync(path.join(resourceParent, path.basename(sourceRoot))));
});

withResourceRoot((root) => {
  const stagingPath = path.join(root, "stage");
  const hook = afterCopySageliteExtraResources(root, {});

  hook(stagingPath, "21.3.0", process.platform, process.arch, (err) => {
    assert.ifError(err);
  });
});

assert.throws(
  () =>
    resolveSageliteExtraResources(path.join(os.tmpdir(), "cowasm-no-default"), {
      COWASM_REQUIRE_SAGELITE_ELECTRON_RESOURCES: "1",
    }),
  /Sagelite Electron resources do not exist/,
);
