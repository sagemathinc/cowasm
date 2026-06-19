"use strict";

const { existsSync, readFileSync } = require("fs");
const { isAbsolute, join, resolve } = require("path");

const sageliteManifestName = "sagelite-electron-resources.json";
const expectedSageliteManifest = {
  schemaVersion: 2,
  resourceKind: "cowasm-sagelite-electron-resources",
  pythonAbi: "cpython-314-wasm32-wasi",
  pythonPlatform: "wasi",
  smokeContract: "exact-arithmetic-matrix-v1",
};

function defaultSageliteResourceRoot(baseDir) {
  return resolve(
    baseDir,
    "../../sagemath/sagelite/dist/wasi-sdk/electron-resources",
  );
}

function sageliteResourceRoot(baseDir, env = process.env) {
  if (env.COWASM_SAGELITE_ELECTRON_RESOURCES) {
    return resolve(env.COWASM_SAGELITE_ELECTRON_RESOURCES);
  }
  return defaultSageliteResourceRoot(baseDir);
}

function requireSageliteResources(env = process.env) {
  return env.COWASM_REQUIRE_SAGELITE_ELECTRON_RESOURCES === "1";
}

function sageliteResourcesAreExplicit(env = process.env) {
  return Boolean(env.COWASM_SAGELITE_ELECTRON_RESOURCES);
}

function resolveSageliteExtraResources(baseDir, env = process.env) {
  const resourceRoot = sageliteResourceRoot(baseDir, env);
  const manifestPath = join(resourceRoot, sageliteManifestName);

  if (!existsSync(resourceRoot)) {
    if (requireSageliteResources(env) || sageliteResourcesAreExplicit(env)) {
      throw new Error(`Sagelite Electron resources do not exist: ${resourceRoot}`);
    }
    return [];
  }

  validateSageliteManifest(resourceRoot, manifestPath);
  return [resourceRoot];
}

function validateSageliteManifest(resourceRoot, manifestPath) {
  if (!existsSync(manifestPath)) {
    throw new Error(`Sagelite Electron resource manifest does not exist: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
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

  validateExistingRelativeEntries(resourceRoot, manifestPath, "pythonPath", manifest.pythonPath);
  if (manifest.requiredResourcePaths !== undefined) {
    validateExistingRelativeEntries(
      resourceRoot,
      manifestPath,
      "requiredResourcePaths",
      manifest.requiredResourcePaths,
    );
  }
}

function validateExistingRelativeEntries(
  resourceRoot,
  manifestPath,
  fieldName,
  entries,
) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`${manifestPath} must define a non-empty ${fieldName} array`);
  }
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
    if (!existsSync(join(resourceRoot, entry))) {
      throw new Error(`${manifestPath} ${fieldName} entry ${entry} does not exist`);
    }
  }
}

module.exports = {
  defaultSageliteResourceRoot,
  expectedSageliteManifest,
  resolveSageliteExtraResources,
  sageliteManifestName,
};
