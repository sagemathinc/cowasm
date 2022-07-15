import type WasmInstance from "../wasm/instance";
import { Options } from "../wasm/import";
import type { FileSystemSpec } from "@wapython/wasi";

export let wasm: WasmInstance | undefined = undefined;

export function exec(str: string): void {
  if (wasm == null) throw Error("call init");
  wasm.callWithString("exec", str);
}

export function repr(str: string): string {
  if (wasm == null) throw Error("call init");
  return wasm.callWithString("eval", str) as string;
}

export async function main() {
  if (wasm == null) throw Error("call init");
  const argv: { [n: number]: string } = {};
  let n = 0;
  for (const arg of process.argv) {
    argv[n] = arg;
    n += 1;
  }
  wasm.callWithString("pymain", JSON.stringify(argv));
}

type WASMImportFunction = (
  python_wasm: string,
  options: Options
) => Promise<WasmInstance>;

export async function _init(
  python_wasm: string, // file path in node.js; a URL in browser.
  wasmImport: WASMImportFunction,
  fs: FileSystemSpec[]
): Promise<void> {
  if (wasm != null) {
    // already initialized
    return;
  }
  wasm = await wasmImport(python_wasm, {
    init: (wasm) => wasm.exports.init(),
    env: {
      PYTHONHOME: "/usr",
      TERMCAP: "/usr/lib/python3.11/termcap",
      TERM: "xterm-256color",
    },
    fs,
    // traceSyscalls: true,
    // traceStubcalls: 'first',
  });
}
