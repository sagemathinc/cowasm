import { DenseVector } from "./dense-vector";
import { DenseMatrix } from "./dense-matrix";

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
  private readonly handle: number;

  constructor(N: number, sign: Sign) {
    if (wasm == null) throw Error("call init first");
    this.handle = wasm.exports.ManinSymbols(N, sign);
    registry.register(this, this.handle);
  }

  dimensionFormula(): number {
    return wasm.exports.ManinSymbols_dimensionFormula(this.handle);
  }

  print(): number {
    return wasm.exports.ManinSymbols_print(this.handle);
  }

  presentation(p: number, verbose: boolean = false): ManinSymbolsPresentation {
    const handle = wasm.exports.ManinSymbols_presentation(
      this.handle,
      p,
      verbose
    );
    return new ManinSymbolsPresentation(handle, p, this);
  }

  __str__(): string {
    wasm.exports.ManinSymbols_format(this.handle);
    return wasm.result;
  }

  __repr__(): string {
    wasm.exports.ManinSymbols_stringify(this.handle);
    return wasm.result;
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

  reduce(u: number, v: number): DenseVector {
    return new DenseVector(wasm.exports.Presentation_reduce(this.handle, u, v));
  }

  modularSymbol(
    a_numer: number,
    b_numer: number,
    a_denom?: number,
    b_denom?: number
  ): DenseVector {
    if (a_denom == null) {
      // {oo,a}
      [a_numer, a_denom, b_numer, b_denom] = [1, 0, a_numer, a_denom];
    }
    return new DenseVector(
      wasm.exports.Presentation_modularSymbol(
        this.handle,
        a_numer,
        a_denom,
        b_numer,
        b_denom
      )
    );
  }

  heckeOperator(p: number): DenseMatrix {
    return new DenseMatrix(
      wasm.exports.Presentation_heckeOperator(this.handle, p)
    );
  }

  __str__(): string {
    wasm.exports.Presentation_format(this.handle);
    return wasm.result;
  }

  __repr__(): string {
    wasm.exports.Presentation_stringify(this.handle);
    return wasm.result;
  }
}

export default function ManinSymbols(
  N: number,
  sign: Sign = 0
): ManinSymbolsClass {
  return new ManinSymbolsClass(N, sign);
}
