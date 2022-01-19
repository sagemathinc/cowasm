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
    if (sign) {
      console.warn(
        "ManinSymbols with sign 0 seems always right, but with sign 1 or -1 it is often very wrong."
      );
      console.warn(
        "A good example input is inconsistent with what you get for sign=0:"
      );
      console.warn(
        "N=23; p=1009; M = ManinSymbols(N,1); P = M.presentation(p); t = P.heckeOperator(2); t.fcp()"
      );
    }
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
    a_denom: number,
    b_numer?: number,
    b_denom?: number
  ): DenseVector {
    if (b_numer == null) {
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
    const handle = wasm.exports.Presentation_heckeOperator(this.handle, p);
    if (handle == 0) {
      throw Error(`error computing hecke operator p=${p}`);
    }
    return new DenseMatrix(handle);
  }

  __repr__(): string {
    wasm.exports.Presentation_format(this.handle);
    return wasm.result;
  }

  toJSON(): {
    type: "ManinSymbolsPresentation";
    matrix: {
      type: "DenseMatrixMod";
      modulus: number;
      nrows: number;
      ncols: number;
      entries: number[];
    };
    basis: number[];
  } {
    wasm.exports.Presentation_stringify(this.handle);
    return JSON.parse(wasm.result);
  }
}

export default function ManinSymbols(
  N: number,
  sign: Sign = 0
): ManinSymbolsClass {
  return new ManinSymbolsClass(N, sign);
}
