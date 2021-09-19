import wasmImport, { stringToU8 } from "./wasm";

interface Memory {
  buffer: Int8Array;
}

let wasm: any = undefined;
export async function init(): Promise<void> {
  if (wasm != null) {
    return;
  }
  wasm = await wasmImport("integer");
  // Initialize GMP custom allocator:
  wasm.initCustomAllocator();
}
init();

class IntegerClass {
  i: number;

  constructor(n: number | string | null, i?: number) {
    if (n === null && i !== undefined) {
      this.i = i;
      return;
    }
    if (typeof n == "number") {
      this.i = wasm.createIntegerInt(n);
      return;
    }
    this.i = wasm.createIntegerStr(
      stringToU8(`${n}`, (wasm.memory as Memory).buffer)
    );
  }

  print() {
    wasm.printInteger(this.i);
  }

  nextPrime() {
    return new IntegerClass(null, wasm.nextPrime(this.i));
  }

  isPseudoPrime() {
    return wasm.wrappedIsPseudoPrime(this.i);
  }

  toString() {
    this.print();
    return ""; // since we don't have sending strings yet!
  }
}

export function isPseudoPrime(n: number | string): 0 | 1 | 2 {
  if (typeof n == "string") {
    return wasm.isPseudoPrime(
      stringToU8(`${n}`, (wasm.memory as Memory).buffer)
    );
  } else {
    return wasm.isPseudoPrimeInt(n);
  }
}

export const Integer = (x) => new IntegerClass(x);
