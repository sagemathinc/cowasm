import { existsSync, readFileSync } from "fs";
import { isAbsolute, join } from "path";

export const sageliteManifestName = "sagelite-electron-resources.json";

export const expectedSageliteManifest = {
  schemaVersion: 2,
  resourceKind: "cowasm-sagelite-electron-resources",
  pythonAbi: "cpython-314-wasm32-wasi",
  pythonPlatform: "wasi",
  smokeContract: "exact-arithmetic-matrix-v1",
};

export interface SageliteManifest {
  schemaVersion: number;
  resourceKind?: string;
  pythonAbi?: string;
  pythonPlatform?: string;
  smokeContract?: string;
  pythonPath: string[];
  requiredResourcePaths?: string[];
}

export function loadSageliteManifest(resourceRoot: string): SageliteManifest {
  const manifestPath = join(resourceRoot, sageliteManifestName);
  const manifest = JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as SageliteManifest;
  validateSageliteManifestContract(manifestPath, manifest);
  validateSageliteResourcePaths(manifestPath, resourceRoot, manifest);
  return manifest;
}

export function sagelitePythonPath(manifest: SageliteManifest): string {
  return manifest.pythonPath.join(":");
}

function validateSageliteManifestContract(
  manifestPath: string,
  manifest: SageliteManifest,
) {
  for (const [fieldName, expectedValue] of Object.entries(
    expectedSageliteManifest,
  )) {
    const actualValue = manifest[fieldName as keyof SageliteManifest];
    if (actualValue !== expectedValue) {
      throw new Error(
        `${manifestPath} has unsupported ${fieldName} ${JSON.stringify(
          actualValue,
        )}; expected ${JSON.stringify(expectedValue)}`,
      );
    }
  }
}

function validateSageliteResourcePaths(
  manifestPath: string,
  resourceRoot: string,
  manifest: SageliteManifest,
) {
  if (!Array.isArray(manifest.pythonPath) || manifest.pythonPath.length === 0) {
    throw new Error(`${manifestPath} must define a non-empty pythonPath array`);
  }
  validateRelativeManifestEntries(manifestPath, "pythonPath", manifest.pythonPath);
  for (const entry of manifest.pythonPath) {
    const entryPath = join(resourceRoot, entry);
    if (!existsSync(entryPath)) {
      throw new Error(`${manifestPath} pythonPath entry ${entry} does not exist`);
    }
  }
  if (manifest.requiredResourcePaths !== undefined) {
    if (!Array.isArray(manifest.requiredResourcePaths)) {
      throw new Error(`${manifestPath} requiredResourcePaths must be an array`);
    }
    validateRelativeManifestEntries(
      manifestPath,
      "requiredResourcePaths",
      manifest.requiredResourcePaths,
    );
    for (const entry of manifest.requiredResourcePaths) {
      const entryPath = join(resourceRoot, entry);
      if (!existsSync(entryPath)) {
        throw new Error(
          `${manifestPath} required resource ${entry} does not exist`,
        );
      }
    }
  }
}

function validateRelativeManifestEntries(
  manifestPath: string,
  fieldName: string,
  entries: string[],
) {
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
