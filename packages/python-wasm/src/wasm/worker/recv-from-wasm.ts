const textDecoder = new TextDecoder();

interface Options {
  memory: WebAssembly.Memory;
  callFunction: (strings, ...args) => number | undefined;
}

// size of a pointer in bytes
const SIZEOF_POINTER = 4;

export class RecvFromWasmAbstractBase {
  protected memory: WebAssembly.Memory;
  protected callFunction: (strings, ...args) => number | undefined;

  // always get the view any time after a malloc may have happened!
  protected view(): DataView {
    return new DataView(this.memory.buffer);
  }

  strlen(charPtr: number): number {
    // TODO: benchmark the JS vs wasm implementation!
    // return this.callFunction("stringLength", charPtr);
    const mem = new Uint8Array(this.memory.buffer);
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
    return new Uint32Array(this.memory.buffer)[ptr];
  }

  string(ptr: number, len?: number): string {
    if (len == null) {
      // no len given, so assume it is a null terminated string:
      len = this.strlen(ptr);
      if (len == null) throw Error("bug");
    }
    const slice = this.memory.buffer.slice(ptr, ptr + len);
    return textDecoder.decode(slice);
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
  constructor({ memory, callFunction }: Options) {
    super();
    this.memory = memory;
    this.callFunction = callFunction;
  }
}
