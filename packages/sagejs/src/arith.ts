import { importWasm } from "./interface";

export function gcd(n: number, m: number): number {
  return wasm.gcd(n, m);
}

export function inverseMod(a: number, N: number): number {
  const b = wasm.inverseMod(a, N);
  if (b == -1) {
    throw Error(`Mod(${a}, ${N}) is not invertible`);
  }
  return b;
}

let xgcd_r: { g: number; s: number; t: number } = { g: 0, s: 0, t: 0 };
const xgcd_cb = (g, s, t) => {
  xgcd_r = { g, s, t };
};
export function xgcd(
  a: number,
  b: number
): { g: number; s: number; t: number } {
  wasm.xgcd(a, b);
  return xgcd_r;
}

let wasm: any = undefined;
export async function init() {
  wasm = await importWasm("arith", { env: { xgcd_cb }, noWasi: true });
}
