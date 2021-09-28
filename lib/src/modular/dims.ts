import wasmImport from "../wasm";

export let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("modular/dims");
}
init();

export function index(N) {
  return wasm.exports._index(N);
}
