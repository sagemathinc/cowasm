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

export async function terminal(argv: string[] = ["python"]) {
  if (wasm == null) throw Error("call init");
  await wasm.terminal(argv);
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
    // traceStubcalls: true, //'first',
  });
}
