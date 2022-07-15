import wasmImport from "../wasm/import-node";
import { _init, repr, exec, wasm, main as _main } from "./index";
import type { FileSystemSpec } from "@wapython/wasi";

const fs: FileSystemSpec[] = [
  {
    type: "zipfile",
    zipfile: "python/python.zip",
    mountpoint: "/usr/lib/python3.11",
  },
  { type: "dev" }, // always include this -- it is necessary for python to start when using nodejs windows, but doesn't hurt on linux/macos.
  { type: "native" }, // provides stdout,stderr natively, for now...
];

export async function init() {
  await _init("python/python.wasm", wasmImport, fs);
}

async function main() {
  await init();
  console.log(
    "Starting full python-wasm with readline support.   Type quit() to exit."
  );
  _main();
}

export { repr, exec, wasm, main };

init();
