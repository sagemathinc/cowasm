import common = require("./sagelite-manifest-common");

export const sageliteManifestName: string = common.sageliteManifestName;

export const expectedSageliteManifest = common.expectedSageliteManifest;

export interface SageliteManifest {
  schemaVersion: number;
  resourceKind?: string;
  pythonAbi?: string;
  pythonPlatform?: string;
  smokeContract?: string;
  pythonPath: string[];
  requiredResourcePaths?: string[];
  nativeLibraryPaths?: string[];
}

export interface SagelitePythonEnv extends Record<string, string> {
  PYTHONPATH: string;
}

export function loadSageliteManifest(resourceRoot: string): SageliteManifest {
  return common.loadSageliteManifest(resourceRoot) as SageliteManifest;
}

export function sagelitePythonEnv(
  manifest: SageliteManifest,
): SagelitePythonEnv {
  return common.sagelitePythonEnv(manifest) as SagelitePythonEnv;
}

export function sagelitePythonPath(manifest: SageliteManifest): string {
  return common.sagelitePythonPath(manifest);
}
