#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { createHash } = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const pythonModule = require("../dist/main/python");
const {
  candidateSageliteResourceRoots,
  findSageliteRuntime,
  pythonTerminate,
  withProcessCwd,
} = pythonModule;
const getPython = pythonModule.default;
const {
  expectedSageliteManifest,
  expectedSageliteMandatoryResourcePaths,
  expectedSageliteNativeLibraryPaths,
  expectedSagelitePythonPath,
  expectedSageliteRequiredToolPaths,
  expectedSageliteRuntimeDependencyPaths,
  sageliteManifestName,
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

function withTempDir(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cowasm-sagelite-runtime-"));
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function withTempDirAsync(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cowasm-sagelite-runtime-"));
  try {
    return await fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function validManifest(overrides = {}) {
  return {
    ...expectedSageliteManifest,
    sageliteSourceRevision: "875c1cc836d",
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

function stageValidResources(root) {
  stagePythonPath(root);
  stageSageEntrypoints(root);
  touch(root, "python.wasm");
  stageRequiredTools(root);
  stageNativeLibraries(root);
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
      env: {
        PYTHONPATH: expectedSagelitePythonPath.join(":"),
        COWASM_SAGELITE_RESOURCE_ROOT: explicitRoot,
      },
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
      env: {
        PYTHONPATH: expectedSagelitePythonPath.join(":"),
        COWASM_SAGELITE_RESOURCE_ROOT: packagedRoot,
      },
    },
  );
});

withTempDir((root) => {
  const explicitRoot = path.join(root, "explicit");
  const packagedRoot = path.join(root, "resources", "electron-resources");
  stageValidResources(packagedRoot);

  assert.throws(
    () =>
      findSageliteRuntime({
        env: { COWASM_SAGELITE_ELECTRON_RESOURCES: explicitRoot },
        resourcesPath: path.join(root, "resources"),
      }),
    /Sagelite Electron resources do not exist/,
  );
});

withTempDir((root) => {
  const explicitRoot = path.join(root, "explicit");
  const packagedRoot = path.join(root, "resources", "electron-resources");
  fs.mkdirSync(explicitRoot, { recursive: true });
  stageValidResources(packagedRoot);

  assert.throws(
    () =>
      findSageliteRuntime({
        env: { COWASM_SAGELITE_ELECTRON_RESOURCES: explicitRoot },
        resourcesPath: path.join(root, "resources"),
      }),
    /Sagelite Electron resource manifest does not exist/,
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

withTempDir((root) => {
  const packagedRoot = path.join(root, "resources", "electron-resources");
  const defaultRoot = path.join(
    root,
    "sagemath",
    "sagelite",
    "dist",
    "wasi-sdk",
    "electron-resources",
  );
  fs.mkdirSync(packagedRoot, { recursive: true });
  stageValidResources(defaultRoot);

  assert.throws(
    () =>
      findSageliteRuntime({
        mainDir: path.join(root, "app", "dist", "main"),
        env: {},
        resourcesPath: path.join(root, "resources"),
      }),
    /Sagelite Electron resource manifest does not exist/,
  );
});

withTempDir((root) => {
  assert.throws(
    () =>
      findSageliteRuntime({
        mainDir: path.join(root, "app", "dist", "main"),
        env: { COWASM_REQUIRE_SAGELITE_ELECTRON_RESOURCES: "1" },
        resourcesPath: undefined,
      }),
    /Required Sagelite Electron resources were not found/,
  );
});

(async () => {
  await withTempDirAsync(async (root) => {
    const originalCwd = process.cwd();
    const resourceRoot = path.join(root, "resources");
    fs.mkdirSync(resourceRoot, { recursive: true });

    const result = await withProcessCwd(resourceRoot, async () => {
      assert.strictEqual(process.cwd(), resourceRoot);
      return "started";
    });

    assert.strictEqual(result, "started");
    assert.strictEqual(process.cwd(), originalCwd);
  });

  await withTempDirAsync(async (root) => {
    const originalCwd = process.cwd();
    const resourceRoot = path.join(root, "resources");
    fs.mkdirSync(resourceRoot, { recursive: true });

    await assert.rejects(
      () =>
        withProcessCwd(resourceRoot, async () => {
          assert.strictEqual(process.cwd(), resourceRoot);
          throw new Error("startup failed");
        }),
      /startup failed/,
    );

    assert.strictEqual(process.cwd(), originalCwd);
  });

  await withTempDirAsync(async (root) => {
    pythonTerminate();
    const originalCwd = process.cwd();
    const originalResourceEnv = process.env.COWASM_SAGELITE_ELECTRON_RESOURCES;
    const resourceRoot = path.join(root, "resources");
    const modulePath = path.join(
      resourceRoot,
      "site-packages",
      "electron_probe.py",
    );

    fs.mkdirSync(path.dirname(modulePath), { recursive: true });
    stagePythonPath(resourceRoot);
    stageSageEntrypoints(resourceRoot);
    touch(resourceRoot, "python.wasm");
    stageRequiredTools(resourceRoot);
    stageNativeLibraries(resourceRoot);
    fs.writeFileSync(modulePath, "VALUE = 'resource-root'\n");
    writeManifest(
      resourceRoot,
      validManifest({
        requiredResourcePaths: [
          ...expectedSageliteMandatoryResourcePaths,
          "site-packages/electron_probe.py",
          ...expectedSageliteNativeLibraryPaths,
        ],
      }),
    );

    process.env.COWASM_SAGELITE_ELECTRON_RESOURCES = resourceRoot;
    try {
      const python = await getPython();
      assert.strictEqual(process.cwd(), originalCwd);
      await python.exec(`
import os
import electron_probe

assert os.getcwd() == ${JSON.stringify(resourceRoot)}
assert os.environ['COWASM_SAGELITE_RESOURCE_ROOT'] == ${JSON.stringify(resourceRoot)}
assert electron_probe.VALUE == 'resource-root'
`);
    } finally {
      pythonTerminate();
      if (originalResourceEnv === undefined) {
        delete process.env.COWASM_SAGELITE_ELECTRON_RESOURCES;
      } else {
        process.env.COWASM_SAGELITE_ELECTRON_RESOURCES = originalResourceEnv;
      }
    }
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
