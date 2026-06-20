"use strict";

const { existsSync, readFileSync } = require("fs");
const { isAbsolute, join } = require("path");

const sageliteManifestName = "sagelite-electron-resources.json";

const expectedSageliteManifest = {
  schemaVersion: 3,
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
    { requireNonEmpty: true },
  );
  if (manifest.requiredResourcePaths !== undefined) {
    validateExistingRelativeEntries(
      resourceRoot,
      manifestPath,
      "requiredResourcePaths",
      manifest.requiredResourcePaths,
      { requireNonEmpty: false },
    );
  }
  if (manifest.nativeLibraryPaths !== undefined) {
    validateExistingRelativeEntries(
      resourceRoot,
      manifestPath,
      "nativeLibraryPaths",
      manifest.nativeLibraryPaths,
      { requireNonEmpty: true },
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
  { requireNonEmpty },
) {
  if (!Array.isArray(entries)) {
    throw new Error(`${manifestPath} ${fieldName} must be an array`);
  }
  if (requireNonEmpty && entries.length === 0) {
    throw new Error(`${manifestPath} must define a non-empty ${fieldName} array`);
  }
  validateRelativeManifestEntries(manifestPath, fieldName, entries);
  for (const entry of entries) {
    if (!existsSync(join(resourceRoot, entry))) {
      throw new Error(`${manifestPath} ${fieldName} entry ${entry} does not exist`);
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
