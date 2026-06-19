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
}

export function loadSageliteManifest(resourceRoot: string): SageliteManifest {
  return common.loadSageliteManifest(resourceRoot) as SageliteManifest;
}

export function sagelitePythonPath(manifest: SageliteManifest): string {
  return common.sagelitePythonPath(manifest);
}
