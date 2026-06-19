import debug from "debug";
import { existsSync, readFileSync } from "fs";
import { resolve, join, isAbsolute } from "path";
import { asyncPython } from "python-wasm";

// TODO: will get exported in future version of python-wasm.
type PythonWasmAsync = Awaited<ReturnType<typeof asyncPython>>;

const log = debug("python");
const sageliteManifestName = "sagelite-electron-resources.json";

let python: PythonWasmAsync | null = null;

interface SageliteManifest {
  schemaVersion: number;
  pythonPath: string[];
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
  if (manifest.schemaVersion !== 1) {
    throw new Error(
      `${manifestPath} has unsupported schemaVersion ${manifest.schemaVersion}`,
    );
  }
  if (!Array.isArray(manifest.pythonPath) || manifest.pythonPath.length === 0) {
    throw new Error(`${manifestPath} must define a non-empty pythonPath array`);
  }
  for (const entry of manifest.pythonPath) {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error(`${manifestPath} contains an invalid pythonPath entry`);
    }
    if (isAbsolute(entry) || entry.includes(":")) {
      throw new Error(`${manifestPath} pythonPath entries must be relative`);
    }
  }
  return manifest;
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
