import { join } from "path";
import { existsSync } from "fs";
import { readdir } from "fs/promises";

const modulePath = join(__dirname, "py");

// Return string that gets evaluated in Python to initialize the zython importer.
export default async function initZythonImporter(): Promise<string> {
  const modules: { [name: string]: string } = {};
  if (!existsSync(modulePath)) return "";
  for (const name of await readdir(modulePath)) {
    modules[name.split(".")[0]] = join(modulePath, name);
  }
  return `import zython_importer; zython_importer.install(${JSON.stringify(
    modules
  )})`;
}
