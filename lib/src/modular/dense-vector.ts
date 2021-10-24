import wasmImport from "../wasm";
export let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("modular/manin-symbols");
}
init();

// @ts-ignore
const registry = new FinalizationRegistry((handle) => {
  wasm.exports.DenseVector_free(handle);
});

export class DenseVector {
  private readonly handle: number;

  constructor(handle: number) {
    this.handle = handle;
    registry.register(this, this.handle);
  }

  __str__(): string {
    wasm.exports.DenseVector_format(this.handle);
    return wasm.result;
  }

  __repr__(): string {
    wasm.exports.DenseVector_stringify(this.handle);
    return wasm.result;
  }
}
