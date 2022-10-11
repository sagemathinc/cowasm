const textDecoder = new TextDecoder();

interface Options {
  getView: () => DataView;
  callFunction: (strings, ...args) => number | undefined;
}

// size of a pointer in bytes
const SIZEOF_POINTER = 4;

export class RecvFromWasmAbstractBase {
  protected view: () => DataView;
  protected callFunction: (strings, ...args) => number | undefined;

  // Returns the number of *bytes* in a char*.
  strlen(charPtr: number): number {
    // TODO: benchmark the JS vs wasm implementation!
    // return this.callFunction("stringLength", charPtr);
    const mem = new Uint8Array(this.view().buffer);
    let i = charPtr;
    while (mem[i]) {
      i += 1;
    }
    return i - charPtr;
  }

  pointer(ptr: number): number {
    return this.view().getUint32(ptr, true);
  }

  u32(ptr: number): number {
    return this.view().getUint32(ptr, true);
  }

  i32(ptr: number): number {
    return this.view().getInt32(ptr, true);
  }

  pointer2(ptr: number): number {
    return new Uint32Array(this.view().buffer)[ptr];
  }

  // len is the number of bytes, not the number of utf-8 characters.
  string(ptr: number, bytes?: number): string {
    if (bytes == null) {
      // no len in bytes given, so assume it is a null terminated string.
      bytes = this.strlen(ptr);
      if (bytes == null) throw Error("bug");
    }
    const slice = this.view().buffer.slice(ptr, ptr + bytes);
    return textDecoder.decode(slice);
  }

  buffer(ptr: number, bytes: number): Buffer {
    console.log(this.view().buffer.slice(ptr, ptr + bytes));
    return Buffer.from(this.view().buffer.slice(ptr, ptr + bytes));
  }

  // Receive a null-terminated array of strings.
  arrayOfStrings(ptr: number): string[] {
    const v: string[] = [];
    while (true) {
      const p = this.pointer(ptr);
      if (!p) break;
      v.push(this.string(p));
      ptr += SIZEOF_POINTER;
    }
    return v;
  }

  // Receive a null-terminated array of ints
  arrayOfI32(ptr: number): number[] {
    const v: number[] = [];
    if (ptr == 0) {
      return v;
    }
    while (true) {
      const p = this.pointer(ptr);
      if (!p) break;
      v.push(this.i32(p));
      ptr += SIZEOF_POINTER;
    }
    return v;
  }
}

export default class RecvFromWasm extends RecvFromWasmAbstractBase {
  constructor({ getView, callFunction }: Options) {
    super();
    this.view = getView;
    this.callFunction = callFunction;
  }
}
