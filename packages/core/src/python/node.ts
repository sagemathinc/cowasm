import wasmImport from "../wasm/import-node";
import { _init, repr, exec, wasm } from "./index";
import type { FileSystemSpec } from "@wapython/wasi";

const fs = [
  {
    type: "zipfile",
    zipfile: "python/python311.zip",
    mountpoint: "/pythonhome/lib/python3.11",
  },
  { type: "dev" }, // always include this -- it is necessary for python to start when using nodejs windows, but doesn't hurt on linux/macos.
  { type: "native" }, // provides stdout,stderr natively, for now...
] as FileSystemSpec[];

export async function init() {
  await _init("python/python.wasm", wasmImport, fs);
}

export { repr, exec, wasm };

init();
