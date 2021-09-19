import wasmImport, { stringToU8 } from "../wasm";

export let wasm: any = undefined;
export async function init() {
  const w = await wasmImport("python");
  w.init(); // initialize python interpreter -- MUST do before any use of it.
  wasm = w;
}
init();

export function exec(s: string): string {
  if (s.length > 10000) {
    throw Error("s must have length at most 10000"); // hardcoded in pari.zig
  }
  wasm.exec(stringToU8(s, wasm.memory.buffer));
  // return result;
}
