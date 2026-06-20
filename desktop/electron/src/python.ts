import debug from "debug";
import { existsSync } from "fs";
import { resolve, join } from "path";
import { asyncPython } from "python-wasm";
import {
  loadSageliteManifest,
  sageliteManifestName,
  sagelitePythonEnv,
} from "./sagelite-manifest";

// TODO: will get exported in future version of python-wasm.
type PythonWasmAsync = Awaited<ReturnType<typeof asyncPython>>;

const log = debug("python");

let python: PythonWasmAsync | null = null;

export interface SageliteResourceRootOptions {
  mainDir?: string;
  env?: NodeJS.ProcessEnv;
  resourcesPath?: string;
}

export interface SageliteRuntime {
  resourceRoot: string;
  env: Record<string, string>;
}

export function candidateSageliteResourceRoots({
  mainDir = __dirname,
  env = process.env,
  resourcesPath = process.resourcesPath,
}: SageliteResourceRootOptions = {}): string[] {
  const roots: string[] = [];
  if (env.COWASM_SAGELITE_ELECTRON_RESOURCES) {
    roots.push(resolve(env.COWASM_SAGELITE_ELECTRON_RESOURCES));
  }
  if (resourcesPath) {
    roots.push(join(resourcesPath, "electron-resources"));
  }
  roots.push(
    resolve(
      mainDir,
      "../../../../sagemath/sagelite/dist/wasi-sdk/electron-resources",
    ),
  );
  return roots;
}

export function findSageliteRuntime(
  options: SageliteResourceRootOptions = {},
): SageliteRuntime | null {
  const env = options.env ?? process.env;
  const explicitResourceRoot = env.COWASM_SAGELITE_ELECTRON_RESOURCES
    ? resolve(env.COWASM_SAGELITE_ELECTRON_RESOURCES)
    : null;

  for (const resourceRoot of candidateSageliteResourceRoots(options)) {
    const manifestPath = join(resourceRoot, sageliteManifestName);
    if (!existsSync(manifestPath)) {
      if (resourceRoot === explicitResourceRoot) {
        if (!existsSync(resourceRoot)) {
          throw new Error(
            `Sagelite Electron resources do not exist: ${resourceRoot}`,
          );
        }
        throw new Error(
          `Sagelite Electron resource manifest does not exist: ${manifestPath}`,
        );
      }
      continue;
    }
    const manifest = loadSageliteManifest(resourceRoot);
    return { resourceRoot, env: sagelitePythonEnv(manifest) };
  }
  return null;
}

function sageliteEnv(): Record<string, string> | undefined {
  const runtime = findSageliteRuntime();
  if (runtime == null) {
    log("Sagelite resources not found; starting base Python runtime");
    return undefined;
  }
  process.chdir(runtime.resourceRoot);
  log(`using Sagelite resources from ${runtime.resourceRoot}`);
  return runtime.env;
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
