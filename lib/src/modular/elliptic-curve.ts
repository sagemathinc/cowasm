import wasmImport from "../wasm";
export let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("modular/manin-symbols");
}
init();

// @ts-ignore
const registry = new FinalizationRegistry((handle) => {
  wasm.exports.EllipticCurve_free(handle);
});

export class EllipticCurve {
  private readonly handle: number;

  constructor(_x: number[]) {
    throw Error("TODO");
  }

  __str__(): string {
    wasm.exports.EllipticCurve_format(this.handle);
    return wasm.result;
  }

  __repr__(): string {
    wasm.exports.EllipticCurve_stringify(this.handle);
    return wasm.result;
  }

  ap(p: number): number {
    return wasm.exports.EllipticCurve_ap(this.handle, p);
  }

  analyticRank(bitPrecision = 53): number {
    return wasm.exports.EllipticCurve_analyticRank(this.handle, bitPrecision);
  }
}
