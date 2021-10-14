import wasmImport, { WasmInstance } from "../wasm";

// @ts-ignore -- typescript doesn't have FinalizationRegistry
const registry = new FinalizationRegistry((handle) => {
  // console.log(`Freeing memory for ${handle}`);
  wasm?.exports.freeInteger(handle);
});

export let wasm: WasmInstance | undefined = undefined;

export async function init(): Promise<void> {
  if (wasm != null) {
    return;
  }
  wasm = await wasmImport("integer/integer");
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
      this.i = wasm.exports.createIntegerInt(n);
    } else {
      this.i = wasm.callWithString("createIntegerStr", `${n}`, base ?? 10);
    }
    registry.register(this, this.i); // so we get notified when garbage collected.
  }

  __add__(m: IntegerClass): IntegerClass {
    if (wasm == null) throw Error("await init() first");
    return new IntegerClass(null, wasm.exports.addIntegers(this.i, m.i));
  }

  __sub__(m: IntegerClass): IntegerClass {
    if (wasm == null) throw Error("await init() first");
    return new IntegerClass(null, wasm.exports.subIntegers(this.i, m.i));
  }

  __mul__(m: IntegerClass): IntegerClass {
    if (wasm == null) throw Error("await init() first");
    return new IntegerClass(null, wasm.exports.mulIntegers(this.i, m.i));
  }

  __pow__(e: number): IntegerClass {
    if (wasm == null) throw Error("await init() first");
    return new IntegerClass(null, wasm.exports.powIntegers(this.i, e));
  }

  eql(m: IntegerClass): boolean {
    if (wasm == null) throw Error("await init() first");
    return !!wasm.exports.eqlIntegers(this.i, m.i);
  }

  cmp(m: IntegerClass): number {
    if (wasm == null) throw Error("await init() first");
    return wasm.exports.cmpIntegers(this.i, m.i);
  }

  print() {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.printInteger(this.i);
  }

  nextPrime() {
    if (wasm == null) throw Error("await init() first");
    return new IntegerClass(null, wasm.exports.nextPrime(this.i));
  }

  isPseudoPrime() {
    if (wasm == null) throw Error("await init() first");
    return wasm.exports.wrappedIsPseudoPrime(this.i);
  }

  toString(base: number = 10): string {
    if (wasm == null) throw Error("await init() first");
    wasm.exports.toString(this.i, base);
    return wasm.result;
  }

  numDigits(base: number = 10): string {
    if (wasm == null) throw Error("await init() first");
    return wasm.exports.sizeInBase(this.i, base);
  }
}

export default function Integer(n: number | string, base: number = 10) {
  return new IntegerClass(n, undefined, base);
}
