import type { WasmInstance } from "../wasm/types";
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

export async function terminal() {
  if (wasm == null) throw Error("call init");
  wasm.terminal();
//   const argv: { [n: number]: string } = {};
//   let n = 0;
//   for (const arg of process.argv) {
//     argv[n] = arg;
//     n += 1;
//   }
//   wasm.callWithString("terminal", JSON.stringify(argv));
}

// export async function pyrun_interactive_one() {
//   if (wasm == null) throw Error("call init");
//   wasm.exports.pyrun_interactive_one();
// }

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
