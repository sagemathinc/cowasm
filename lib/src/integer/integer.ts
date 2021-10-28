import wasmImport, { WasmInstance } from "../wasm";
import { RationalNumber } from "../rational/rational";

// @ts-ignore -- typescript doesn't have FinalizationRegistry
const registry = new FinalizationRegistry((handle) => {
  // console.log(`Freeing memory for ${handle}`);
  wasm?.exports.Integer_free(handle);
});

export let wasm: WasmInstance | undefined = undefined;

export async function init(): Promise<void> {
  if (wasm != null) {
    return;
  }
  wasm = await wasmImport("gmp");
  // Initialize GMP custom allocator:
  wasm.exports.initCustomAllocator();
}
init();

export class IntegerClass {
  i: number;

  constructor(n: number | string | null, i?: number, base?: number) {
    if (wasm == null) throw Error("await init() first");
    if (n === null && i !== undefined) {
      this.i = i;
    } else if (typeof n == "number") {
      this.i = wasm.exports.Integer_createInt(n);
    } else {
      this.i = wasm.callWithString("Integer_createStr", `${n}`, base ?? 10);
    }
    registry.register(this, this.i); // so we get notified when garbage collected.
  }

  _coerce(m): IntegerClass {
    if (wasm == null) throw Error("await init() first");
    if (!(m instanceof IntegerClass)) {
      return new IntegerClass(m);
    }
    return m;
  }

  _bin_op(m, name: string): IntegerClass {
    m = this._coerce(m);
    const op = wasm?.exports["Integer_" + name];
    if (op === undefined) {
      throw Error(`BUG -- unknown op ${name}`);
    }
    return new IntegerClass(null, op(this.i, m.i));
  }

  __add__(m): IntegerClass {
    return this._bin_op(m, "add");
  }

  __sub__(m): IntegerClass {
    return this._bin_op(m, "sub");
  }

  __mul__(m): IntegerClass {
    return this._bin_op(m, "mul");
  }

  __div__(m): RationalNumber {
    return this.__truediv__(m);
  }

  __truediv__(m): RationalNumber {
    m = this._coerce(m);
    const j = wasm?.exports.Integer_div(this.i, m.i);
    return new RationalNumber(null, j);
  }

  __pow__(e: number): IntegerClass {
    return new IntegerClass(null, wasm?.exports.Integer_pow(this.i, e));
  }

  __neg__(): IntegerClass {
    return new IntegerClass(null, wasm?.exports.Integer_neg(this.i));
  }

  eql(m): boolean {
    if (wasm == null) throw Error("await init() first");
    if (!(m instanceof IntegerClass)) {
      m = new IntegerClass(m);
    }
    return !!wasm.exports.Integer_eql(this.i, m.i);
  }

  gcd(m): IntegerClass {
    return this._bin_op(m, "gcd");
  }

  cmp(m): number {
    m = this._coerce(m);
    return wasm?.exports.Integer_cmp(this.i, m.i);
  }

  print() {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.Integer_print(this.i);
  }

  nextPrime() {
    if (wasm == null) throw Error("await init() first");
    return new IntegerClass(null, wasm.exports.Integer_nextPrime(this.i));
  }

  isPseudoPrime() {
    if (wasm == null) throw Error("await init() first");
    return wasm.exports.Integer_wrappedIsPseudoPrime(this.i);
  }

  __repr__(): string {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.Integer_stringify(this.i);
    return wasm.result;
  }

  __str__(): string {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.Integer_format(this.i);
    return wasm.result;
  }

  toString(base: number = 10): string {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.Integer_toString(this.i, base);
    return wasm.result;
  }

  ndigitsBound(base: number = 10): number {
    if (wasm == null) throw Error("await init() first");
    return wasm.exports.Integer_sizeInBaseBound(this.i, base);
  }
}

export default function Integer(n: number | string, base: number = 10) {
  return new IntegerClass(n, undefined, base);
}
