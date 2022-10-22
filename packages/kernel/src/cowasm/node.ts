import type { WasmInstanceAsync, WasmInstanceSync } from "../wasm/types";
export { WasmInstanceAsync, WasmInstanceSync };
import wasmAsyncImport from "../wasm/import-node";
import wasmSyncImport from "../wasm/worker/node";
import { createSyncKernel, createAsyncKernel } from "./kernel";
import { join } from "path";
import { existsSync } from "fs";
import type { FileSystemSpec } from "wasi-js";
export { FileSystemSpec };

const COWASM_WASM = "cowasm.wasm";

// Our tiny termcap file only has one entry, which is for xterm
// so that's all we give you, even if you have a different terminal.
const TERM = "xterm-256color";

interface Options {
  env?: { [name: string]: string }; // extra env vars.
  fs?: FileSystemSpec[];
}

function getOptions(wasmImport, opts?: Options) {
  const path = __dirname;

  const env = {
    ...process.env,
    TERM,
    TERMCAP: join(path, "..", "termcap"),
    PS1: "(CoWasm) sh$ ",
    ...opts?.env,
  };
  //PS1: '(CoWasm) sh: (pwd | sed "s|^$HOME|~|")$ '
  if (!existsSync(env.TERMCAP)) {
    console.warn(`TERMCAP=${env.TERMCAP} is missing`);
  }

  return {
    programName: process.env.PROGRAM_NAME, // real name or made up name
    wasmSource: join(path, COWASM_WASM),
    wasmImport,
    fs: opts?.fs ?? ([{ type: "native" }] as FileSystemSpec[]),
    env,
  };
}

export async function syncKernel(opts?: Options): Promise<WasmInstanceSync> {
  return await createSyncKernel(getOptions(wasmSyncImport, opts));
}

export async function asyncKernel(opts?: Options): Promise<WasmInstanceAsync> {
  return await createAsyncKernel(getOptions(wasmAsyncImport, opts));
}
