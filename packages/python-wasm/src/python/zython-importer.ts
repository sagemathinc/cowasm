import { join } from "path";
import { existsSync } from "fs";
const MODULES = ["mpmath", "sympy", "numpy"];

// Return string that gets evaluated in Python to initialize the zython importer.
export default async function initZythonImporter(): Promise<string | null> {
  // disable in main for now
  return null;
  const packages = join(__dirname, "../../..");
  const modules: { [name: string]: string } = {};
  for (const name of MODULES) {
    for (const path of [
      join(__dirname, `${name}.zip`),
      join(__dirname, `${name}.tar.xz`),
      join(packages, `py-${name}/dist/wasm/${name}.zip`),
      join(packages, `py-${name}/dist/wasm/${name}.tar.xz`),
    ]) {
      if (existsSync(path)) {
        modules[name] = path;
        break;
      }
    }
  }
  return `import zython_importer; zython_importer.install(${JSON.stringify(
    modules
  )})`;
}
