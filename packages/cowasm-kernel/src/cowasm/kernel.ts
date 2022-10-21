import type { WasmInstanceAsync, WasmInstanceSync } from "../wasm/types";
import { Options as ImportOptions } from "../wasm/import";
import type { FileSystemSpec } from "wasi-js";

type WASMImportFunction = (
  wasmSource: string,
  options: ImportOptions,
  log?: (...args) => void
) => Promise<WasmInstanceSync | WasmInstanceAsync>;

interface KernelOptions {
  wasmSource: string; // file path in node.js; a URL in browser.
  programName?: string; // file path to executable script, e.g., /.../python-wasm[-debug] in nodejs; fine to leave blank in browser (?).
  wasmImport: WASMImportFunction;
  fs: FileSystemSpec[];
  env: { [name: string]: string };
}

export async function createAsyncKernel({
  wasmSource,
  wasmImport,
  fs,
  env,
}: KernelOptions): Promise<WasmInstanceAsync> {
  const kernel = (await wasmImport(wasmSource, {
    env,
    fs,
  })) as WasmInstanceAsync;
  // critical to do this first, because otherwise process.cwd() gets
  // set to '/' (the default in WASM) when any posix call happens.
  await kernel.callWithString("chdir", process.cwd());
  return kernel;
}

export async function createSyncKernel({
  wasmSource,
  wasmImport,
  fs,
  env,
}: KernelOptions): Promise<WasmInstanceSync> {
  const kernel = (await wasmImport(wasmSource, {
    env,
    fs,
  })) as WasmInstanceSync;
  kernel.callWithString("chdir", process.cwd());
  return kernel;
}
