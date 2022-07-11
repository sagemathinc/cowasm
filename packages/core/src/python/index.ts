import type WasmInstance from "../wasm/instance";

export let wasm: WasmInstance | undefined = undefined;

export function exec(str: string): void {
  if (wasm == null) throw Error("call init");
  wasm.callWithString("exec", str);
}

export function repr(str: string): string {
  if (wasm == null) throw Error("call init");
  return wasm.callWithString("eval", str) as string;
}

export async function _init(wasmImport, fs) {
  if (wasm != null) {
    // already initialized
    return;
  }
  wasm = await wasmImport("python/python.wasm", {
    init: (wasm) => wasm.exports.init(),
    env: { PYTHONHOME: "/pythonhome" },
    fs,
    //traceSyscalls: true,
    //traceStubcalls: 'first',
  });
}
