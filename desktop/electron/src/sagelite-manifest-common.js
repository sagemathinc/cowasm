"use strict";

const { createHash } = require("crypto");
const { existsSync, readdirSync, readFileSync, statSync } = require("fs");
const { isAbsolute, join } = require("path");

const sageliteManifestName = "sagelite-electron-resources.json";

const expectedSageliteRuntimeDependencyPaths = Object.freeze([
  "deps/cypari2",
  "deps/primecountpy",
  "deps/libcxx",
  "deps/cysignals",
  "deps/memory_allocator",
  "deps/jinja2",
  "deps/platformdirs",
  "deps/gmpy2",
  "deps/numpy",
  "deps/cython",
]);

const expectedSageliteNativeLibraryPaths = Object.freeze([
  "deps/libcxx/libcxx.so",
  "deps/primecountpy/primecountpy/libcxx.so",
]);

const expectedSageliteRequiredToolPaths = Object.freeze([
  "sagelite-manifest-common.cjs",
  "sagelite-electron-smoke.cjs",
]);

const expectedSageliteMandatoryResourcePaths = Object.freeze([
  "site-packages/sage/all.py",
  "python.wasm",
  ...expectedSageliteRequiredToolPaths,
]);

const expectedSagelitePythonPath = Object.freeze([
  "site-packages",
  ...expectedSageliteRuntimeDependencyPaths,
]);

const expectedSageliteManifest = {
  schemaVersion: 12,
  resourceKind: "cowasm-sagelite-electron-resources",
  pythonAbi: "cpython-314-wasm32-wasi",
  pythonPlatform: "wasi",
  smokeContract: "exact-arithmetic-matrix-cypari2-failclosed-v3",
};

const expectedSageliteManifestFields = Object.freeze([
  "schemaVersion",
  "resourceKind",
  "pythonAbi",
  "pythonPlatform",
  "smokeContract",
  "pythonPath",
  "runtimeDependencyPaths",
  "requiredResourcePaths",
  "requiredResourceSha256",
  "nativeLibraryPaths",
  "sideModulePaths",
]);

function loadSageliteManifest(resourceRoot) {
  const manifestPath = join(resourceRoot, sageliteManifestName);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  validateSageliteManifest(resourceRoot, manifestPath, manifest);
  return manifest;
}

function sagelitePythonPath(manifest) {
  return manifest.pythonPath.join(":");
}

function sagelitePythonEnv(manifest, resourceRoot) {
  return {
    PYTHONPATH: sagelitePythonPath(manifest),
    ...(resourceRoot == null
      ? {}
      : { COWASM_SAGELITE_RESOURCE_ROOT: resourceRoot }),
  };
}

function validateSageliteManifest(resourceRoot, manifestPath, manifest) {
  validateSageliteManifestContract(manifestPath, manifest);
  validateExistingRelativeEntries(
    resourceRoot,
    manifestPath,
    "pythonPath",
    manifest.pythonPath,
    { requireDirectory: true, requireNonEmpty: true },
  );
  validateExpectedEntries(
    manifestPath,
    "pythonPath",
    manifest.pythonPath,
    expectedSagelitePythonPath,
  );
  validateExistingRelativeEntries(
    resourceRoot,
    manifestPath,
    "runtimeDependencyPaths",
    manifest.runtimeDependencyPaths,
    { requireDirectory: true, requireNonEmpty: true },
  );
  validateExpectedEntries(
    manifestPath,
    "runtimeDependencyPaths",
    manifest.runtimeDependencyPaths,
    expectedSageliteRuntimeDependencyPaths,
  );
  validatePythonPathMatchesRuntimeDependencies(
    manifestPath,
    manifest.pythonPath,
    manifest.runtimeDependencyPaths,
  );
  validateExistingRelativeEntries(
    resourceRoot,
    manifestPath,
    "requiredResourcePaths",
    manifest.requiredResourcePaths,
    { requireFile: true, requireNonEmpty: true },
  );
  validateRequiredResourceSha256(
    resourceRoot,
    manifestPath,
    manifest.requiredResourcePaths,
    manifest.requiredResourceSha256,
  );
  validateMandatoryResourcesCoveredByRequiredResources(
    manifestPath,
    manifest.requiredResourcePaths,
  );
  validateExistingRelativeEntries(
    resourceRoot,
    manifestPath,
    "nativeLibraryPaths",
    manifest.nativeLibraryPaths,
    { requireFile: true, requireNonEmpty: true },
  );
  validateExpectedEntries(
    manifestPath,
    "nativeLibraryPaths",
    manifest.nativeLibraryPaths,
    expectedSageliteNativeLibraryPaths,
  );
  validateNativeLibrariesCoveredByRequiredResources(
    manifestPath,
    manifest.nativeLibraryPaths,
    manifest.requiredResourcePaths,
  );
  validateExistingRelativeEntries(
    resourceRoot,
    manifestPath,
    "sideModulePaths",
    manifest.sideModulePaths,
    { requireFile: true, requireNonEmpty: true },
  );
  validateCompleteSideModuleInventory(
    resourceRoot,
    manifestPath,
    manifest.sideModulePaths,
  );
  validateNativeLibrariesInSideModuleInventory(
    manifestPath,
    manifest.nativeLibraryPaths,
    manifest.sideModulePaths,
  );
}

function validateSageliteManifestContract(manifestPath, manifest) {
  validateSageliteManifestFields(manifestPath, manifest);
  for (const [fieldName, expectedValue] of Object.entries(
    expectedSageliteManifest,
  )) {
    const actualValue = manifest[fieldName];
    if (actualValue !== expectedValue) {
      throw new Error(
        `${manifestPath} has unsupported ${fieldName} ${JSON.stringify(
          actualValue,
        )}; expected ${JSON.stringify(expectedValue)}`,
      );
    }
  }
}

function validateSageliteManifestFields(manifestPath, manifest) {
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`${manifestPath} must contain a Sagelite manifest object`);
  }
  const expectedFields = new Set(expectedSageliteManifestFields);
  const unexpectedFields = Object.keys(manifest).filter(
    (fieldName) => !expectedFields.has(fieldName),
  );
  if (unexpectedFields.length !== 0) {
    throw new Error(
      `${manifestPath} contains unsupported Sagelite manifest fields: ${unexpectedFields
        .sort()
        .join(", ")}`,
    );
  }
}

function validateExpectedEntries(
  manifestPath,
  fieldName,
  entries,
  expectedEntries,
) {
  if (
    entries.length !== expectedEntries.length ||
    entries.some((entry, index) => entry !== expectedEntries[index])
  ) {
    throw new Error(
      `${manifestPath} ${fieldName} must match the Sagelite Electron runtime contract`,
    );
  }
}

function validatePythonPathMatchesRuntimeDependencies(
  manifestPath,
  pythonPath,
  runtimeDependencyPaths,
) {
  const expectedPythonPath = ["site-packages", ...runtimeDependencyPaths];
  validateExpectedEntries(
    manifestPath,
    "pythonPath",
    pythonPath,
    expectedPythonPath,
  );
}

function validateExistingRelativeEntries(
  resourceRoot,
  manifestPath,
  fieldName,
  entries,
  { requireDirectory = false, requireFile = false, requireNonEmpty },
) {
  if (!Array.isArray(entries)) {
    throw new Error(`${manifestPath} ${fieldName} must be an array`);
  }
  if (requireNonEmpty && entries.length === 0) {
    throw new Error(`${manifestPath} must define a non-empty ${fieldName} array`);
  }
  validateRelativeManifestEntries(manifestPath, fieldName, entries);
  validateUniqueManifestEntries(manifestPath, fieldName, entries);
  for (const entry of entries) {
    const targetPath = join(resourceRoot, entry);
    if (!existsSync(targetPath)) {
      throw new Error(`${manifestPath} ${fieldName} entry ${entry} does not exist`);
    }
    const targetStat = statSync(targetPath);
    if (requireDirectory && !targetStat.isDirectory()) {
      throw new Error(
        `${manifestPath} ${fieldName} entry ${entry} must be a directory`,
      );
    }
    if (requireFile && !targetStat.isFile()) {
      throw new Error(`${manifestPath} ${fieldName} entry ${entry} must be a file`);
    }
  }
}

function validateRelativeManifestEntries(manifestPath, fieldName, entries) {
  for (const entry of entries) {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error(`${manifestPath} contains an invalid ${fieldName} entry`);
    }
    const parts = entry.split("/");
    if (
      isAbsolute(entry) ||
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

function validateUniqueManifestEntries(manifestPath, fieldName, entries) {
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry)) {
      throw new Error(
        `${manifestPath} ${fieldName} entries must not contain duplicates`,
      );
    }
    seen.add(entry);
  }
}

function validateRequiredResourceSha256(
  resourceRoot,
  manifestPath,
  requiredResourcePaths,
  requiredResourceSha256,
) {
  if (
    requiredResourceSha256 === null ||
    typeof requiredResourceSha256 !== "object" ||
    Array.isArray(requiredResourceSha256)
  ) {
    throw new Error(`${manifestPath} requiredResourceSha256 must be an object`);
  }
  const expectedPaths = [...requiredResourcePaths].sort();
  const actualPaths = Object.keys(requiredResourceSha256).sort();
  if (
    actualPaths.length !== expectedPaths.length ||
    actualPaths.some((entry, index) => entry !== expectedPaths[index])
  ) {
    throw new Error(
      `${manifestPath} requiredResourceSha256 keys must match requiredResourcePaths`,
    );
  }
  for (const entry of requiredResourcePaths) {
    const expectedDigest = requiredResourceSha256[entry];
    if (
      typeof expectedDigest !== "string" ||
      !/^[0-9a-f]{64}$/.test(expectedDigest)
    ) {
      throw new Error(
        `${manifestPath} requiredResourceSha256 entry ${entry} must be a lowercase sha256 hex digest`,
      );
    }
    const actualDigest = createHash("sha256")
      .update(readFileSync(join(resourceRoot, entry)))
      .digest("hex");
    if (actualDigest !== expectedDigest) {
      throw new Error(
        `${manifestPath} requiredResourceSha256 entry ${entry} does not match copied resource`,
      );
    }
  }
}

function relativePosixPath(parts) {
  return parts.join("/");
}

function collectSideModulePaths(root, current = root, pathParts = []) {
  const sideModulePaths = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    if (entry.name === "." || entry.name === "..") {
      continue;
    }
    const entryPath = join(current, entry.name);
    const entryPathParts = [...pathParts, entry.name];
    if (entry.isDirectory()) {
      sideModulePaths.push(
        ...collectSideModulePaths(root, entryPath, entryPathParts),
      );
    } else if (entry.isFile() && entry.name.endsWith(".so")) {
      sideModulePaths.push(relativePosixPath(entryPathParts));
    }
  }
  return sideModulePaths.sort();
}

function validateCompleteSideModuleInventory(
  resourceRoot,
  manifestPath,
  sideModulePaths,
) {
  const manifestSideModules = [...sideModulePaths].sort();
  const actualSideModules = collectSideModulePaths(resourceRoot);
  if (
    manifestSideModules.length !== actualSideModules.length ||
    manifestSideModules.some((entry, index) => entry !== actualSideModules[index])
  ) {
    throw new Error(
      `${manifestPath} sideModulePaths must list every copied .so resource`,
    );
  }
}

function validateNativeLibrariesInSideModuleInventory(
  manifestPath,
  nativeLibraryPaths,
  sideModulePaths,
) {
  const sideModulePathSet = new Set(sideModulePaths);
  const missingNativeLibraries = nativeLibraryPaths.filter(
    (entry) => !sideModulePathSet.has(entry),
  );
  if (missingNativeLibraries.length !== 0) {
    throw new Error(
      `${manifestPath} nativeLibraryPaths entries must also be listed in sideModulePaths`,
    );
  }
}

function validateNativeLibrariesCoveredByRequiredResources(
  manifestPath,
  nativeLibraryPaths,
  requiredResourcePaths,
) {
  const requiredResourcePathSet = new Set(requiredResourcePaths);
  const missingNativeLibraries = nativeLibraryPaths.filter(
    (entry) => !requiredResourcePathSet.has(entry),
  );
  if (missingNativeLibraries.length !== 0) {
    throw new Error(
      `${manifestPath} nativeLibraryPaths entries must also be listed in requiredResourcePaths`,
    );
  }
}

function validateMandatoryResourcesCoveredByRequiredResources(
  manifestPath,
  requiredResourcePaths,
) {
  const requiredResourcePathSet = new Set(requiredResourcePaths);
  const missingResourcePaths = expectedSageliteMandatoryResourcePaths.filter(
    (entry) => !requiredResourcePathSet.has(entry),
  );
  if (missingResourcePaths.length !== 0) {
    throw new Error(
      `${manifestPath} requiredResourcePaths must include the Sagelite Electron mandatory resources`,
    );
  }
}

module.exports = {
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
  validateRelativeManifestEntries,
  validateRequiredResourceSha256,
  validateSageliteManifest,
  validateSageliteManifestContract,
  validateSageliteManifestFields,
  validateUniqueManifestEntries,
};
