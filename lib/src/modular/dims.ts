import wasmImport from "../wasm";

export let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("modular/dims");
}
init();

export function index(N) {
  return wasm.exports.wasm_index(N);
}

export function eulerPhi(N) {
  return wasm.exports.wasm_eulerPhi(N);
}

export function dimensionCuspForms(N) {
  return wasm.exports.wasm_dimensionCuspForms(N);
}
