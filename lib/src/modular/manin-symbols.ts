import wasmImport from "../wasm";

export let wasm: any = undefined;
export async function init() {
  wasm = await wasmImport("modular/manin-symbols");
}
init();

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
    return wasm.exports.ManinSymbols_dimensionFormula(this.handle);
  }

  print(): number {
    return wasm.exports.ManinSymbols_print(this.handle);
  }

  presentation(p: number): ManinSymbolsPresentation {
    const handle = wasm.exports.ManinSymbols_presentation(this.handle, p);
    return new ManinSymbolsPresentation(handle, p, this);
  }

  __repr__(): string {
    return `ManinSymbols(N=${this.N}, sign=${this.sign})`;
  }
}

// @ts-ignore
const ManinSymbolsPresentation_registry = new FinalizationRegistry((handle) => {
  wasm.exports.Presentation_free(handle);
});

class ManinSymbolsPresentation {
  private readonly handle: number;
  public readonly p: number;
  public readonly ms: ManinSymbolsClass;

  constructor(handle: number, p: number, ms: ManinSymbolsClass) {
    this.handle = handle;
    this.p = p;
    this.ms = ms;
    ManinSymbolsPresentation_registry.register(this, this.handle);
  }

  print(): number {
    return wasm.exports.Presentation_print(this.handle);
  }

  reduce(u: number, v: number): DenseVector {
    return new DenseVector(wasm.exports.Presentation_reduce(this.handle, u, v));
  }

  __repr__(): string {
    return `Presentation of ${this.ms.__repr__()} modulo ${this.p}`;
  }
}

// @ts-ignore
const DenseVector_registry = new FinalizationRegistry((handle) => {
  wasm.exports.DenseVector_free(handle);
});

class DenseVector {
  private readonly handle: number;

  constructor(handle: number) {
    this.handle = handle;
    DenseVector_registry.register(this, this.handle);
  }

  __repr__(): string {
    wasm.exports.DenseVector_string(this.handle);
    return wasm.result;
  }
}

export default function ManinSymbols(
  N: number,
  sign: Sign = 0
): ManinSymbolsClass {
  return new ManinSymbolsClass(N, sign);
}
