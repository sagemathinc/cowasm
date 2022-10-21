// @ts-ignore -- it thinks FileSystem isn't used, even though it is below.  Weird.
import type { WASIFileSystem } from "wasi-js";
import type WASI from "wasi-js";
import { EventEmitter } from "events";
import SendToWasm from "./send-to-wasm";
import RecvFromWasm from "./recv-from-wasm";
import type PosixContext from "./posix-context";

const encoder = new TextEncoder();

// Massive optimization -- when calling a WASM function via
// callWithString (so first arg is a string), we reuse the
// same string buffer every time as long as the string is
// at most 8KB.  This avoids tons of mallocs, frees, saves
// memory, and gives an order of magnitude speedup.
const SMALL_STRING_SIZE = 1024 * 8;

export default class WasmInstance extends EventEmitter {
  result: any = undefined;
  resultException: boolean = false;
  exports: { [name: string]: any };
  instance: any; // todo
  memory: WebAssembly.Memory;
  smallStringPtr?: number;
  // functions never go away and getFunction is expensive if
  // it has to use the table, and same function gets called often,
  // so this is well worth doing.
  _getFunctionCache: { [name: string]: Function } = {};

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
  // run a wasm module
  run?: (path: string) => number;
  // a collection of posix functions missing from WASI that are best
  // implemented in Javascript (to get access to the environment).
  posixContext?: PosixContext;

  public send: SendToWasm;
  public recv: RecvFromWasm;

  constructor(
    instance,
    memory: WebAssembly.Memory,
    fs?: WASIFileSystem,
    table?: WebAssembly.Table
  ) {
    super();
    this.exports = instance.exports;
    this.instance = instance;
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

  // When you pass str of type str[] it calls name with (len(str), char**, ...).
  // i.e., it's the main call signature than than null terminate char** like some
  // C library code.
  callWithString(name: string, str: string | string[], ...args): any {
    this.result = undefined;
    this.resultException = false;
    const f = this.getFunction(name);
    if (f == null) {
      throw Error(`no function "${name}" defined in wasm module`);
    }
    let r;
    if (typeof str == "string") {
      const strAsArray = encoder.encode(str);
      if (strAsArray.length < SMALL_STRING_SIZE) {
        r = this.callWithSmallString(f, strAsArray);
        return this.result ?? r;
      }
      const ptr = this.send.encodedString(strAsArray);
      try {
        // @ts-ignore
        r = f(ptr, ...args);
      } finally {
        // @ts-ignore
        this.exports.c_free(ptr);
      }
    } else {
      // TODO: solve problem in more generality, obviously!
      // Convert array of strings to char** of null terminated
      // strings, with a null char* at the end as well (common for clib functions)
      const ptrs: number[] = [];
      for (const s of str) {
        ptrs.push(this.send.string(s));
      }
      const len = ptrs.length;
      const ptr = this.exports.c_malloc((len + 1) * 4); // sizeof(char*) = 4 in WASM.
      const array = new Int32Array(this.memory.buffer, ptr, len + 1);
      let i = 0;
      for (const p of ptrs) {
        array[i] = p;
        i += 1;
      }
      array[len] = 0; // final null pointer.
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

  private getSmallStringPtr(): number {
    if (this.smallStringPtr == null) {
      this.smallStringPtr = this.exports.c_malloc(SMALL_STRING_SIZE);
      if (!this.smallStringPtr) {
        throw Error(
          "MemoryError -- out of memory allocating small string buffer"
        );
      }
    }
    return this.smallStringPtr;
  }

  private callWithSmallString(f: Function, strAsArray, ...args): any {
    const ptr = this.getSmallStringPtr();
    const len = strAsArray.length + 1;
    const array = new Int8Array(this.memory.buffer, ptr, len);
    array.set(strAsArray);
    array[len - 1] = 0;
    return f(ptr, ...args);
  }

  // - If dll is not given gets a function from the main instance
  //   or undefined if the function is not defined.
  // - If dll is given, loads the given dynamic library (if it isn't
  //   already loaded), then gets the named function from there.  In the
  //   dll case throws an error explaining what went wrong if anything
  //   goes wrong, rather than undefined (since a lot can go wrong).
  //   TODO: maybe getFunction should throw instead of returning undefined
  //   in all cases?
  // Any successful call to getFunction is cached.
  public getFunction(name: string, dll?: string): Function | undefined {
    const key = name + (dll ?? "");
    const f = this._getFunctionCache[key];
    if (f != null) return f;
    if (dll != null) {
      const f = this.getFunctionUsingDlopen(name, dll);
      this._getFunctionCache[key] = f;
      return f;
    }
    if (this.table != null) {
      // first try pointer:
      const getPtr = this.exports[`__WASM_EXPORT__${name}`];
      if (getPtr != null) {
        const f = this.table.get(getPtr());
        if (f != null) {
          this._getFunctionCache[key] = f;
          return f;
        }
      }
    }
    // little advantage to caching this:
    return this.exports[name] ?? this.instance.env[name];
  }

  // Opens dynamic library if not already open, then gets the function.
  // Throws errors if anything doesn't exist or work.
  private getFunctionUsingDlopen(name: string, path: string): Function {
    const handle = this.callWithString("dlopen", path);
    const dlsym = this.getFunction("dlsym");
    if (dlsym == null) {
      throw Error("dlsym must be defined");
    }
    const ptr = this.getSmallStringPtr();
    this.send.string(name, { ptr, len: SMALL_STRING_SIZE });
    const fPtr = dlsym(handle, ptr);
    return this.table?.get(fPtr);
  }

  // Get the current working directory in the WASM instance.
  // The motivation for implementing this and ensuring it is fast
  // is that we need it when calling things like exec in our
  // posix compat layer, since we must ensure the host runtime
  // has the same working directory before any posix call that
  // uses the host.
  public getcwd(): string {
    const getcwd = this.getFunction("getcwd");
    if (getcwd == null) {
      // this should be enforced by dylink and libc.
      throw Error("C library function getcwd must be exported");
    }
    return this.recv.string(
      getcwd(this.getSmallStringPtr(), SMALL_STRING_SIZE)
    );
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
