import common = require("./sagelite-manifest-common");

export const sageliteManifestName: string = common.sageliteManifestName;

export const expectedSageliteManifest = common.expectedSageliteManifest;
export const expectedSagelitePythonPath: readonly string[] =
  common.expectedSagelitePythonPath;
export const expectedSageliteRuntimeDependencyPaths: readonly string[] =
  common.expectedSageliteRuntimeDependencyPaths;
export const expectedSageliteNativeLibraryPaths: readonly string[] =
  common.expectedSageliteNativeLibraryPaths;
export const expectedSageliteRequiredToolPaths: readonly string[] =
  common.expectedSageliteRequiredToolPaths;

export interface SageliteManifest {
  schemaVersion: number;
  resourceKind?: string;
  pythonAbi?: string;
  pythonPlatform?: string;
  smokeContract?: string;
  pythonPath: string[];
  runtimeDependencyPaths: string[];
  requiredResourcePaths: string[];
  requiredResourceSha256: Record<string, string>;
  nativeLibraryPaths: string[];
  sideModulePaths: string[];
}

export interface SagelitePythonEnv extends Record<string, string> {
  PYTHONPATH: string;
  COWASM_SAGELITE_RESOURCE_ROOT?: string;
}

export function loadSageliteManifest(resourceRoot: string): SageliteManifest {
  return common.loadSageliteManifest(resourceRoot) as SageliteManifest;
}

export function sagelitePythonEnv(
  manifest: SageliteManifest,
  resourceRoot?: string,
): SagelitePythonEnv {
  return common.sagelitePythonEnv(manifest, resourceRoot) as SagelitePythonEnv;
}

export function sagelitePythonPath(manifest: SageliteManifest): string {
  return common.sagelitePythonPath(manifest);
}
