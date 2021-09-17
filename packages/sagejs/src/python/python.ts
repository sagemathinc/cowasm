import wasmImport, { stringToU8, string_cb } from "../wasm";

export let wasm: any = undefined;

export function pariInit(parisize: number = 0, maxprime: number = 0): void {
  wasm.init(parisize, maxprime);
}

export function add(a: number, b: number): number {
  return wasm.add(a, b);
}

let result: string = "";
function exec_cb(ptr, len) {
  result = string_cb(wasm, ptr, len);
}

export function exec(s: string): string {
  if (s.length > 10000) {
    throw Error("s must have length at most 10000"); // hardcoded in pari.zig
  }
  wasm.exec(stringToU8(s, wasm.memory.buffer));
  return result;
}

export async function init() {
  wasm = await wasmImport("pari", { env: { exec_cb } });
  wasm.init();
}
init();
