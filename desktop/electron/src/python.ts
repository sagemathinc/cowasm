import debug from "debug";
import { existsSync, readFileSync } from "fs";
import { resolve, join, isAbsolute } from "path";
import { asyncPython } from "python-wasm";

// TODO: will get exported in future version of python-wasm.
type PythonWasmAsync = Awaited<ReturnType<typeof asyncPython>>;

const log = debug("python");
const sageliteManifestName = "sagelite-electron-resources.json";
const expectedSageliteManifest = {
  schemaVersion: 2,
  resourceKind: "cowasm-sagelite-electron-resources",
  pythonAbi: "cpython-314-wasm32-wasi",
  pythonPlatform: "wasi",
  smokeContract: "exact-arithmetic-matrix-v1",
};

let python: PythonWasmAsync | null = null;

interface SageliteManifest {
  schemaVersion: number;
  resourceKind?: string;
  pythonAbi?: string;
  pythonPlatform?: string;
  smokeContract?: string;
  pythonPath: string[];
  requiredResourcePaths?: string[];
}

function candidateSageliteResourceRoots(): string[] {
  const roots: string[] = [];
  if (process.env.COWASM_SAGELITE_ELECTRON_RESOURCES) {
    roots.push(resolve(process.env.COWASM_SAGELITE_ELECTRON_RESOURCES));
  }
  if (process.resourcesPath) {
    roots.push(join(process.resourcesPath, "electron-resources"));
  }
  roots.push(
    resolve(
      __dirname,
      "../../../../sagemath/sagelite/dist/wasi-sdk/electron-resources",
    ),
  );
  return roots;
}

function readSageliteManifest(resourceRoot: string): SageliteManifest {
  const manifestPath = join(resourceRoot, sageliteManifestName);
  const manifest = JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as SageliteManifest;
  validateSageliteManifestContract(manifestPath, manifest);
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
  return manifest;
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

function sageliteEnv(): Record<string, string> | undefined {
  for (const resourceRoot of candidateSageliteResourceRoots()) {
    const manifestPath = join(resourceRoot, sageliteManifestName);
    if (!existsSync(manifestPath)) {
      continue;
    }
    const manifest = readSageliteManifest(resourceRoot);
    process.chdir(resourceRoot);
    const pythonPath = manifest.pythonPath.join(":");
    log(`using Sagelite resources from ${resourceRoot}`);
    return { PYTHONPATH: pythonPath };
  }
  log("Sagelite resources not found; starting base Python runtime");
  return undefined;
}

// todo: reuseInFlight...?
export default async function getPython() {
  if (python == null) {
    // Very important to explicitly set the fs, since that's not the default yet.
    python = await asyncPython({
      noStdio: true,
      fs: "everything",
      env: sageliteEnv(),
    });
  }
  return python;
}

export function pythonTerminate() {
  if (python == null) return;
  const kernel = python.kernel;
  python = null;
  kernel.terminate();
}
