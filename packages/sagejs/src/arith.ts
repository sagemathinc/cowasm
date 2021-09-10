import { importWasm } from "./interface";

export function gcd_int32(n: number, m: number) {
  return wasm.gcd(n, m);
}

export function inverseMod_int32(a: number, N: number) {
  const b = wasm.inverseMod(a, N);
  if (b == -1) {
    throw Error(`Mod(${a}, ${N}) is not invertible`);
  }
  return b;
}

let r: { g: number; s: number; t: number } = { g: 0, s: 0, t: 0 };
function returnXgcd(g, s, t) {
  r = { g, s, t };
}
export function xgcd_int32(
  a: number,
  b: number
): { g: number; s: number; t: number } {
  wasm.xgcd(a, b);
  return r;
}

let wasm: any = undefined;
export async function init() {
  wasm = await importWasm("arith", { env: { returnXgcd } });
  return wasm;
}
