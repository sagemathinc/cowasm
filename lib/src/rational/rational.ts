import wasmImport, { WasmInstance } from "../wasm";
import genericPower from "../arith/generic-power";

// @ts-ignore
const registry = new FinalizationRegistry((handle) => {
  wasm?.exports.freeRational(handle);
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
      this.i = wasm.exports.createRationalInt(n);
    } else {
      this.i = wasm.callWithString("createRationalStr", `${n}`, base ?? 10);
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
    const op = wasm?.exports[name];
    if (op === undefined) {
      throw Error(`BUG -- unknown op ${name}`);
    }
    return new RationalNumber(null, op(this.i, m.i));
  }

  __add__(m): RationalNumber {
    return this._bin_op(m, "addRationals");
  }

  __sub__(m): RationalNumber {
    return this._bin_op(m, "subRationals");
  }

  __mul__(m): RationalNumber {
    return this._bin_op(m, "mulRationals");
  }

  __div__(m): RationalNumber {
    return this._bin_op(m, "divRationals");
  }
  __truediv__(m): RationalNumber {
    return this._bin_op(m, "divRationals");
  }

  __pow__(e: number): RationalNumber {
    return genericPower(this, e) as RationalNumber;
  }

  eql(m): boolean {
    if (wasm == null) throw Error("await init() first");
    if (!(m instanceof RationalNumber)) {
      m = new RationalNumber(m);
    }
    return !!wasm.exports.eqlRationals(this.i, m.i);
  }

  cmp(m): number {
    m = this._coerce(m);
    return wasm?.exports.cmpRationals(this.i, m.i);
  }

  print() {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.printRational(this.i);
  }

  toString(base: number = 10): string {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.RationalToString(this.i, base);
    return wasm.result;
  }

  __repr__(): string {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.Rational_stringify(this.i);
    return wasm.result;
  }

  __str__(): string {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.Rational_format(this.i);
    return wasm.result;
  }
}

export default function Rational(n: number | string, base: number = 10) {
  return new RationalNumber(n, undefined, base);
}
