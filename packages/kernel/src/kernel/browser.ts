import type { WasmInstanceAsync, WasmInstanceSync } from "../wasm/types";
import wasmImportAsync from "../wasm/import-browser";
import wasmImportSync from "../wasm/worker/browser";
import { createSyncKernel, createAsyncKernel } from "./kernel";
import type { FileSystemSpec } from "wasi-js";

import wasmUrl from "./kernel.wasm";

interface Options {
  env?: { [name: string]: string }; // extra env vars.
  fs?: FileSystemSpec[];
}

function getOptions(wasmImport, opts?: Options) {
  const fs: FileSystemSpec[] = opts?.fs ?? [{ type: "dev" }];
  const env = {
    TERMCAP: "/usr/lib/python3.11/termcap",
    TERM: "xterm-256color",
    PS1: "(cowasm)$ ",
    ...opts?.env,
  };

  return {
    programName: "/bin/cowasm", // made up name is better than blank (?)
    wasmSource: wasmUrl,
    wasmImport,
    fs,
    env,
  };
}

export async function syncKernel(opts?: Options): Promise<WasmInstanceSync> {
  return await createSyncKernel(getOptions(wasmImportSync, opts));
}

export async function asyncKernel(opts?: Options): Promise<WasmInstanceAsync> {
  return await createAsyncKernel(getOptions(wasmImportAsync, opts));
}

export function supportsPosix(): boolean {
  return false;
}
