#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { createHash } = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  afterCopySageliteExtraResources,
  expectedSageliteManifest,
  expectedSageliteMandatoryResourcePaths,
  expectedSageliteNativeLibraryPaths,
  expectedSagelitePythonPath,
  expectedSageliteRequiredToolPaths,
  expectedSageliteRuntimeDependencyPaths,
  normalizeCopiedSageliteExtraResource,
  packagedSageliteResourceDirname,
  resolveSageliteExtraResources,
  sageliteManifestName,
  validatePackagedSageliteExtraResource,
} = require("../sagelite-resources");

function writeManifest(root, manifest) {
  if (
    manifest.requiredResourcePaths !== undefined &&
    manifest.requiredResourceSha256 === undefined
  ) {
    manifest = {
      ...manifest,
      requiredResourceSha256: digestRequiredResources(
        root,
        manifest.requiredResourcePaths,
      ),
    };
  }
  fs.writeFileSync(
    path.join(root, sageliteManifestName),
    JSON.stringify(manifest, null, 2),
  );
}

function digestRequiredResources(root, requiredResourcePaths) {
  const digests = {};
  for (const relativePath of requiredResourcePaths) {
    const target = path.join(root, relativePath);
    digests[relativePath] =
      fs.existsSync(target) && fs.statSync(target).isFile()
        ? createHash("sha256").update(fs.readFileSync(target)).digest("hex")
        : "0".repeat(64);
  }
  return digests;
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

function stageNativeLibraries(root) {
  for (const entry of expectedSageliteNativeLibraryPaths) {
    touch(root, entry);
  }
}

function stageRequiredTools(root) {
  for (const entry of expectedSageliteRequiredToolPaths) {
    touch(root, entry);
  }
}

function stageSageEntrypoints(root) {
  for (const entry of expectedSageliteMandatoryResourcePaths) {
    if (
      entry !== "python.wasm" &&
      !expectedSageliteRequiredToolPaths.includes(entry)
    ) {
      touch(root, entry);
    }
  }
}

function expectedSageliteMandatorySideModulePaths() {
  return expectedSageliteMandatoryResourcePaths.filter((entry) =>
    entry.endsWith(".so"),
  );
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
    sageliteSourceRevision: "0123456789abcdef0123456789abcdef01234567",
    pythonPath: [...expectedSagelitePythonPath],
    runtimeDependencyPaths: [...expectedSageliteRuntimeDependencyPaths],
    requiredResourcePaths: [
      ...expectedSageliteMandatoryResourcePaths,
      ...expectedSageliteNativeLibraryPaths,
    ],
    nativeLibraryPaths: [...expectedSageliteNativeLibraryPaths],
    sideModulePaths: [
      ...expectedSageliteMandatorySideModulePaths(),
      ...expectedSageliteNativeLibraryPaths,
    ],
    ...overrides,
  };
}

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ sageliteSourceRevision: undefined }));

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /sageliteSourceRevision must be a full git commit hash/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ sageliteSourceRevision: "not-a-commit" }));

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /sageliteSourceRevision must be a full git commit hash/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ sageliteSourceRevision: "875c1cc836d" }));

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /sageliteSourceRevision must be a full git commit hash/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "site-packages/sage/rings/all.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !==
            "site-packages/sage/groups/abelian_gps/abelian_group.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !== "site-packages/sage/rings/quotient_ring_element.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !==
            "site-packages/sage/structure/parent.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !== "site-packages/sage/misc/misc_c.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "site-packages/sage/rings/ideal.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !==
            "site-packages/sage/rings/finite_rings/finite_field_base.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

function stageValidResources(root) {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(root, validManifest());
}

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
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
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  stageNativeLibraries(root);
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
  stageSageEntrypoints(root);
  touch(root, "runtime-platformdirs.py");
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
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
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python-real.wasm");
  fs.symlinkSync("python-real.wasm", path.join(root, "python.wasm"));
  stageNativeLibraries(root);
  writeManifest(root, validManifest());

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths entry python\.wasm must not be a symbolic link/,
  );
});

withResourceRoot((root) => {
  const realRoot = path.join(root, "real-resources");
  const linkedRoot = path.join(root, "linked-resources");

  stagePythonPath(realRoot);
  stageSageEntrypoints(realRoot);
  stageRequiredTools(realRoot);
  touch(realRoot, "python.wasm");
  stageNativeLibraries(realRoot);
  writeManifest(realRoot, validManifest());
  fs.symlinkSync(realRoot, linkedRoot, "dir");

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: linkedRoot,
      }),
    /resource root must not be a symbolic link/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  const linkedSageTarget = path.join(root, "linked-sage-target");
  fs.renameSync(path.join(root, "site-packages", "sage"), linkedSageTarget);
  fs.symlinkSync(
    linkedSageTarget,
    path.join(root, "site-packages", "sage"),
    "dir",
  );
  writeManifest(root, validManifest());

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths entry site-packages\/sage\/__init__\.py must not contain symbolic path component site-packages\/sage/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ staleManifestField: true }));

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /contains unsupported Sagelite manifest fields: staleManifestField/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  stageNativeLibraries(root);
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
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  mkdir(root, "python.wasm");
  stageNativeLibraries(root);
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
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  writeManifest(root, validManifest());

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths entry deps\/libcxx\/libcxx\.so does not exist/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  mkdir(root, "deps/libcxx/libcxx.so");
  writeManifest(root, validManifest());

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /requiredResourcePaths entry deps\/libcxx\/libcxx\.so must be a file/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      sideModulePaths: [
        ...expectedSageliteMandatorySideModulePaths(),
        ...expectedSageliteNativeLibraryPaths,
        "site-packages/sage/extra.cpython-314-wasm32-wasi.so",
      ],
    }),
  );

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /sideModulePaths entry site-packages\/sage\/extra\.cpython-314-wasm32-wasi\.so does not exist/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so");
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      sideModulePaths: ["deps/libcxx/libcxx.so"],
    }),
  );

  assert.throws(
    () =>
      resolveSageliteExtraResources(__dirname, {
        COWASM_SAGELITE_ELECTRON_RESOURCES: root,
      }),
    /sideModulePaths must list every copied \.so resource/,
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
  const sourceRoot = path.join(root, packagedSageliteResourceDirname);
  const stagingPath = path.join(root, "stage");
  const packagedRoot = path.join(
    stagingPath,
    "resources",
    packagedSageliteResourceDirname,
  );
  stageValidResources(sourceRoot);
  copyTree(sourceRoot, packagedRoot);

  normalizeCopiedSageliteExtraResource(sourceRoot, stagingPath);

  validatePackagedSageliteExtraResource(packagedRoot);
});

withResourceRoot((root) => {
  const sourceRoot = path.join(root, "partial-sagelite-resources");
  const stagingPath = path.join(root, "stage");
  const copiedRoot = path.join(
    stagingPath,
    "resources",
    path.basename(sourceRoot),
  );
  stageValidResources(sourceRoot);
  copyTree(sourceRoot, copiedRoot);
  fs.rmSync(path.join(copiedRoot, "python.wasm"));

  assert.throws(
    () => normalizeCopiedSageliteExtraResource(sourceRoot, stagingPath),
    /requiredResourcePaths entry python\.wasm does not exist/,
  );
});

withResourceRoot((root) => {
  const sourceRoot = path.join(root, "corrupt-sagelite-resources");
  const stagingPath = path.join(root, "stage");
  const copiedRoot = path.join(
    stagingPath,
    "resources",
    path.basename(sourceRoot),
  );
  stageValidResources(sourceRoot);
  copyTree(sourceRoot, copiedRoot);
  fs.writeFileSync(path.join(copiedRoot, "python.wasm"), "changed");

  assert.throws(
    () => normalizeCopiedSageliteExtraResource(sourceRoot, stagingPath),
    /requiredResourceSha256 entry python\.wasm does not match copied resource/,
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
  const sourceRoot = path.join(root, "duplicate-darwin-resources");
  const stagingPath = path.join(root, "stage");
  const appResourceParent = path.join(
    stagingPath,
    "CoWasm Desktop.app",
    "Contents",
    "Resources",
  );
  stageValidResources(sourceRoot);
  copyTree(
    sourceRoot,
    path.join(stagingPath, "resources", path.basename(sourceRoot)),
  );
  copyTree(sourceRoot, path.join(appResourceParent, path.basename(sourceRoot)));

  assert.throws(
    () => normalizeCopiedSageliteExtraResource(sourceRoot, stagingPath, "darwin"),
    /Multiple copied Sagelite Electron resources exist/,
  );
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
