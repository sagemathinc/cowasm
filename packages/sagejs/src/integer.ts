/*
Import as follows using a very recent version of node.js (at least 16.6?):

await import("@sagemath/sagejs/integer")

*/

import { WASI } from "@wasmer/wasi";
import { readFile } from "fs";
import { promisify } from "util";

import { dirname } from "path";
const moduleURL = new URL(import.meta.url);
const __dirname = dirname(moduleURL.pathname);

const env = {
  raise: () => console.warn("raise"),
  main: console.log,
};

interface Memory {
  buffer: Int8Array;
}

async function init() {
  const wasi = new WASI({
    args: process.argv,
    env: process.env,
  });
  const wasi_snapshot_preview1 = wasi.wasiImport;

  const source = await promisify(readFile)(`${__dirname}/integer.wasm`);
  const typedArray = new Uint8Array(source);

  const result = await WebAssembly.instantiate(typedArray, {
    env,
    wasi_snapshot_preview1,
  });
  wasi.start(result.instance);
  // Initialize GMP custom allocator:
  (result.instance.exports.initCustomAllocator as CallableFunction)();
  const memory = result.instance.exports.memory as unknown as Memory;

  function isPseudoPrime(n: number | string): 0 | 1 | 2 {
    if (typeof n == "string") {
      return (result.instance.exports.isPseudoPrime as CallableFunction)(
        stringToU8(`${n}`, memory.buffer)
      );
    } else {
      return (result.instance.exports.isPseudoPrimeInt as CallableFunction)(n);
    }
  }

  class IntegerClass {
    i: number;

    constructor(n: number | string | null, i?: number) {
      if (n === null && i !== undefined) {
        this.i = i;
        return;
      }
      if (typeof n == "number") {
        this.i = (result.instance.exports.createIntegerInt as CallableFunction)(
          n
        );
        return;
      }
      this.i = (result.instance.exports.createIntegerStr as CallableFunction)(
        stringToU8(`${n}`, memory.buffer)
      );
    }

    print() {
      (result.instance.exports.printInteger as CallableFunction)(this.i);
    }

    nextPrime() {
      return new IntegerClass(
        null,
        (result.instance.exports.nextPrime as CallableFunction)(this.i)
      );
    }

    isPseudoPrime() {
      return (result.instance.exports.wrappedIsPseudoPrime as CallableFunction)(
        this.i
      );
    }

    toString() {
      this.print();
      return ""; // since we don't have sending strings yet!
    }
  }

  const Integer = (x) => new IntegerClass(x);
  return { isPseudoPrime, Integer };
}

const encoder = new TextEncoder();
function stringToU8(s, buffer) {
  const array = new Int8Array(buffer, 0, s.length + 1);
  array.set(encoder.encode(s));
  array[s.length] = 0;
  return array;
}

const { isPseudoPrime, Integer } = await init();
export { isPseudoPrime, Integer };
