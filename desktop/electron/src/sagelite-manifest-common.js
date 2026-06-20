"use strict";

const { existsSync, readdirSync, readFileSync, statSync } = require("fs");
const { isAbsolute, join } = require("path");

const sageliteManifestName = "sagelite-electron-resources.json";

const expectedSageliteManifest = {
  schemaVersion: 4,
  resourceKind: "cowasm-sagelite-electron-resources",
  pythonAbi: "cpython-314-wasm32-wasi",
  pythonPlatform: "wasi",
  smokeContract: "exact-arithmetic-matrix-v1",
};

function loadSageliteManifest(resourceRoot) {
  const manifestPath = join(resourceRoot, sageliteManifestName);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  validateSageliteManifest(resourceRoot, manifestPath, manifest);
  return manifest;
}

function sagelitePythonPath(manifest) {
  return manifest.pythonPath.join(":");
}

function sagelitePythonEnv(manifest) {
  return { PYTHONPATH: sagelitePythonPath(manifest) };
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
  if (manifest.requiredResourcePaths !== undefined) {
    validateExistingRelativeEntries(
      resourceRoot,
      manifestPath,
      "requiredResourcePaths",
      manifest.requiredResourcePaths,
      { requireFile: true, requireNonEmpty: false },
    );
  }
  if (manifest.nativeLibraryPaths !== undefined) {
    validateExistingRelativeEntries(
      resourceRoot,
      manifestPath,
      "nativeLibraryPaths",
      manifest.nativeLibraryPaths,
      { requireFile: true, requireNonEmpty: true },
    );
  }
  if (manifest.sideModulePaths !== undefined) {
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
  }
  if (manifest.nativeLibraryPaths !== undefined) {
    if (manifest.sideModulePaths === undefined) {
      throw new Error(
        `${manifestPath} nativeLibraryPaths requires sideModulePaths`,
      );
    }
    validateNativeLibrariesInSideModuleInventory(
      manifestPath,
      manifest.nativeLibraryPaths,
      manifest.sideModulePaths,
    );
  }
}

function validateSageliteManifestContract(manifestPath, manifest) {
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

module.exports = {
  expectedSageliteManifest,
  loadSageliteManifest,
  sageliteManifestName,
  sagelitePythonEnv,
  sagelitePythonPath,
  validateRelativeManifestEntries,
  validateSageliteManifest,
  validateSageliteManifestContract,
};
