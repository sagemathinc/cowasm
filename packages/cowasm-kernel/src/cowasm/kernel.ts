import type { WasmInstance } from "../wasm/types";
import { Options as ImportOptions } from "../wasm/import";
import type { FileSystemSpec } from "wasi-js";

type WASMImportFunction = (
  wasmSource: string,
  options: ImportOptions,
  log?: (...args) => void
) => Promise<WasmInstance>;

interface KernelOptions {
  wasmSource: string; // file path in node.js; a URL in browser.
  programName?: string; // file path to executable script, e.g., /.../python-wasm[-debug] in nodejs; fine to leave blank in browser (?).
  wasmImport: WASMImportFunction;
  fs: FileSystemSpec[];
  env: { [name: string]: string };
}

export default async function createKernel({
  wasmSource,
  wasmImport,
  fs,
  env,
}: KernelOptions): Promise<WasmInstance> {
  const wasm = await wasmImport(wasmSource, { env, fs });
  // critical to do this first, because otherwise process.cwd() gets
  // set to '/' (the default in WASM) when any posix call happens.
  await wasm.callWithString("chdir", process.cwd());
  return wasm;
}
