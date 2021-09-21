import wasmImport, { stringToU8, string_cb } from "../wasm";

export let wasm: any = undefined;

export function exec(s: string): void {
  wasm.exec(stringToU8(s, wasm.memory.buffer));
}

let result: string = "";
function eval_cb(ptr, len) {
  result = string_cb(wasm, ptr, len);
}

export function repr(s: string): string {
  wasm.eval(stringToU8(s, wasm.memory.buffer));
  return result;
}

export async function init() {
  if (wasm != null) return;
  wasm = await wasmImport("python/python.wasm", {
    env: { eval_cb },
    init: (w) => w.init(),
  });
}

init();
