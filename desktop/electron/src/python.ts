import debug from "debug";
import { existsSync } from "fs";
import { resolve, join } from "path";
import { asyncPython } from "python-wasm";
import {
  loadSageliteManifest,
  sageliteManifestName,
  sagelitePythonPath,
} from "./sagelite-manifest";

// TODO: will get exported in future version of python-wasm.
type PythonWasmAsync = Awaited<ReturnType<typeof asyncPython>>;

const log = debug("python");

let python: PythonWasmAsync | null = null;

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

function sageliteEnv(): Record<string, string> | undefined {
  for (const resourceRoot of candidateSageliteResourceRoots()) {
    const manifestPath = join(resourceRoot, sageliteManifestName);
    if (!existsSync(manifestPath)) {
      continue;
    }
    const manifest = loadSageliteManifest(resourceRoot);
    process.chdir(resourceRoot);
    const pythonPath = sagelitePythonPath(manifest);
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
