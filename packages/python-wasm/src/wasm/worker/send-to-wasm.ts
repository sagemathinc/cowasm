/*
Functions for sending objects from Javascript to WASM.
*/

interface Options {
  memory: WebAssembly.Memory;
  malloc: (number) => number; // NOTE: this is *assumed* to throw an error rather than return 0!
}

const encoder = new TextEncoder();

function notImplemented() {
  throw Error("SendToWasmAbstractBase -- implement in derived class");
}

export class SendToWasmAbstractBase {
  protected memory: WebAssembly.Memory;
  protected malloc(_number): number {
    notImplemented();
    return 0;
  }
  protected view(): DataView {
    notImplemented();
    return 0 as any;
  }
  pointer(_address: number, _ptr: number): void {
    notImplemented();
  }
  string(_str: string, _dest?: { ptr: number; len: number }): number {
    notImplemented();
    return 0;
  }
  arrayOfStrings(_v: string[]): number {
    notImplemented();
    return 0;
  }
  buffer(_buf: Buffer): number {
    notImplemented();
    return 0;
  }
}

export default class SendToWasm extends SendToWasmAbstractBase {
  constructor({ memory, malloc }: Options) {
    super();
    this.malloc = malloc;
    this.memory = memory;
  }

  // always get the view any time after a malloc may have happened!
  protected view(): DataView {
    return new DataView(this.memory.buffer);
  }

  pointer(address: number, ptr: number): void {
    this.view().setUint32(address, ptr, true); // true = little endian!!
  }

  // WARNING: this returns a pointer to memory that
  // was malloced.  Depending on your use, you might
  // want to free it.
  // If dest is given, that's a pointer to where to copy
  // the string (null terminated), with a bound of len bytes
  // including a terminating null byte.
  string(str: string, dest?: { ptr: number; len: number }): number {
    // Caller is responsible for freeing the returned char* from stringToU8
    // using this.exports.c_free, e.g., as done in callWithString here.
    // If dest and len are given, string is copied into memory starting
    // at dest instead, but truncated to len (including the null byte).
    if (dest != null) {
      str = str.slice(0, dest.len - 1); // ensure it will fit
    }
    const strAsArray = encoder.encode(str);
    const len = strAsArray.length + 1;
    const ptr = dest?.ptr ?? this.malloc(len);
    const array = new Int8Array(this.memory.buffer, ptr, len);
    array.set(strAsArray);
    array[len - 1] = 0;
    return ptr;
  }

  // This is null terminated, i.e., it's  "*char[]", where the last char[] is 0,
  // which is what a lot of posix functions want.
  arrayOfStrings(v: string[]): number {
    const ptr = this.malloc(4 * (v.length + 1));
    for (let i = 0; i < v.length; i++) {
      const sPtr = this.string(v[i]);
      this.pointer(ptr + 4 * i, sPtr);
    }
    this.pointer(ptr + 4 * v.length, 0);
    return ptr;
  }

  buffer(buf: Buffer): number {
    const ptr = this.malloc(buf.byteLength);
    const array = new Uint8Array(this.memory.buffer);
    buf.copy(array, ptr);
    return ptr;
  }
}
