import wasmImport from "./wasm";

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

const MAX_i32 = 2 ** (31 - 1);
const MIN_i32 = -(2 ** 31);

function checkConvertsToi32(n: number) {
  if (n < MIN_i32 || n > MAX_i32) {
    throw Error(`${n} cannot be represented as a 32-bit int`);
  }
}
export function gcd(n: number, m: number): number {
  checkConvertsToi32(n);
  checkConvertsToi32(m);
  return wasm.exports.gcd(n, m);
}

export function inverseMod(a: number, N: number): number {
  checkConvertsToi32(a);
  checkConvertsToi32(N);
  const b = wasm.exports.inverseMod(a, N);
  if (b == -1) {
    throw Error(`Mod(${a}, ${N}) is not invertible`);
  }
  return b;
}

let xgcd_r: [number, number, number] = [0, 0, 0];
const xgcd_cb = (g, s, t) => {
  xgcd_r = [g, s, t];
};
export function xgcd(a: number, b: number): [number, number, number] {
  checkConvertsToi32(a);
  checkConvertsToi32(b);
  wasm.exports.xgcd(a, b);
  return xgcd_r;
}

let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("arith", { env: { xgcd_cb }, noWasi: true });
}

export function bench_gcd1(k, B) {
  let s = 0;
  for (let n = 0; n <= B; n++) {
    s += wasm.exports.gcd(n, k);
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
  return wasm.exports.bench_gcd1(k, B);
}
