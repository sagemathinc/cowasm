import type { WasmInstance } from "../wasm/types";
import { Options } from "../wasm/import";
import type { FileSystemSpec } from "@wapython/wasi";

export let wasm: WasmInstance | undefined = undefined;

export async function exec(str: string): Promise<void> {
  if (wasm == null) throw Error("call init");
  await wasm.callWithString("exec", str);
}

export async function repr(str: string): Promise<string> {
  if (wasm == null) throw Error("call init");
  return (await wasm.callWithString("eval", str)) as string;
}

export async function terminal(argv: string[] = ["python"]) : Promise<number> {
  if (wasm == null) throw Error("call init");
  return await wasm.terminal(argv);
}

type WASMImportFunction = (
  python_wasm: string,
  options: Options,
  log?: (...args) => void
) => Promise<WasmInstance>;

export async function _init(
  python_wasm: string, // file path in node.js; a URL in browser.
  wasmImport: WASMImportFunction,
  fs: FileSystemSpec[],
  env: { [name: string]: string; }
): Promise<void> {
  if (wasm != null) {
    // already initialized
    return;
  }
  wasm = await wasmImport(python_wasm, {
    env,
    fs,
    traceSyscalls: false,
    traceStubcalls: true //false, //'first',  // 'first' or true
  });
}
