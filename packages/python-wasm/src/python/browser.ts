import wasmImport from "../wasm/import-browser";
import { _init, repr, exec, wasm } from "./index";
import type { FileSystemSpec } from "@wapython/wasi";
import wasmUrl from "./python.wasm";
import zipUrl from "./python.zip";

export async function init() {
  const fs: FileSystemSpec[] = [
    {
      type: "zipurl",
      zipurl: zipUrl,
      mountpoint: "/usr/lib/python3.11",
    },
    { type: "dev" },
  ];

  await _init(wasmUrl, wasmImport as any, fs); // TODO - temporary!!!
  python.wasm = wasm;
}

const python = { repr, exec, wasm, init };
export default python;
