import wasmImport from "../wasm/import-browser";
import { _init, repr, exec, wasm } from "./index";
import type { FileSystemSpec } from "@wapython/wasi";

const fs = [
  {
    type: "zipfile",
    zipfile: "python/python311.zip",
    mountpoint: "/pythonhome/lib/python3.11",
  },
  { type: "dev" },
] as FileSystemSpec[];

export async function init() {
  await _init(wasmImport, fs);
}

export { repr, exec, wasm };

init();
