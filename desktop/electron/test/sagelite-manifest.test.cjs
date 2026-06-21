#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { createHash } = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  expectedSageliteManifest,
  expectedSageliteMandatoryResourcePaths,
  expectedSageliteNativeLibraryPaths,
  expectedSagelitePythonPath,
  expectedSageliteRequiredToolPaths,
  expectedSageliteRuntimeDependencyPaths,
  loadSageliteManifest,
  sageliteManifestName,
  sagelitePythonEnv,
  sagelitePythonPath,
} = require("../dist/main/sagelite-manifest");

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

function sageliteStandaloneScript() {
  return fs.readFileSync(
    path.join(
      __dirname,
      "../../../sagemath/sagelite/src/test-wasi-sdk-standalone.sh",
    ),
    "utf8",
  );
}

function extractShellScalar(script, name) {
  const pattern = new RegExp(`^${name}=([^\\n]+)$`, "m");
  const match = script.match(pattern);
  assert(match, `missing ${name} in Sagelite standalone script`);
  return match[1].replace(/^"|"$/g, "");
}

function extractShellArray(script, name) {
  const pattern = new RegExp(`^${name}=\\(\\n([\\s\\S]*?)\\n\\)`, "m");
  const match = script.match(pattern);
  assert(match, `missing ${name} in Sagelite standalone script`);
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^"|"$/g, ""));
}

function sorted(entries) {
  return [...entries].sort();
}

withResourceRoot(() => {
  const script = sageliteStandaloneScript();

  assert.strictEqual(
    Number(extractShellScalar(script, "electron_manifest_schema_version")),
    expectedSageliteManifest.schemaVersion,
  );
  assert.strictEqual(
    extractShellScalar(script, "electron_manifest_resource_kind"),
    expectedSageliteManifest.resourceKind,
  );
  assert.strictEqual(
    extractShellScalar(script, "electron_manifest_python_abi"),
    expectedSageliteManifest.pythonAbi,
  );
  assert.strictEqual(
    extractShellScalar(script, "electron_manifest_python_platform"),
    expectedSageliteManifest.pythonPlatform,
  );
  assert.strictEqual(
    extractShellScalar(script, "electron_manifest_smoke_contract"),
    expectedSageliteManifest.smokeContract,
  );
  assert.strictEqual(
    extractShellScalar(script, "electron_manifest_resource_root_env_name"),
    expectedSageliteManifest.resourceRootEnvName,
  );

  const runtimeDepLabels = extractShellArray(script, "runtime_dep_labels");
  assert.deepStrictEqual(
    runtimeDepLabels.map((entry) => `deps/${entry}`),
    expectedSageliteRuntimeDependencyPaths,
  );
  assert.deepStrictEqual(
    ["site-packages", ...runtimeDepLabels.map((entry) => `deps/${entry}`)],
    expectedSagelitePythonPath,
  );

  assert.deepStrictEqual(
    sorted(extractShellArray(script, "electron_required_paths")),
    sorted([
      ...expectedSageliteMandatoryResourcePaths,
      ...expectedSageliteNativeLibraryPaths,
    ]),
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ sageliteSourceRevision: undefined }));

  assert.throws(
    () => loadSageliteManifest(root),
    /sageliteSourceRevision must be a full git commit hash/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !== "site-packages/sage/combinat/composition_signed.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !==
            "site-packages/sage/combinat/integer_lists/invlex.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "site-packages/sage/combinat/set_partition.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !== "site-packages/sage/combinat/perfect_matching.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !== "site-packages/sage/groups/group.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
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
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "site-packages/sage/coding/hamming_code.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !==
            "site-packages/sage/combinat/set_partition_iterator.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "deps/numpy/numpy/core/__init__.pyc",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "site-packages/sage/combinat/partition.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !==
            "site-packages/sage/combinat/permutation_cython.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !==
            "site-packages/sage/sets/recursively_enumerated_set.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "site-packages/sage/modules/free_module.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !==
            "site-packages/sage/modules/free_module_element.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
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
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !== "site-packages/sage/arith/power.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "deps/numpy/numpy/core/multiarray.pyc",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !==
            "site-packages/sage/categories/category_singleton.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
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
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "deps/cypari2/cypari2/handle_error.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !==
            "site-packages/sage/structure/coerce.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
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
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !== "site-packages/sage/rings/fast_arith.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
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
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
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
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "site-packages/sage/libs/flint/__init__.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !==
            "site-packages/sage/libs/flint/fmpz_poly.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ sageliteSourceRevision: "not-a-commit" }));

  assert.throws(
    () => loadSageliteManifest(root),
    /sageliteSourceRevision must be a full git commit hash/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ sageliteSourceRevision: "875c1cc836d" }));

  assert.throws(
    () => loadSageliteManifest(root),
    /sageliteSourceRevision must be a full git commit hash/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so");
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      sideModulePaths: [
        ...expectedSageliteMandatorySideModulePaths(),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  const manifest = loadSageliteManifest(root);
  assert.deepStrictEqual(manifest.sideModulePaths, [
    ...expectedSageliteMandatorySideModulePaths(),
    ...expectedSageliteNativeLibraryPaths,
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

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ staleManifestField: true }));

  assert.throws(
    () => loadSageliteManifest(root),
    /contains unsupported Sagelite manifest fields: staleManifestField/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ requiredResourcePaths: undefined }));

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must be an array/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ requiredResourcePaths: [] }));

  assert.throws(
    () => loadSageliteManifest(root),
    /must define a non-empty requiredResourcePaths array/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "site-packages/sage/env.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "site-packages/sage/rings/rational_field.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) =>
            entry !== "deps/cypari2/cypari2/gen.cpython-314-wasm32-wasi.so",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        ...expectedSageliteMandatoryResourcePaths.filter(
          (entry) => entry !== "site-packages/sage/all.py",
        ),
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourcePaths: [
        "site-packages/sage/all.py",
        ...expectedSageliteRequiredToolPaths,
        ...expectedSageliteNativeLibraryPaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourcePaths must include the Sagelite Electron mandatory resources/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ requiredResourceSha256: null }));

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourceSha256 must be an object/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(
    root,
    validManifest({
      requiredResourceSha256: {
        "site-packages/sage/all.py": "0".repeat(64),
      },
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourceSha256 keys must match requiredResourcePaths/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  const manifest = validManifest();
  manifest.requiredResourceSha256 = digestRequiredResources(
    root,
    manifest.requiredResourcePaths,
  );
  manifest.requiredResourceSha256["python.wasm"] = "not-a-digest";
  writeManifest(root, manifest);

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourceSha256 entry python\.wasm must be a lowercase sha256 hex digest/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(root, validManifest());
  fs.writeFileSync(path.join(root, "python.wasm"), "changed");

  assert.throws(
    () => loadSageliteManifest(root),
    /requiredResourceSha256 entry python\.wasm does not match copied resource/,
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
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ nativeLibraryPaths: ["../escape"] }));

  assert.throws(
    () => loadSageliteManifest(root),
    /root-local POSIX relative paths/,
  );
});

withResourceRoot((root) => {
  mkdir(root, "site-packages");
  touch(root, "runtime-platformdirs.py");
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
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
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  mkdir(root, "linked-platformdirs-target");
  fs.rmSync(path.join(root, "deps/platformdirs"), {
    recursive: true,
    force: true,
  });
  fs.symlinkSync(
    path.join(root, "linked-platformdirs-target"),
    path.join(root, "deps/platformdirs"),
    "dir",
  );
  writeManifest(root, validManifest());

  assert.throws(
    () => loadSageliteManifest(root),
    /pythonPath entry deps\/platformdirs must not be a symbolic link/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  touch(root, "linked-runtime-target.py");
  fs.symlinkSync(
    path.join(root, "linked-runtime-target.py"),
    path.join(root, "deps/platformdirs/platformdirs/linked_runtime.py"),
  );
  writeManifest(root, validManifest());

  assert.throws(
    () => loadSageliteManifest(root),
    /pythonPath directory contains symbolic path deps\/platformdirs\/platformdirs\/linked_runtime\.py/,
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
    () => loadSageliteManifest(root),
    /sideModulePaths must list every copied \.so resource/,
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
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(root, validManifest());

  assert.throws(
    () => loadSageliteManifest(root),
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
    () => loadSageliteManifest(root),
    /requiredResourcePaths entry python\.wasm must be a file/,
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
    () => loadSageliteManifest(root),
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
    () => loadSageliteManifest(linkedRoot),
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
    () => loadSageliteManifest(root),
    /pythonPath directory contains symbolic path site-packages\/sage/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  writeManifest(root, validManifest());

  assert.throws(
    () => loadSageliteManifest(root),
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
    () => loadSageliteManifest(root),
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
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ nativeLibraryPaths: [] }));

  assert.throws(
    () => loadSageliteManifest(root),
    /must define a non-empty nativeLibraryPaths array/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  touch(root, "deps/native/libextra.so");
  writeManifest(
    root,
    validManifest({
      nativeLibraryPaths: ["deps/libcxx/libcxx.so", "deps/native/libextra.so"],
      sideModulePaths: [
        ...expectedSageliteNativeLibraryPaths,
        "deps/native/libextra.so",
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /nativeLibraryPaths must match the Sagelite Electron runtime contract/,
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
        ...expectedSageliteMandatoryResourcePaths,
      ],
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /nativeLibraryPaths entries must also be listed in requiredResourcePaths/,
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
      nativeLibraryPaths: undefined,
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /nativeLibraryPaths must be an array/,
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
      sideModulePaths: undefined,
    }),
  );

  assert.throws(
    () => loadSageliteManifest(root),
    /sideModulePaths must be an array/,
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
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
  writeManifest(root, validManifest({ resourceRootEnvName: "PYTHONPATH" }));

  assert.throws(
    () => loadSageliteManifest(root),
    /unsupported resourceRootEnvName "PYTHONPATH"/,
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
    () => loadSageliteManifest(root),
    /sideModulePaths entry site-packages\/sage\/extra\.cpython-314-wasm32-wasi\.so does not exist/,
  );
});

withResourceRoot((root) => {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  stageRequiredTools(root);
  touch(root, "python.wasm");
  stageNativeLibraries(root);
  mkdir(root, "site-packages/sage/extra.cpython-314-wasm32-wasi.so");
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
    () => loadSageliteManifest(root),
    /sideModulePaths entry site-packages\/sage\/extra\.cpython-314-wasm32-wasi\.so must be a file/,
  );
});
