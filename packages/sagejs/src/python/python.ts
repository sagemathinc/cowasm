import wasmImport from "../wasm";

export let wasm: any = undefined;
export async function init() {
  //wasm = await wasmImport("python");
  wasm = await wasmImport(
    "/home/user/sagemathjs/packages/sagejs/src/python/hello.wasm"
  );
}
init();
