import wasmImport, { WasmInstance } from "../wasm";
import { zipfs } from "@wapython/wasi";

export let wasm: WasmInstance | undefined = undefined;

export function exec(str: string): void {
  if (wasm == null) throw Error("call init");
  wasm.callWithString("exec", str);
}

export function repr(str: string): string {
  if (wasm == null) throw Error("call init");
  return wasm.callWithString("eval", str) as string;
}

// export function toObject(str: string): object {
//   if (wasm == null) throw Error("call init");
//   //return JSON.parse(wasm.callWithString("toJSON", str));
// }

export async function init() {
  if (wasm != null) {
    // already initialized
    return;
  }
  const fs = await zipfs(
    "/home/user/wapython/packages/cpython/dist/wasm/lib/dist/python311.zip",
    "/home/user/wapython/packages/cpython/dist/wasm/lib/python3.11"
  );
  wasm = await wasmImport("python/python.wasm", {
    init: (wasm) => wasm.exports.init(),
    //bindings: { fs },
    //traceSyscalls: true,
  });
}

init();
