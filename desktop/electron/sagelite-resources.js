"use strict";

const { existsSync, readdirSync, renameSync } = require("fs");
const { basename, join, resolve } = require("path");
const {
  expectedSageliteManifest,
  expectedSagelitePythonPath,
  expectedSageliteRuntimeDependencyPaths,
  loadSageliteManifest,
  sageliteManifestName,
} = require("./src/sagelite-manifest-common");

const packagedSageliteResourceDirname = "electron-resources";

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

function packagerResourceParentCandidates(stagingPath, platform) {
  const candidates = [join(stagingPath, "resources")];
  if (platform === "darwin" || platform === "mas") {
    for (const entry of readdirSync(stagingPath, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.endsWith(".app")) {
        candidates.push(join(stagingPath, entry.name, "Contents", "Resources"));
      }
    }
  }
  return candidates;
}

function copiedSageliteResourcePaths(resourceRoot, stagingPath, platform) {
  const copiedDirname = basename(resourceRoot);
  for (const parent of packagerResourceParentCandidates(stagingPath, platform)) {
    const copiedPath = join(parent, copiedDirname);
    if (existsSync(copiedPath)) {
      return {
        copiedPath,
        packagedPath: join(parent, packagedSageliteResourceDirname),
      };
    }
  }

  const defaultParent = packagerResourceParentCandidates(stagingPath, platform)[0];
  return {
    copiedPath: join(defaultParent, copiedDirname),
    packagedPath: join(defaultParent, packagedSageliteResourceDirname),
  };
}

function normalizeCopiedSageliteExtraResource(
  resourceRoot,
  stagingPath,
  platform = process.platform,
) {
  const { copiedPath, packagedPath } = copiedSageliteResourcePaths(
    resourceRoot,
    stagingPath,
    platform,
  );

  if (resolve(copiedPath) === resolve(packagedPath)) {
    validatePackagedSageliteExtraResource(packagedPath);
    return;
  }
  if (!existsSync(copiedPath)) {
    throw new Error(
      `Sagelite copied Electron resources do not exist: ${copiedPath}`,
    );
  }
  if (existsSync(packagedPath)) {
    throw new Error(
      `Sagelite packaged Electron resources already exist: ${packagedPath}`,
    );
  }
  renameSync(copiedPath, packagedPath);
  validatePackagedSageliteExtraResource(packagedPath);
}

function validatePackagedSageliteExtraResource(packagedPath) {
  const manifestPath = join(packagedPath, sageliteManifestName);
  if (!existsSync(packagedPath)) {
    throw new Error(
      `Sagelite packaged Electron resources do not exist: ${packagedPath}`,
    );
  }
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Sagelite Electron resource manifest does not exist: ${manifestPath}`,
    );
  }
  loadSageliteManifest(packagedPath);
}

function afterCopySageliteExtraResources(baseDir, env = process.env) {
  const resourceRoots = resolveSageliteExtraResources(baseDir, env);
  return (stagingPath, electronVersion, platform, arch, done) => {
    try {
      for (const resourceRoot of resourceRoots) {
        normalizeCopiedSageliteExtraResource(resourceRoot, stagingPath, platform);
      }
      done();
    } catch (err) {
      done(err);
    }
  };
}

module.exports = {
  afterCopySageliteExtraResources,
  copiedSageliteResourcePaths,
  defaultSageliteResourceRoot,
  expectedSageliteManifest,
  expectedSagelitePythonPath,
  expectedSageliteRuntimeDependencyPaths,
  normalizeCopiedSageliteExtraResource,
  packagerResourceParentCandidates,
  packagedSageliteResourceDirname,
  resolveSageliteExtraResources,
  sageliteManifestName,
  validatePackagedSageliteExtraResource,
};
