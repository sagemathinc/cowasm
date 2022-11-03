import { alignMemory, recvString, sendString } from "./util";
import { Env, Library } from "./types";
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
  private _malloc?: (number) => number;
  private _free?: (number) => void;
  private memory: WebAssembly.Memory;
  private functionTable: FunctionTable;
  private globalOffsetTable: GlobalOffsetTable;
  private pathToLibrary: { [path: string]: Library } = {};
  private handleToLibrary: { [handle: number]: Library } = {};
  private readFileSync: (path: string) => Buffer;
  private importObject: { env?: Env; wasi_snapshot_preview1?: any };
  private mainGetFunction: (
    name: string,
    path?: string
  ) => Function | null | undefined;
  private importWebAssemblySync: (
    path: string,
    importObject: object
  ) => WebAssembly.Instance;
  private getMainInstanceExports: () => { [key: string]: any };

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
    getMainInstanceExports: () => { [key: string]: any }
  ) {
    this.mainGetFunction = getFunction;
    this.memory = memory;
    this.globalOffsetTable = globalOffsetTable;
    this.functionTable = functionTable;
    this.readFileSync = readFileSync;
    this.importObject = importObject;
    this.importWebAssemblySync = importWebAssemblySync;
    this.getMainInstanceExports = getMainInstanceExports;
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
      this.free = f as (number) => number;
    }
    this.free(ptr);
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

  dlopen(pathnamePtr: number, _flags: number): number {
    // TODO: _flags are ignored for now.
    if (this.memory == null) throw Error("bug"); // mainly for typescript
    const path = recvString(pathnamePtr, this.memory);
    log("dlopen: path='%s'", path);
    if (this.pathToLibrary[path] != null) {
      return this.pathToLibrary[path].handle;
    }

    const binary = new Uint8Array(this.readFileSync(path));
    const metadata = getMetadata(binary);
    log("metadata", metadata);
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

    const env = {
      memory: this.memory,
      __indirect_function_table: this.functionTable.table,
      __memory_base,
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
    };
    log("env =", env);
    const libImportObject = {
      ...this.importObject,
      env: new Proxy(env, { get: this.dlopenEnvHandler(path) }),
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
    const instance = this.importWebAssemblySync(path, libImportObject);
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
      const f =
        instance.exports[symName] ?? this.getMainInstanceExports()[symName];
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
        const ptr = this.symbolViaPointer(symName);
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

    if (instance.exports.__wasm_call_ctors != null) {
      // This **MUST** be after updating all the values above!!
      log("calling __wasm_call_ctors for dynamic library");
      (instance.exports.__wasm_call_ctors as CallableFunction)();
    }

    if (instance.exports.__wasm_apply_data_relocs != null) {
      // This **MUST** be after updating all the values above!!
      log("calling __wasm_apply_data_relocs for dynamic library");
      (instance.exports.__wasm_apply_data_relocs as CallableFunction)();
    }

    // Get an available handle by maxing all the int versions of the
    // keys of the handleToLibrary map.
    const handle =
      Math.max(
        0,
        ...Object.keys(this.handleToLibrary).map((n) => parseInt(n))
      ) + 1;
    const library = {
      path,
      handle,
      instance,
      symToPtr,
      stack_alloc,
    };
    this.pathToLibrary[path] = library;
    this.handleToLibrary[handle] = library;
    return handle;
  }

  dlsym(handle: number, symbolPtr: number): number {
    const symName = recvString(symbolPtr, this.memory);
    log("dlsym: handle=%s, symName='%s'", handle, symName);
    const lib = this.handleToLibrary[handle];
    if (lib == null) {
      throw Error(`dlsym: invalid handle ${handle}`);
    }
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
    const lib = this.handleToLibrary[handle];
    if (lib == null) {
      this.set_dlerror(`dlclose: invalid handle ${handle}`);
      return 1;
    }
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

  // See if the function we want is defined in some
  // already imported dynamic library:
  getFunction(name: string): Function | null | undefined {
    for (const handle in this.handleToLibrary) {
      const { path, symToPtr, instance } = this.handleToLibrary[handle];
      // two places that could have the pointer:
      const ptr =
        symToPtr[name] ??
        (instance.exports[`__WASM_EXPORT__${name}`] as Function)?.();
      if (ptr != null) {
        log("getFunction", name, path, "handle=", handle);
        return this.functionTable.get(ptr);
      }
    }
    return undefined;
  }
}
