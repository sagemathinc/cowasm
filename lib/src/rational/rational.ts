import wasmImport, { WasmInstance } from "../wasm";
import genericPower from "../arith/generic-power";

// @ts-ignore
const registry = new FinalizationRegistry((handle) => {
  wasm?.exports.Rational_free(handle);
});

export let wasm: WasmInstance | undefined = undefined;

export async function init(): Promise<void> {
  if (wasm != null) {
    return;
  }
  wasm = await wasmImport("gmp");
  wasm.exports.initCustomAllocator();
}
init();

export class RationalNumber {
  i: number;

  constructor(n: number | string | null, i?: number, base?: number) {
    if (wasm == null) throw Error("await init() first");
    if (n === null && i !== undefined) {
      this.i = i;
    } else if (typeof n == "number") {
      this.i = wasm.exports.Rational_createInt(n);
    } else {
      this.i = wasm.callWithString("Rational_createStr", `${n}`, base ?? 10);
    }
    registry.register(this, this.i); // so we get notified when garbage collected.
  }

  _coerce(m): RationalNumber {
    if (wasm == null) throw Error("await init() first");
    if (!(m instanceof RationalNumber)) {
      return new RationalNumber(m);
    }
    return m;
  }

  _bin_op(m, name: string): RationalNumber {
    m = this._coerce(m);
    const op = wasm?.exports["Rational_" + name];
    if (op === undefined) {
      throw Error(`BUG -- unknown op ${name}`);
    }
    return new RationalNumber(null, op(this.i, m.i));
  }

  __add__(m): RationalNumber {
    return this._bin_op(m, "add");
  }

  __sub__(m): RationalNumber {
    return this._bin_op(m, "sub");
  }

  __mul__(m): RationalNumber {
    return this._bin_op(m, "mul");
  }

  __div__(m): RationalNumber {
    return this._bin_op(m, "div");
  }
  __truediv__(m): RationalNumber {
    return this._bin_op(m, "div");
  }

  __pow__(e: number): RationalNumber {
    const j = wasm?.exports.Rational_pow(this.i, e);
    return new RationalNumber(null, j);
  }

  _generic_pow(e: number): RationalNumber {
    if (e == 0) {
      return new RationalNumber(1);
    }
    if (e < 0) {
      return this.inverse()._generic_pow(-e);
    }
    return genericPower(this, e) as RationalNumber;
  }

  inverse(): RationalNumber {
    const j = wasm?.exports.Rational_inverse(this.i);
    return new RationalNumber(null, j);
  }

  eql(m): boolean {
    if (wasm == null) throw Error("await init() first");
    if (!(m instanceof RationalNumber)) {
      m = new RationalNumber(m);
    }
    return !!wasm.exports.Rational_eql(this.i, m.i);
  }

  __eq__(m) {
    return this.eql(m);
  }

  cmp(m): number {
    m = this._coerce(m);
    return wasm?.exports.Rational_cmp(this.i, m.i);
  }

  print() {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.Rational_print(this.i);
  }

  toString(base: number = 10): string {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.Rational_toString(this.i, base);
    return wasm.result;
  }

  toJSON(): { type: "Rational"; hexNumerator: number; hexDenominator: number } {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.Rational_stringify(this.i);
    return JSON.parse(wasm.result);
  }

  __repr__(): string {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.Rational_format(this.i);
    return wasm.result;
  }
}

export default function Rational(n: number | string, base: number = 10) {
  return new RationalNumber(n, undefined, base);
}
