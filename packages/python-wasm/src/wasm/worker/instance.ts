// @ts-ignore -- it thinks FileSystem isn't used, even though it is below.  Weird.
import type { WASIFileSystem } from "wasi-js";
import type WASI from "wasi-js";
import { EventEmitter } from "events";
import SendToWasm from "./send-to-wasm";
import RecvFromWasm from "./recv-from-wasm";

const encoder = new TextEncoder();

// Massive optimization -- when calling a WASM function via
// callWithString (so first arg is a string), we reuse the
// same string buffer every time as long as the string is
// at most 8KB.  This avoids tons of mallocs, saves memory,
// and gives an order of magnitude speedup.
const SMALL_STRING_SIZE = 1024 * 8;

export default class WasmInstance extends EventEmitter {
  result: any = undefined;
  resultException: boolean = false;
  exports: any;
  memory: WebAssembly.Memory;
  smallStringPtr?: number;

  // these are sometimes available and useful, e.g., in testing:
  // fs = the virtual filesystem for wasm instance
  fs?: WASIFileSystem;
  // the webassembly function table for the main module; the dynamic
  // linker exposes clib functions via basically what you'll see
  // if you look at getFunction below, which makes things vastly faster.
  table?: WebAssembly.Table;
  // the WASI object from the wasi-js library, which manages things
  // like the filesystem abstraction and other system calls.
  wasi?: WASI;
  // a collection of posix functions missing from WASI that are best
  // implemented in Javascript (to get access to the environment).
  posixEnv?: { [name: string]: Function };

  public send: SendToWasm;
  public recv: RecvFromWasm;

  constructor(
    exports,
    memory: WebAssembly.Memory,
    fs?: WASIFileSystem,
    table?: WebAssembly.Table
  ) {
    super();
    this.exports = exports;
    this.memory = memory;
    this.table = table;
    this.fs = fs;

    const opts = {
      memory: this.memory,
      callFunction: (name: string, ...args) => {
        const f = this.getFunction(name);
        if (f == null) {
          throw Error(`error - ${name} is not defined`);
        }
        return f(...args);
      },
    };
    this.send = new SendToWasm(opts);
    this.recv = new RecvFromWasm(opts);
  }

  async terminal(argv: string[] = ["command"]): Promise<number> {
    return await this.callWithString("terminal", argv);
  }

  writeToStdin(_data): void {
    throw Error("not implemented");
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
      if (str.length < SMALL_STRING_SIZE) {
        r = this.callWithSmallString(f, str);
        return this.result ?? r;
      }
      const ptr = this.send.string(str);
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
        ptrs.push(this.send.string(s));
      }
      const len = ptrs.length;
      const ptr = this.exports.c_malloc(len * 4); // sizeof(char*) = 4 in WASM.
      const array = new Int32Array(this.memory.buffer, ptr, len);
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

  private callWithSmallString(f: Function, str: string, ...args): any {
    if (this.smallStringPtr == null) {
      this.smallStringPtr = this.exports.c_malloc(SMALL_STRING_SIZE);
    }
    const ptr = this.smallStringPtr;
    if (!ptr) {
      throw Error("MemoryError -- out of memory");
    }
    const len = str.length + 1;
    const array = new Int8Array(this.memory.buffer, ptr, len);
    const strAsArray = encoder.encode(str);
    array.set(strAsArray);
    array[len - 1] = 0;
    return f(ptr, ...args);
  }

  public getFunction(name: string): Function | undefined {
    if (this.table != null) {
      // first try pointer:
      const getPtr = this.exports[`__WASM_EXPORT__${name}`];
      if (getPtr != null) {
        return this.table.get(getPtr());
      }
    }
    return this.exports[name];
  }

  async waitUntilFsLoaded(): Promise<void> {
    if (this.fs == null) {
      throw Error("fs must be defined");
    }
    // it might not be defined, e.g., if not using unionfs at all
    return await this.fs.waitUntilLoaded?.();
  }

  signal(_sig?: number): void {
    throw Error("not implemented");
  }
}
