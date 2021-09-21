import wasmImport, { stringToU8, string_cb } from "../wasm";

export let wasm: any = undefined;
function checkInit() {
  if (wasm == null) {
    throw Error("You must first init pari.");
  }
}

let result: string = "";
function exec_cb(ptr, len) {
  result = string_cb(wasm, ptr, len);
}
export function exec(s: string): string {
  checkInit();
  if (s.length > 10000) {
    throw Error("s must have length at most 10000"); // hardcoded in pari.zig
  }
  wasm.exec(stringToU8(s, wasm.memory.buffer));
  return result;
}

export async function init(parisize: number = 0, maxprime: number = 0) {
  wasm = await wasmImport("pari/pari.wasm", {
    env: { exec_cb },
    init: (wasm) => wasm.init(parisize, maxprime),
  });
}
