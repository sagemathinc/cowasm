import wasmImport from "../wasm/import-browser";
import { _init, repr, exec, wasm } from "./index";
import type { FileSystemSpec } from "@wapython/wasi";

export async function init({
  zipUrl,
  wasmUrl,
}: {
  zipUrl: string;
  wasmUrl: string;
}) {
  const fs = [
    {
      type: "zipurl",
      url: zipUrl,
      mountpoint: "/pythonhome/lib/python3.11",
    },
    { type: "dev" },
  ] as FileSystemSpec[];

  await _init(wasmUrl, wasmImport, fs);
}

export { repr, exec, wasm };
