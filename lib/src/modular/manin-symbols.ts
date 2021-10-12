import wasmImport from "../wasm";

// @ts-ignore -- typescript doesn't have FinalizationRegistry
const registry = new FinalizationRegistry((handle) => {
  wasm.exports.ManinSymbols_free(handle);
});

export type Sign = -1 | 0 | 1;

class ManinSymbolsClass {
  private readonly N: number;
  private readonly sign: Sign;
  private readonly handle: number;

  constructor(N: number, sign: Sign) {
    if (wasm == null) throw Error("call init first");
    this.N = N;
    this.sign = sign;
    this.handle = wasm.exports.ManinSymbols(N, sign);
    registry.register(this, this.handle);
  }

  dimensionFormula(): number {
    return wasm.exports.dimensionFormula(this.handle);
  }

  __repr__(): string {
    return `ManinSymbols(N=${this.N}, sign=${this.sign})`;
  }
}

export let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("modular/manin-symbols");
}
init();

export default function ManinSymbols(
  N: number,
  sign: Sign = 0
): ManinSymbolsClass {
  return new ManinSymbolsClass(N, sign);
}
