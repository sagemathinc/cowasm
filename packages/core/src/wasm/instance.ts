import type { FileSystem } from "@wapython/wasi";

const encoder = new TextEncoder();

export default class WasmInstance {
  result: any = undefined;
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
    const ptr = this.exports.c_malloc(len);
    const array = new Int8Array(this.exports.memory.buffer, ptr, len);
    array.set(strAsArray);
    array[len - 1] = 0;
    return ptr;
  }

  public callWithString(name: string, str: string, ...args): any {
    this.result = undefined;
    const ptr = this.stringToCharStar(str);
    let r;
    try {
      const f = this.exports[name];
      if (f == null) {
        throw Error(`no function ${name} defined in wasm module`);
      }
      // @ts-ignore
      r = f(ptr, ...args);
    } finally {
      // @ts-ignore
      this.exports.c_free(ptr);
    }
    return this.result ?? r;
  }
}
