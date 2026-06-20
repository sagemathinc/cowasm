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
  const candidateRoots = candidateSageliteResourceRoots(options);

  for (const resourceRoot of candidateRoots) {
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
      if (existsSync(resourceRoot)) {
        throw new Error(
          `Sagelite Electron resource manifest does not exist: ${manifestPath}`,
        );
      }
      continue;
    }
    const manifest = loadSageliteManifest(resourceRoot);
    return { resourceRoot, env: sagelitePythonEnv(manifest, resourceRoot) };
  }
  if (env.COWASM_REQUIRE_SAGELITE_ELECTRON_RESOURCES === "1") {
    throw new Error(
      `Required Sagelite Electron resources were not found; checked: ${candidateRoots.join(
        ", ",
      )}`,
    );
  }
  return null;
}

export async function withProcessCwd<T>(
  cwd: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previousCwd = process.cwd();
  process.chdir(cwd);
  try {
    return await fn();
  } finally {
    process.chdir(previousCwd);
  }
}

// todo: reuseInFlight...?
export default async function getPython() {
  if (python == null) {
    const runtime = findSageliteRuntime();
    // Very important to explicitly set the fs, since that's not the default yet.
    const options = {
      noStdio: true,
      fs: "everything" as const,
      ...(runtime == null ? {} : { env: runtime.env }),
    };
    if (runtime == null) {
      log("Sagelite resources not found; starting base Python runtime");
      python = await asyncPython(options);
    } else {
      log(`using Sagelite resources from ${runtime.resourceRoot}`);
      python = await withProcessCwd(runtime.resourceRoot, () =>
        asyncPython(options),
      );
    }
  }
  return python;
}

export function pythonTerminate() {
  if (python == null) return;
  const kernel = python.kernel;
  python = null;
  kernel.terminate();
}
