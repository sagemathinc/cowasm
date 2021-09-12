import { importWasm } from "./interface";

export function P1List(N: number): number {
  return wasm.P1List(N);
}

let wasm: any = undefined;
export async function init() {
  wasm = await importWasm("p1list", { noWasi: true });
}
init();

export function bench1(N: number, k: number): number {
  let s = 0;
  for (let n = 0; n < k; n++) {
    s += P1List(N);
  }
  return s;
}
