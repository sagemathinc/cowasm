import wasmImport, { WasmInstance } from "../wasm";
import { zipfs } from "@wapython/wasi";
import * as nativeFs from "fs";

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

export let fs: any = undefined;
export async function init() {
  if (wasm != null) {
    // already initialized
    return;
  }
  if (false) {
    fs = await zipfs(
      "/home/user/wapython/packages/cpython/dist/wasm/lib/dist/python311.zip",
      "/home/user/wapython/packages/cpython/dist/wasm/lib/python3.11"
    );
  } else {
    fs = nativeFs;
  }
  wasm = await wasmImport("python/python.wasm", {
    init: (wasm) => wasm.exports.init(),
    env: { PYTHONHOME: "/home/user/wapython/packages/cpython/dist/wasm/" },
    bindings: { fs },
    //traceSyscalls: true,
  });
}

init();
