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

class EllipticCurveClass {
  private readonly handle: number;

  constructor(ainvs: number[]) {
    if (ainvs.length == 2) {
      ainvs = [0, 0, 0, ...ainvs];
    } else if (ainvs.length != 5) {
      throw Error("ainvs must be of length 2 or 5");
    }
    this.handle = wasm.exports.EllipticCurve_init(...ainvs);
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
    console.log("warning: analyticRank doesn't work at all!");
    return wasm.exports.EllipticCurve_analyticRank(this.handle, bitPrecision);
  }
}

export function EllipticCurve(ainvs) {
  return new EllipticCurveClass(ainvs);
}
