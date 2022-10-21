import type { WasmInstanceAsync, WasmInstanceSync } from "../wasm/types";
export { WasmInstanceAsync, WasmInstanceSync };
import wasmImportAsync from "../wasm/import-node";
import wasmImportSync from "../wasm/worker/node";
import { createSyncKernel, createAsyncKernel } from "./kernel";
import { join } from "path";
import { existsSync } from "fs";
import type { FileSystemSpec } from "wasi-js";

const COWASM_WASM = "cowasm.wasm";

// Our tiny termcap file only has one entry, which is for xterm
// so that's all we give you, even if you have a different terminal.
const TERM = "xterm-256color";

function getOptions(wasmImport) {
  const path = __dirname;

  const env = {
    ...process.env,
    TERM,
    TERMCAP: join(path, "..", "termcap"),
    PS1: "(CoWasm) sh$ ",
  };
  //PS1: '(CoWasm) sh: (pwd | sed "s|^$HOME|~|")$ '
  if (!existsSync(env.TERMCAP)) {
    console.warn(`TERMCAP=${env.TERMCAP} is missing`);
  }

  return {
    programName: process.env.PROGRAM_NAME, // real name or made up name
    wasmSource: join(path, COWASM_WASM),
    wasmImport,
    fs: [{ type: "native" }] as FileSystemSpec[],
    env,
  };
}

export async function syncKernel(): Promise<WasmInstanceSync> {
  return await createSyncKernel(getOptions(wasmImportSync));
}

export async function asyncKernel(): Promise<WasmInstanceAsync> {
  return await createAsyncKernel(getOptions(wasmImportAsync));
}
