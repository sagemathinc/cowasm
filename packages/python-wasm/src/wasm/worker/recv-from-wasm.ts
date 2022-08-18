const textDecoder = new TextDecoder();

function notImplemented() {
  throw Error("RecvFromWasmAbstractBase -- implement in derived class");
}

interface Options {
  memory: WebAssembly.Memory;
  callFunction: (strings, ...args) => number | undefined;
}

export class RecvFromWasmAbstractBase {
  protected memory: WebAssembly.Memory;
  protected callFunction: (strings, ...args) => number | undefined;

  protected view(): DataView {
    notImplemented();
    return 0 as any;
  }

  strlen(_charPtr: number): number {
    notImplemented();
    return -1;
  }

  string(_ptr: number, _len?: number): string {
    notImplemented();
    return "";
  }

  arrayOfStrings(_ptr: number): string[] {
    notImplemented();
    return [];
  }
}

export default class RecvFromWasm extends RecvFromWasmAbstractBase {
  constructor({ memory, callFunction }: Options) {
    super();
    this.memory = memory;
    this.callFunction = callFunction;
  }

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
      ptr += 4;
    }
    return v;
  }
}
