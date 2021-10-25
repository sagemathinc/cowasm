import { DenseVector } from "./dense-vector";
import wasmImport from "../wasm";
export let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("modular/manin-symbols");
}
init();

// @ts-ignore
const registry = new FinalizationRegistry((handle) => {
  wasm.exports.DenseMatrix_free(handle);
});

export class DenseMatrix {
  private readonly handle: number;

  constructor(handle: number) {
    this.handle = handle;
    registry.register(this, this.handle);
  }

  __str__(): string {
    wasm.exports.DenseMatrix_format(this.handle);
    return wasm.result;
  }

  __repr__(): string {
    wasm.exports.DenseMatrix_stringify(this.handle);
    return wasm.result;
  }

  getRow(i: number): DenseVector {
    return new DenseVector(wasm.exports.DenseMatrix_getRow(this.handle, i));
  }
}
