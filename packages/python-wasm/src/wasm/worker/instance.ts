// @ts-ignore -- it thinks FileSystem isn't used, even though it is below.  Weird.
import type { FileSystem } from "@wapython/wasi";

const encoder = new TextEncoder();

export default class WasmInstance {
  result: any = undefined;
  resultException: boolean = false;
  exports: any;
  fs?: FileSystem;

  constructor(exports, fs?: FileSystem) {
    this.exports = exports;
    this.fs = fs;
  }

  private stringToCharStar(str: string): number {
    // Caller MUST free the returned char* from stringToU8 using this.exports.c_free, e.g., as done in callWithString here.
    const strAsArray = encoder.encode(str);
    const len = strAsArray.length + 1;
    const ptr = this.exports.c_malloc(len); // TODO: what happens when this allocation fails?
    const array = new Int8Array(this.exports.memory.buffer, ptr, len);
    array.set(strAsArray);
    array[len - 1] = 0;
    return ptr;
  }

  callWithString(name: string, str: string | string[], ...args): any {
    this.result = undefined;
    this.resultException = false;
    const f = this.exports[name];
    if (f == null) {
      throw Error(`no function ${name} defined in wasm module`);
    }
    let r;
    if (typeof str == "string") {
      const ptr = this.stringToCharStar(str);
      try {
        // @ts-ignore
        r = f(ptr, ...args);
      } finally {
        // @ts-ignore
        this.exports.c_free(ptr);
      }
    } else {
      // TODO: solve problem in more generality, obviously!
      // Convert array of strings to char**
      const ptrs: number[] = [];
      for (const s of str) {
        ptrs.push(this.stringToCharStar(s));
      }
      const len = ptrs.length;
      const ptr = this.exports.c_malloc(len * 4); // sizeof(char*) = 4 in WASM.
      const array = new Int32Array(this.exports.memory.buffer, ptr, len);
      let i = 0;
      for (const p of ptrs) {
        array[i] = p;
        i += 1;
      }
      try {
        // @ts-ignore
        r = f(len, ptr, ...args);
      } finally {
        // @ts-ignore
        this.exports.c_free(ptr);
        for (const p of ptrs) {
          this.exports.c_free(p);
        }
      }
    }
    if (this.resultException) {
      throw Error("RuntimeError");
    }
    return this.result ?? r;
  }
}
