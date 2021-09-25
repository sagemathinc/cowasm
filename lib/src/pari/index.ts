import wasmImport, { WasmInstance } from "../wasm";

export let wasm: WasmInstance | undefined = undefined;

export function exec(str: string): string {
  if (wasm == null) throw Error("await init() first");
  if (str.length > 10000) {
    throw Error("s must have length at most 10000"); // hardcoded in pari.zig
  }
  return wasm.callWithString("exec", str) as string;
}

export async function init(parisize: number = 0, maxprime: number = 0) {
  wasm = await wasmImport("pari/pari.wasm", {
    init: (wasm) => wasm.exports.init(parisize, maxprime),
  });
}
