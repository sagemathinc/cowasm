"use strict";

const { existsSync } = require("fs");
const { join, resolve } = require("path");
const {
  expectedSageliteManifest,
  loadSageliteManifest,
  sageliteManifestName,
} = require("./src/sagelite-manifest-common");

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

  if (!existsSync(manifestPath)) {
    throw new Error(`Sagelite Electron resource manifest does not exist: ${manifestPath}`);
  }

  loadSageliteManifest(resourceRoot);
  return [resourceRoot];
}

module.exports = {
  defaultSageliteResourceRoot,
  expectedSageliteManifest,
  resolveSageliteExtraResources,
  sageliteManifestName,
};
