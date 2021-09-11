import { importWasm } from "./interface";

export function gcd_js(a, b) {
  if (a == 0) {
    return Math.abs(b);
  }
  if (b == 0) {
    return Math.abs(a);
  }
  if (a < 0) {
    a = -a;
  }
  if (b < 0) {
    b = -b;
  }
  while (b != 0) {
    const c = a % b;
    a = b;
    b = c;
  }
  return a;
}

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

/*
function f(k, B)
    n = 0
    s = 0
    while n <= B
        s += gcd(n, k)
        n += 1
    end
    s
end
*/

export function bench_gcd1(k, B) {
  let s = 0;
  for (let n = 0; n <= B; n++) {
    s += wasm.gcd(n, k);
  }
  return s;
}

export function bench_gcd1_js(k, B) {
  let s = 0;
  for (let n = 0; n <= B; n++) {
    s += gcd_js(n, k);
  }
  return s;
}

export function bench_gcd1_direct(k, B) {
  return wasm.bench_gcd1(k, B);
}
