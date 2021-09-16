import wasmImport, { stringToU8 } from "../wasm";

export let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("pari");
  wasm.init();
}

init();

export function pariInit(parisize: number = 0, maxprime: number = 0): void {
  wasm.init(parisize, maxprime);
}

export function add(a: number, b: number): number {
  return wasm.add(a, b);
}

export function exec(s: string): void {
  const t = stringToU8(s, wasm.memory.buffer);
  wasm.exec(t);
  console.log("t = ", t);
}
