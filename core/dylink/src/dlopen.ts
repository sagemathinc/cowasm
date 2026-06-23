import { alignMemory, recvString, sendString } from "./util";
import { Env, Library, NonMainLibrary } from "./types";
import FunctionTable from "./function-table";
import GlobalOffsetTable from "./global-offset-table";
import debug from "debug";
import getMetadata from "./metadata";

const log = debug("dylink:dlopen");
const STACK_ALIGN = 16; // copied from emscripten

// Stack size for imported dynamic libraries -- we use 1MB. This is
// a runtime parameter.
const STACK_SIZE = 1048576; // 1MB;  to use 64KB it would be 65536.

export default class DlopenManger {
  private dlerrorPtr: number = 0;
  private errnoPtr: number = 0;
  private _malloc?: (number) => number;
  private _free?: (number) => void;
  private memory: WebAssembly.Memory;
  private functionTable: FunctionTable;
  private globalOffsetTable: GlobalOffsetTable;
  private pathToLibrary: { [path: string]: Library } = {};
  private handleToLibrary: { [handle: number]: Library } = {};
  private readFileSync: (path: string) => Buffer;
  private importObject: { env?: Env; wasi_snapshot_preview1?: any };
  private environment: { [name: string]: string | undefined };
  private getenvPtrs: { [name: string]: number } = {};
  private mainGetFunction: (
    name: string,
    path?: string
  ) => Function | null | undefined;
  private importWebAssemblySync: (
    path: string,
    importObject: object
  ) => WebAssembly.Instance;
  private getMainInstanceExports: () => { [key: string]: any };
  private getMainInstance: () => WebAssembly.Instance;

  constructor(
    getFunction: (name: string, path?: string) => Function | null | undefined,
    memory: WebAssembly.Memory,
    globalOffsetTable: GlobalOffsetTable,
    functionTable: FunctionTable,
    readFileSync: (path: string) => Buffer,
    importObject: { env?: Env; wasi_snapshot_preview1?: any },
    importWebAssemblySync: (
      path: string,
      importObject: object
    ) => WebAssembly.Instance,
    getMainInstanceExports: () => { [key: string]: any },
    getMainInstance: () => WebAssembly.Instance,
    environment: { [name: string]: string | undefined } = {}
  ) {
    this.mainGetFunction = getFunction;
    this.memory = memory;
    this.globalOffsetTable = globalOffsetTable;
    this.functionTable = functionTable;
    this.readFileSync = readFileSync;
    this.importObject = importObject;
    this.importWebAssemblySync = importWebAssemblySync;
    this.getMainInstanceExports = getMainInstanceExports;
    this.getMainInstance = getMainInstance;
    this.environment = environment;
  }

  add_dlmethods(env: Env) {
    for (const dlmethod of [
      "dlopen",
      "dladdr",
      "dlclose",
      "dlerror",
      "dlsym",
    ]) {
      env[dlmethod] = this[dlmethod].bind(this);
    }
  }

  getState() {
    const state = new Set<string>();
    for (const handle in this.handleToLibrary) {
      state.add(handle);
    }
    return state;
  }

  setState(state) {
    for (const handle in this.handleToLibrary) {
      if (!state.has(handle)) {
        const lib = this.handleToLibrary[handle];
        if (lib != null && !lib.path) {
          delete this.handleToLibrary[handle];
          delete this.pathToLibrary[lib.path];
          continue;
        }
        this.dlclose(parseInt(handle));
      }
    }
  }

  private malloc(bytes: number, purpose: string): number {
    if (this._malloc == null) {
      const f = this.mainGetFunction("malloc");
      if (f == null) {
        throw Error("malloc from libc must be available in the  main instance");
      }
      this._malloc = f as (number) => number;
    }
    const ptr = this._malloc(bytes);
    if (ptr == 0) {
      const err = `out of memory -- malloc failed allocating ${purpose}`;
      log(err);
      console.warn(err);
      throw Error(err);
    }
    return ptr;
  }

  private free(ptr: number): void {
    if (this._free == null) {
      const f = this.mainGetFunction("free");
      if (f == null) {
        throw Error("free from libc must be available in the  main instance");
      }
      this._free = f as (number) => void;
    }
    this._free(ptr);
  }

  private mainFunction(name: string, path?: string): Function | undefined {
    try {
      const f = this.mainGetFunction(name, path);
      return typeof f == "function" ? f : undefined;
    } catch (_) {
      return undefined;
    }
  }

  private getenv(namePtr: number): number {
    if (!namePtr) {
      return 0;
    }
    const name = recvString(namePtr, this.memory);
    const value = this.environment[name];
    if (value == null) {
      return 0;
    }
    if (this.getenvPtrs[name] == null) {
      const bytes = new TextEncoder().encode(value).byteLength + 1;
      const ptr = this.malloc(bytes, "environment variable " + name);
      sendString(value, ptr, this.memory);
      this.getenvPtrs[name] = ptr;
    }
    return this.getenvPtrs[name];
  }

  dlopenEnvHandler(path: string) {
    return (env, key: string) => {
      if (key in env) {
        return Reflect.get(env, key);
      }
      log("dlopenEnvHandler", key);

      // important to check importObject.env LAST since it could be a proxy
      // that generates stub functions:
      const f = this.mainGetFunction(key, path);
      if (f == null) {
        log("dlopenEnvHandler got null");
        return;
      }
      return f;
      // FOR LOW LEVEL DEBUGGING ONLY!
      //     return (...args) => {
      //       console.log("env call ", key);
      //       // @ts-ignore
      //       return f(...args);
      //     };
    };
  }

  private symbolViaPointer(name: string) {
    const exports = this.getMainInstanceExports();
    if (exports == null) return; // not yet available
    log("symbolViaPointer", name);
    let f = exports[`__WASM_EXPORT__${name}`];
    if (f == null) {
      return null;
    }
    const sym = (f as Function)();
    log("symbolViaPointer", name, "-->", sym);
    return sym;
  }

  private symbolViaPointerFromLibrary(name: string, library: Library) {
    const f = library.instance.exports[`__WASM_EXPORT__${name}`];
    if (typeof f != "function") {
      return undefined;
    }
    const sym = (f as Function)();
    log("symbolViaPointerFromLibrary", name, library.path, "-->", sym);
    return sym;
  }

  private symbolViaPointerFromPaths(name: string, paths: string[]) {
    for (const path of paths) {
      const library = this.pathToLibrary[path];
      if (library == null) continue;
      const ptr = this.symbolViaPointerFromLibrary(name, library);
      if (ptr != null) {
        return ptr;
      }
    }
    return undefined;
  }

  private symbolViaPointerFromLoadedLibraries(name: string) {
    for (const handle in this.handleToLibrary) {
      const library = this.handleToLibrary[handle];
      if (!library.path) continue;
      const ptr = this.symbolViaPointerFromLibrary(name, library);
      if (ptr != null) {
        return ptr;
      }
    }
    return undefined;
  }

  private pathForNeededDynlib(path: string, needed: string): string {
    if (needed.startsWith("/") || needed.startsWith("./")) {
      return needed;
    }
    const i = path.lastIndexOf("/");
    if (i == -1) {
      return `./${needed}`;
    }
    return `${path.slice(0, i + 1)}${needed}`;
  }

  private emscriptenCxxRuntimeImport(name: string): Function | undefined {
    if (name == "strtod_l" || name == "strtof_l") {
      return (nptr: number, endptr: number) => {
        const text = recvString(nptr, this.memory);
        const value = parseFloat(text);
        if (endptr) {
          const match = text.match(/^[\t\n\v\f\r ]*[+-]?(?:inf(?:inity)?|nan|(?:(?:\d+\.?\d*)|(?:\.\d+))(?:[eE][+-]?\d+)?)/i);
          const consumed = match?.[0]?.length ?? 0;
          new DataView(this.memory.buffer).setInt32(endptr, nptr + consumed, true);
        }
        return Number.isNaN(value) ? 0 : value;
      };
    }
    if (name == "strtol_l" || name == "strtoul_l") {
      return (nptr: number, endptr: number, base: number) => {
        const text = recvString(nptr, this.memory);
        const value = parseInt(text, base || 10);
        if (endptr) {
          const match = text.match(/^[\t\n\v\f\r ]*[+-]?(?:0[xX][0-9a-fA-F]+|[0-9a-fA-F]+)/);
          const consumed = match?.[0]?.length ?? 0;
          new DataView(this.memory.buffer).setInt32(endptr, nptr + consumed, true);
        }
        return Number.isNaN(value) ? 0 : value;
      };
    }
    if (name == "strtoll_l" || name == "strtoull_l") {
      return (nptr: number, endptr: number, base: number) => {
        const text = recvString(nptr, this.memory);
        const value = parseInt(text, base || 10);
        if (endptr) {
          const match = text.match(/^[\t\n\v\f\r ]*[+-]?(?:0[xX][0-9a-fA-F]+|[0-9a-fA-F]+)/);
          const consumed = match?.[0]?.length ?? 0;
          new DataView(this.memory.buffer).setInt32(endptr, nptr + consumed, true);
        }
        return BigInt(Number.isNaN(value) ? 0 : value);
      };
    }
    if (name == "__errno_location") {
      return () => {
        if (!this.errnoPtr) {
          this.errnoPtr = this.malloc(4, "errno");
          new DataView(this.memory.buffer).setInt32(this.errnoPtr, 0, true);
        }
        return this.errnoPtr;
      };
    }
    if (name == "__cxa_atexit") {
      return () => 0;
    }
    if (name == "__cxa_begin_catch") {
      return (ptr: number) => ptr;
    }
    if (name == "__cxa_find_matching_catch_2") {
      return () => 0;
    }
    if (name == "__cxa_find_matching_catch_3") {
      return (ptr: number) => ptr;
    }
    if (name == "__cxa_current_primary_exception") {
      return () => 0;
    }
    if (name == "__cxa_uncaught_exceptions") {
      return () => 0;
    }
    if (name == "__cxa_end_catch") {
      return () => {};
    }
    if (
      name == "__cxa_rethrow" ||
      name == "__cxa_rethrow_primary_exception" ||
      name == "__cxa_throw" ||
      name == "__resumeException"
    ) {
      return () => {
        throw Error(`${name} is not supported by the CoWasm C++ runtime`);
      };
    }
    if (name == "getTempRet0") {
      return () => 0;
    }
    if (name == "mprotect") {
      return () => 0;
    }
    if (name == "_emscripten_throw_longjmp") {
      return () => {
        throw Error("longjmp is not supported by the CoWasm C++ runtime");
      };
    }
    if (name == "__wasm_setjmp" || name == "__wasm_setjmp_test") {
      return () => 0;
    }
    if (name == "__wasm_longjmp" || name == "__c_longjmp") {
      return () => {
        throw Error(`${name} is not supported by the CoWasm dynamic linker`);
      };
    }
    if (
      name.startsWith("pthread_mutex") ||
      name.startsWith("pthread_cond") ||
      name == "pthread_key_create" ||
      name == "pthread_once" ||
      name == "pthread_setspecific" ||
      name == "pthread_getspecific" ||
      name == "pthread_self" ||
      name == "pthread_detach" ||
      name == "pthread_join"
    ) {
      return () => 0;
    }
    return undefined;
  }

  dlopen(pathnamePtr: number, _flags: number): number {
    // TODO: _flags are ignored for now.
    if (this.memory == null) throw Error("bug"); // mainly for typescript

    // pathnamePtr = null *is* valid and means "the main program", i.e.,
    // "If filename is NULL, then the returned handle is for the main program."
    // For example, this null is used by ctypes (in cpython) in the
    // __init__.py in the line "pythonapi = PyDLL(None)".  In all our
    // code we treat the null pointer the same as path="", for simplicity
    // of data types (easy in Javascript).

    const path = !pathnamePtr ? "" : recvString(pathnamePtr, this.memory);
    log("dlopen: path='%s'", path);
    if (this.pathToLibrary[path] != null) {
      return this.pathToLibrary[path].handle;
    }
    if (!path) {
      return this.createLibrary({ path, instance: this.getMainInstance() });
    }

    const binary = new Uint8Array(this.readFileSync(path));
    const metadata = getMetadata(binary);
    log("metadata", metadata);

    const neededPaths: string[] = [];
    for (const needed of metadata.neededDynlibs) {
      const neededPath = this.pathForNeededDynlib(path, needed);
      neededPaths.push(neededPath);
      const neededPathPtr = this.malloc(
        neededPath.length + 1,
        "path for " + neededPath
      );
      sendString(neededPath, neededPathPtr, this.memory);
      this.dlopen(neededPathPtr, _flags);
      this.free(neededPathPtr);
    }

    const module = new WebAssembly.Module(binary);
    const selfFunctionExports = new Set(
      WebAssembly.Module.exports(module)
        .filter(({ kind }) => kind == "function")
        .map(({ name }) => name)
    );
    let instance: WebAssembly.Instance | undefined = undefined;

    // alignments are powers of 2
    let memAlign = Math.pow(2, metadata.memoryAlign ?? 0);
    // finalize alignments and verify them
    memAlign = Math.max(memAlign, STACK_ALIGN); // we at least need stack alignment
    if (metadata.memorySize == null) {
      throw Error("memorySize must be defined in the shared library");
    }
    const alloc = this.malloc(
      metadata.memorySize + memAlign,
      "space for " + path
    );
    const stack_alloc = this.malloc(STACK_SIZE, "stack for " + path);

    log(
      "allocating %s bytes for shared library -- at ",
      metadata.memorySize + memAlign,
      alloc
    );
    const __memory_base = metadata.memorySize
      ? alignMemory(alloc, memAlign)
      : 0;
    const __table_base = metadata.tableSize
      ? this.functionTable.getNextTablePos()
      : 0;
    if (__memory_base != 0) {
      new Uint8Array(
        this.memory.buffer,
        __memory_base,
        metadata.memorySize
      ).fill(0);
    }

    const byteChar = (c: number) => c & 0xff;
    const isDigit = (c: number) => c >= 48 && c <= 57;
    const isLower = (c: number) => c >= 97 && c <= 122;
    const isUpper = (c: number) => c >= 65 && c <= 90;
    const isAlpha = (c: number) => isLower(c) || isUpper(c);
    const isSpace = (c: number) =>
      c == 32 || c == 9 || c == 10 || c == 11 || c == 12 || c == 13;
    const isGraph = (c: number) => c >= 33 && c <= 126;

    const env = {
      memory: this.memory,
      __indirect_function_table: this.functionTable.table,
      __memory_base,
      __memory_size: () => metadata.memorySize ?? 0,
      __table_base,
      __stack_pointer: new WebAssembly.Global(
        {
          value: "i32",
          mutable: true,
        },
        // This is a pointer to the top of the memory we allocated
        // for this dynamic library's stack, since the stack grows
        // down, in terms of memory addresses.
        stack_alloc + STACK_SIZE
      ),
      __c_longjmp: new (WebAssembly as any).Tag({
        parameters: ["i32"],
        results: [],
      }),
      malloc: (bytes: number) => this.malloc(bytes, "dynamic library malloc"),
      free: (ptr: number) => this.free(ptr),
      calloc: (nmemb: number, size: number) => {
        const bytes = nmemb * size;
        const ptr = this.malloc(bytes, "dynamic library calloc");
        new Uint8Array(this.memory.buffer, ptr, bytes).fill(0);
        return ptr;
      },
      realloc: (ptr: number, size: number) => {
        if (!ptr) {
          return this.malloc(size, "dynamic library realloc");
        }
        if (!size) {
          this.free(ptr);
          return 0;
        }
        const next = this.malloc(size, "dynamic library realloc");
        new Uint8Array(this.memory.buffer).copyWithin(next, ptr, ptr + size);
        return next;
      },
      abort: () => {
        throw Error("abort called from dynamic library");
      },
      clock: () => BigInt(Date.now()),
      isalnum: (c: number) => {
        c = byteChar(c);
        return isAlpha(c) || isDigit(c) ? 1 : 0;
      },
      isalpha: (c: number) => {
        c = byteChar(c);
        return isAlpha(c) ? 1 : 0;
      },
      isblank: (c: number) => {
        c = byteChar(c);
        return c == 32 || c == 9 ? 1 : 0;
      },
      iscntrl: (c: number) => {
        c = byteChar(c);
        return c < 32 || c == 127 ? 1 : 0;
      },
      isdigit: (c: number) => {
        c = byteChar(c);
        return isDigit(c) ? 1 : 0;
      },
      isgraph: (c: number) => {
        c = byteChar(c);
        return isGraph(c) ? 1 : 0;
      },
      islower: (c: number) => {
        c = byteChar(c);
        return isLower(c) ? 1 : 0;
      },
      isprint: (c: number) => {
        c = byteChar(c);
        return c >= 32 && c <= 126 ? 1 : 0;
      },
      ispunct: (c: number) => {
        c = byteChar(c);
        return isGraph(c) && !isAlpha(c) && !isDigit(c) ? 1 : 0;
      },
      isspace: (c: number) => {
        c = byteChar(c);
        return isSpace(c) ? 1 : 0;
      },
      isupper: (c: number) => {
        c = byteChar(c);
        return isUpper(c) ? 1 : 0;
      },
      isxdigit: (c: number) => {
        c = byteChar(c);
        return isDigit(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102)
          ? 1
          : 0;
      },
      fprintf: () => 0,
      fclose: () => 0,
      getenv: (namePtr: number) => this.getenv(namePtr),
      printf: () => 0,
      qsort: (
        base: number,
        nmemb: number,
        size: number,
        comparPtr: number
      ) => {
        const compare = this.functionTable.get(comparPtr);
        if (typeof compare != "function") {
          throw Error(`qsort called with invalid comparator ${comparPtr}`);
        }
        if (nmemb <= 1 || size <= 0) {
          return;
        }
        const memory = new Uint8Array(this.memory.buffer);
        const tmp = new Uint8Array(size);
        const elementPtr = (i: number) => base + i * size;
        for (let i = 0; i < nmemb - 1; i += 1) {
          let min = i;
          for (let j = i + 1; j < nmemb; j += 1) {
            if (
              (compare as CallableFunction)(elementPtr(j), elementPtr(min)) < 0
            ) {
              min = j;
            }
          }
          if (min != i) {
            tmp.set(memory.subarray(elementPtr(i), elementPtr(i) + size));
            memory.copyWithin(
              elementPtr(i),
              elementPtr(min),
              elementPtr(min) + size
            );
            memory.set(tmp, elementPtr(min));
          }
        }
      },
      snprintf: (str: number, size: number) => {
        if (str && size > 0) {
          new Uint8Array(this.memory.buffer)[str] = 0;
        }
        return 0;
      },
      sprintf: (str: number) => {
        if (str) {
          new Uint8Array(this.memory.buffer)[str] = 0;
        }
        return 0;
      },
      vfprintf: () => 0,
      vprintf: () => 0,
      vsnprintf: (str: number, size: number) => {
        if (str && size > 0) {
          new Uint8Array(this.memory.buffer)[str] = 0;
        }
        return 0;
      },
      vsprintf: (str: number) => {
        if (str) {
          new Uint8Array(this.memory.buffer)[str] = 0;
        }
        return 0;
      },
      time: (ptr: number) => {
        const seconds = BigInt(Math.floor(Date.now() / 1000));
        if (ptr) {
          new DataView(this.memory.buffer).setBigInt64(ptr, seconds, true);
        }
        return seconds;
      },
      tolower: (c: number) => {
        c = byteChar(c);
        return isUpper(c) ? c + 32 : c;
      },
      toupper: (c: number) => {
        c = byteChar(c);
        return isLower(c) ? c - 32 : c;
      },
      wcslen: (ptr: number) => {
        const view = new DataView(this.memory.buffer);
        let len = 0;
        while (view.getUint32(ptr + len * 4, true) != 0) {
          len += 1;
        }
        return len;
      },
      secure_getenv: (namePtr: number) => this.getenv(namePtr),
    };
    Object.assign(env, {
      acos: Math.acos,
      acosf: Math.acos,
      asin: Math.asin,
      asinf: Math.asin,
      atan: Math.atan,
      atan2: Math.atan2,
      atan2f: Math.atan2,
      atanf: Math.atan,
      ceil: Math.ceil,
      ceilf: Math.ceil,
      cos: Math.cos,
      cosf: Math.cos,
      exp: Math.exp,
      exp2: (x: number) => 2 ** x,
      exp2f: (x: number) => 2 ** x,
      expf: Math.exp,
      fabs: Math.abs,
      fabsf: Math.abs,
      floor: Math.floor,
      floorf: Math.floor,
      fmax: Math.max,
      fmaxf: Math.max,
      fmin: Math.min,
      fminf: Math.min,
      fmod: (x: number, y: number) => x % y,
      fmodf: (x: number, y: number) => x % y,
      frexp: (x: number, expPtr: number) => {
        if (x == 0 || !Number.isFinite(x)) {
          if (expPtr) {
            new DataView(this.memory.buffer).setInt32(expPtr, 0, true);
          }
          return x;
        }
        const exponent = Math.floor(Math.log2(Math.abs(x))) + 1;
        if (expPtr) {
          new DataView(this.memory.buffer).setInt32(expPtr, exponent, true);
        }
        return x / 2 ** exponent;
      },
      frexpf: (x: number, expPtr: number) => {
        if (x == 0 || !Number.isFinite(x)) {
          if (expPtr) {
            new DataView(this.memory.buffer).setInt32(expPtr, 0, true);
          }
          return x;
        }
        const exponent = Math.floor(Math.log2(Math.abs(x))) + 1;
        if (expPtr) {
          new DataView(this.memory.buffer).setInt32(expPtr, exponent, true);
        }
        return x / 2 ** exponent;
      },
      hypot: Math.hypot,
      hypotf: Math.hypot,
      ldexp: (x: number, exp: number) => x * 2 ** exp,
      ldexpf: (x: number, exp: number) => x * 2 ** exp,
      log: Math.log,
      log10: Math.log10,
      log10f: Math.log10,
      log2: Math.log2,
      log2f: Math.log2,
      logf: Math.log,
      pow: Math.pow,
      powf: Math.pow,
      round: Math.round,
      roundf: Math.round,
      sin: Math.sin,
      sinf: Math.sin,
      sqrt: Math.sqrt,
      sqrtf: Math.sqrt,
      tan: Math.tan,
      tanf: Math.tan,
      trunc: Math.trunc,
      truncf: Math.trunc,
    });
    for (const name of [
      "abort",
      "calloc",
      "fclose",
      "fflush",
      "fprintf",
      "fputc",
      "fputs",
      "fwrite",
      "printf",
      "realloc",
      "snprintf",
      "sprintf",
      "vfprintf",
      "vprintf",
      "vsnprintf",
      "vsprintf",
    ]) {
      const f = this.mainFunction(name, path);
      if (f != null) {
        env[name] = f;
      }
    }
    log("env =", env);
    const envHandler = (env, key: string) => {
      if (key in env) {
        return Reflect.get(env, key);
      }
      log("dlopenEnvHandler", key);

      if (selfFunctionExports.has(key)) {
        return (...args: any[]) => {
          const f = instance?.exports[key];
          if (typeof f != "function") {
            throw Error(
              `dlopen -- self import '${key}' was called before '${path}' finished loading`
            );
          }
          return (f as CallableFunction)(...args);
        };
      }

      let f: Function | null | undefined = this.getFunctionFromPaths(
        key,
        neededPaths
      );
      if (typeof f == "function") {
        return f;
      }

      f = this.getFunction(key);
      if (typeof f == "function") {
        return f;
      }

      // Prefer wasm exports from the main module. JS functions can satisfy
      // normal env imports, but they cannot be stored in a wasm funcref table.
      try {
        f = this.mainGetFunction(key, path);
      } catch (_) {
        f = undefined;
      }
      if (typeof f == "function") {
        return (...args: any[]) => {
          try {
            return (f as CallableFunction)(...args);
          } catch (err) {
            log("direct import failed", key, args, err);
            throw err;
          }
        };
      }

      f = this.emscriptenCxxRuntimeImport(key);
      if (f != null) {
        return f;
      }

      if (key.startsWith("invoke_")) {
        return (fPtr: number, ...args: any[]) => {
          if (!fPtr) {
            const resultType = key.slice("invoke_".length, "invoke_".length + 1);
            if (resultType == "v") {
              return;
            }
            if (resultType == "j") {
              return BigInt(0);
            }
            return 0;
          }
          const f = this.functionTable.get(fPtr);
          if (typeof f != "function") {
            throw Error(`dlopen -- invoke import '${key}' got invalid function pointer ${fPtr}`);
          }
          return (f as CallableFunction)(...args);
        };
      }

      log("dlopenEnvHandler got null");
      return;
    };
    const libImportObject = {
      ...this.importObject,
      env: new Proxy(env, { get: envHandler }),
      "GOT.mem": this.globalOffsetTable.mem,
      "GOT.func": this.globalOffsetTable.func,
    };

    // account for the entries that got inserted during the import.
    // This must happen BEFORE the import, since that will create some
    // new entries to get put in the table below, and the import itself
    // will put entries from the current position up to metadata.tableSize
    // positions forward.
    if (metadata.tableSize) {
      this.functionTable.prepareForImport(metadata.tableSize);
    }

    let t0 = 0;
    if (log.enabled) {
      t0 = new Date().valueOf();
      log("importing ", path);
    }
    instance = this.importWebAssemblySync(path, libImportObject);
    if (log.enabled) {
      log("imported ", path, ", time =", new Date().valueOf() - t0, "ms");
    }

    const symToPtr: { [symName: string]: number } = {};
    for (const name in instance.exports) {
      if (this.globalOffsetTable.funcMap[name] != null) continue;
      const val = instance.exports[name];
      if (symToPtr[name] != null || typeof val != "function") continue;
      symToPtr[name] = this.functionTable.set(val as Function);
    }

    // Set all functions in the function table that couldn't
    // be resolved to pointers when creating the webassembly module.
    for (const symName in this.globalOffsetTable.funcMap) {
      let libraryFunction: Function | null | undefined =
        this.getFunctionFromPaths(symName, neededPaths) ??
        this.getFunction(symName);
      if (typeof libraryFunction != "function") {
        libraryFunction = undefined;
      }
      let mainFunction: Function | null | undefined;
      try {
        mainFunction = this.mainGetFunction(symName, path);
      } catch (_) {
        mainFunction = undefined;
      }
      if (typeof mainFunction != "function") {
        mainFunction = undefined;
      }
      const f =
        instance.exports[symName] ??
        libraryFunction ??
        mainFunction ??
        this.emscriptenCxxRuntimeImport(symName) ??
        this.getMainInstanceExports()[symName];
      log(
        "table[%s] = %s",
        this.globalOffsetTable.funcMap[symName]?.index,
        symName,
        f
      );
      if (f == null) {
        // This has to be a fatal error, since the only other option would
        // be having a pointer to random nonsense or a broke function,
        // which is definitely going to segfault randomly later when it
        // gets hit by running code. See comments above in GOTFuncHandler.
        throw Error(`dlopen -- UNRESOLVED FUNCTION: ${symName}`);
      }
      this.globalOffsetTable.funcMap[symName].set(f as Function);
      symToPtr[symName] = this.globalOffsetTable.funcMap[symName].index;
      delete this.globalOffsetTable.funcMap[symName];
    }
    const { memMap } = this.globalOffsetTable;
    for (const symName in memMap) {
      const x = memMap[symName];
      delete memMap[symName];
      const ptrBeforeOffset = (instance.exports[symName] as any)?.value;
      if (ptrBeforeOffset == null) {
        const ptr =
          this.symbolViaPointerFromPaths(symName, neededPaths) ??
          this.symbolViaPointerFromLoadedLibraries(symName) ??
          this.symbolViaPointer(symName);
        if (ptr == null) {
          console.error(
            `dlopen: FATAL ERROR - Symbol '${symName}' is not available in the cowasm kernel or any loaded library via __WASM_EXPORT__${symName} but is required by '${path}'.`
          );
          throw Error(`dlopen -- UNRESOLVED SYMBOL: ${symName}`);
        } else {
          //console.log("found ", symName, " in global");
          x.value = ptr;
        }
      } else {
        x.value = ptrBeforeOffset + __memory_base;
        //console.log("putting ", symName, " in offset");
      }
    }

    if (instance.exports.__wasm_apply_data_relocs != null) {
      // This must run after GOT values are updated and before constructors.
      log("calling __wasm_apply_data_relocs for dynamic library");
      (instance.exports.__wasm_apply_data_relocs as CallableFunction)();
    }

    if (
      instance.exports.__wasm_call_ctors != null &&
      !path.endsWith("/libcxx.so") &&
      path != "libcxx.so" &&
      path != "./libcxx.so"
    ) {
      log("calling __wasm_call_ctors for dynamic library");
      (instance.exports.__wasm_call_ctors as CallableFunction)();
    }

    return this.createLibrary({
      path,
      instance,
      symToPtr,
      stack_alloc,
    });
  }

  dlsym(handle: number, symbolPtr: number): number {
    const symName = recvString(symbolPtr, this.memory);
    return this._dlsym(handle, symName);
  }

  private _dlsym(handle: number, symName: string): number {
    log("_dlsym: handle=%s, symName='%s'", handle, symName);
    const lib0 = this.handleToLibrary[handle];
    if (lib0 == null) {
      throw Error(`dlsym: invalid handle ${handle}`);
    }

    if (!lib0.path) {
      // special case -- the the main instance and because of how we run programs, every other library
      const ptr = (
        lib0.instance.exports[`__WASM_EXPORT__${symName}`] as any
      )?.();
      if (ptr != null) {
        return ptr;
      }
      // now try the others
      for (const h in this.handleToLibrary) {
        const handle2 = parseInt(h);
        if (handle != handle2) {
          try {
            return this._dlsym(handle2, symName);
          } catch (_) {}
        }
      }

      // didn't find it
      this.set_dlerror(`dlsym: handle=${handle} - unknown symbol '${symName}'`);
      return 0;
    }

    const lib = lib0 as NonMainLibrary;
    let ptr = lib.symToPtr[symName];
    log("sym= ", symName, ", ptr = ", ptr);
    if (ptr != null) {
      // symbol is a known function pointer
      return ptr;
    }

    // sometimes its an alias:
    ptr = (lib.instance.exports[`__WASM_EXPORT__${symName}`] as any)?.();
    if (ptr != null) {
      // symbol is a known function pointer
      return ptr;
    }

    // NOT sure if this is at all correct or meaningful or what to even
    // do with non functions!
    // dlsym is supposed to return a null pointer on fail, NOT throw exception
    this.set_dlerror(`dlsym: handle=${handle} - unknown symbol '${symName}'`);
    return 0;
  }

  dladdr() {
    log("dladdr: NOT IMPLEMENTED");
    // we couldn't find "it"
    this.set_dlerror("dladdr is not yet implemented");
    return 0;
  }

  /*
  "The function dlclose() decrements the reference count on the dynamic library
  handle handle. If the reference count drops to zero and no other loaded
  libraries use symbols in it, then the dynamic library is unloaded. The function
  dlclose() returns 0 on success, and nonzero on error."
  TODO: we do not track "other libraries use symbols in it" yet, so this is very
  much NOT safe to use if you don't know that it isn't being referenced.
  */
  dlclose(handle: number): number {
    log("dlclose", handle);
    const lib0 = this.handleToLibrary[handle];
    if (lib0 == null) {
      this.set_dlerror(`dlclose: invalid handle ${handle}`);
      return 1;
    }
    if (!lib0.path) {
      // it's the main library
      return 0;
    }
    const lib = lib0 as NonMainLibrary;
    if (lib != null) {
      for (const name in lib.symToPtr) {
        const ptr = lib.symToPtr[name];
        this.functionTable.delete(ptr);
      }
      this.free(lib.stack_alloc);
      // console.log("closing ", lib);
      delete this.handleToLibrary[handle];
      delete this.pathToLibrary[lib.path];
      // need to free the allocated functions.
    }
    return 0;
  }

  set_dlerror(s: string) {
    if (!this.dlerrorPtr) {
      // allocate space for the error
      this.dlerrorPtr = this.malloc(1024, "dlerror pointer");
    }
    sendString(s.slice(0, 1023), this.dlerrorPtr, this.memory);
  }
  /*
  "The function dlerror() returns a human readable string describing the most
  recent error that occurred from dlopen(), dlsym() or dlclose() since the last
  call to dlerror(). It returns NULL if no errors have occurred since
  initialization or since it was last called."
  */
  dlerror() {
    return this.dlerrorPtr;
  }

  private getFunctionFromLibrary(
    name: string,
    library: Library
  ): Function | null | undefined {
    // Two places that could have the pointer:
    const ptr =
      library.symToPtr?.[name] ??
      (library.instance.exports[`__WASM_EXPORT__${name}`] as Function)?.();
    if (ptr != null) {
      const f = this.functionTable.get(ptr);
      return typeof f == "function" ? f : undefined;
    }
    return undefined;
  }

  private getFunctionFromPaths(
    name: string,
    paths: string[]
  ): Function | null | undefined {
    for (const path of paths) {
      const library = this.pathToLibrary[path];
      if (library == null) continue;
      const f = this.getFunctionFromLibrary(name, library);
      if (f != null) {
        log("getFunctionFromPaths", name, path, "handle=", library.handle);
        return f;
      }
    }
    return undefined;
  }

  // See if the function we want is defined in some
  // already imported dynamic library:
  getFunction(name: string): Function | null | undefined {
    for (const handle in this.handleToLibrary) {
      const library = this.handleToLibrary[handle];
      const f = this.getFunctionFromLibrary(name, library);
      if (f != null) {
        log("getFunction", name, library.path, "handle=", handle);
        return f;
      }
    }
    return undefined;
  }

  createLibrary({
    path,
    instance,
    symToPtr,
    stack_alloc,
  }: PartialBy<Library, 'handle'>): number {
    // Get an available handle by maxing all the int versions of the
    // keys of the handleToLibrary map.
    const handle =
      Math.max(
        0,
        ...Object.keys(this.handleToLibrary).map((n) => parseInt(n))
      ) + 1;

    const library = { path, handle, instance, symToPtr, stack_alloc };
    this.pathToLibrary[path] = library;
    this.handleToLibrary[handle] = library;
    return handle;
  }
}
// https://stackoverflow.com/questions/43159887/make-a-single-property-optional-in-typescript
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
