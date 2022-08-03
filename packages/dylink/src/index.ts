import { alignMemory, nonzeroPositions, recvString } from "./util";
import getMetadata from "./metadata";
import stubProxy from "./stub";
import debug from "debug";
const log = debug("dylink");

const STACK_ALIGN = 16; // copied from emscripten

interface Env {
  __indirect_function_table?: WebAssembly.Table;
  memory?: WebAssembly.Memory;
  dlopen?: (pathnamePtr: number, flags: number) => number;
  dlsym?: (handle: number, symbolPtr: number) => number;
}

interface Input {
  path: string;
  importObject?: { env?: Env; wasi_snapshot_preview1?: any };
  importWebAssembly?: (
    path: string,
    importObject: object
  ) => Promise<WebAssembly.Instance>;
  importWebAssemblySync: (
    path: string,
    importObject: object
  ) => WebAssembly.Instance;
  readFileSync: (path: string) => any; // todo?
  stub?: boolean; // if true, automatically generate stub functions.
  traceStub?: boolean | "first";
}

export default async function importWebAssemblyDlopen({
  path,
  importObject,
  importWebAssembly,
  importWebAssemblySync,
  readFileSync,
  stub,
  traceStub,
}: Input): Promise<WebAssembly.Instance> {
  if (importObject == null) {
    importObject = {} as { env?: Partial<Env> };
  }
  let { env } = importObject;
  if (env == null) {
    env = importObject.env = {};
  }
  let { memory } = env;
  if (memory == null) {
    memory = env.memory = new WebAssembly.Memory({
      initial: 10,
      maximum: 1000,
    });
  }
  let { __indirect_function_table } = env;
  if (__indirect_function_table == null) {
    // TODO: Make the 1000 bigger if your main module has a large number of function pointers
    // Maybe we need to parse the wasm bundle in general (that's what emscripten does).
    __indirect_function_table = env.__indirect_function_table =
      new WebAssembly.Table({ initial: 1000, element: "anyfunc" });
  }

  function symbolViaPointer(key: string) {
    log("functionViaPointer", key);
    const f = mainInstance.exports[`__WASM_EXPORT__${key}`];
    if (f == null) return;
    return (f as Function)();
  }

  function functionViaPointer(key: string) {
    log("functionViaPointer", key);
    const f = mainInstance.exports[`__WASM_EXPORT__${key}`];
    if (f == null) return;
    const ptr = (f as Function)();
    if (__indirect_function_table == null) {
      throw Error("__indirect_function_table must be defined");
    }
    return __indirect_function_table.get(ptr);
  }

  function setTable(index: number, f: Function): void {
    if (__indirect_function_table == null) {
      throw Error("__indirect_function_table must be defined");
    }
    if (__indirect_function_table.get(index)) {
      throw Error(`setTable: attempt to overwrite existing function! ${index}`);
    }
    if (__indirect_function_table.length <= index + 50) {
      __indirect_function_table.grow(50);
    }
    log("setTable ", index, typeof index, f, typeof f);
    __indirect_function_table.set(index, f);
  }

  function getFunction(name: string): Function | undefined {
    return (
      ((importObject?.env?.[name] ??
        functionViaPointer(name) ??
        mainInstance.exports[name]) as any) ?? importObjectWithStub.env[name]
    );
  }

  function dlopenEnvHandler(env, key: string) {
    if (key in env) {
      return Reflect.get(env, key);
    }
    log("dlopenEnvHandler", key);

    // important to check importObject.env LAST since it could be a proxy
    // that generates stub functions:
    const f = getFunction(key);
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
  }

  // Global Offset Table
  const GOT = {};
  function GOTMemHandler(GOT, key: string) {
    if (key in GOT) {
      return Reflect.get(GOT, key);
    }
    /*
    The spec has the following (garbled?) statement about what this is:
    "However since exports are static, modules connect [sic -- cannot?]
    export the final relocated addresses (i.e. they cannot add
    __memory_base before exporting). Thus, the exported address is
    before relocation; the loader, which knows __memory_base, can
    then calculate the final relocated address."

    In any case, what we need to do here is return the *memory address*
    of the variable with name key.  For example, if key='stdin', we
    are returning the address of the stdin file descriptor (that integer).
    */
    let rtn = GOT[key];
    if (!rtn) {
      // @ts-ignore
      log("GOTMemHandler ", key, "-->", mainInstance.exports[key]?.value);
      let ptr = symbolViaPointer(key) ?? (mainInstance.exports[key] as any)?.value;
      if (ptr == null) {
        throw Error(
          `to load this dynamic library, the main module must export "${key}"`
        );
      }
      rtn = GOT[key] = new WebAssembly.Global(
        {
          value: "i32",
          mutable: true,
        },
        ptr
      );
    }
    return rtn;
  }
  const funcMap = {};
  function GOTFuncHandler(GOT, key: string) {
    if (key in GOT) {
      return Reflect.get(GOT, key);
    }
    let rtn = GOT[key];
    if (!rtn) {
      log("GOTFuncHandler ", key, "-->", nextTablePos);
      // place in the table -- we make a note of where to put it,
      // and actually place it later below after the import is done.
      const ptr = new WebAssembly.Global(
        {
          value: "i32",
          mutable: true,
        },
        nextTablePos
      );
      rtn = GOT[key] = funcMap[key] = ptr;
      nextTablePos += 1;
    }
    return rtn;
  }

  const GOTmem = new Proxy(GOT, { get: GOTMemHandler });
  const GOTfunc = new Proxy(GOT, { get: GOTFuncHandler });

  interface Library {
    path: string;
    handle: number;
    instance: WebAssembly.Instance;
    symToPtr: { [symName: string]: number };
  }
  const pathToLibrary: { [path: string]: Library } = {};
  const handleToLibrary: { [handle: number]: Library } = {};

  env.dlopen = (pathnamePtr: number, _flags: number): number => {
    // TODO: _flags are ignored for now.
    if (memory == null) throw Error("bug"); // mainly for typescript
    const path = recvString(pathnamePtr, memory);
    log("dlopen: path='%s'", path);
    if (pathToLibrary[path] != null) {
      return pathToLibrary[path].handle;
    }

    const binary = new Uint8Array(readFileSync(path));
    const metadata = getMetadata(binary);
    log("metadata", metadata);
    // alignments are powers of 2
    let memAlign = Math.pow(2, metadata.memoryAlign ?? 0);
    // finalize alignments and verify them
    memAlign = Math.max(memAlign, STACK_ALIGN); // we at least need stack alignment
    let malloc = getFunction("malloc");
    if (malloc == null) {
      throw Error("malloc from libc must be available in the  main instance");
    }
    if (metadata.memorySize == null) {
      throw Error("memorySize must be defined in the shared library");
    }
    const alloc = malloc(metadata.memorySize + memAlign);
    if (alloc == 0) {
      throw Error("you cannot use a stub for malloc");
    }
    const __memory_base = metadata.memorySize
      ? alignMemory(alloc, memAlign)
      : 0;
    const __table_base = metadata.tableSize ? nextTablePos : 0;

    const env = {
      memory,
      __indirect_function_table,
      __memory_base,
      __table_base,
      __stack_pointer: new WebAssembly.Global(
        {
          value: "i32",
          mutable: true,
        },
        __memory_base // totally wrong?  I can't tell.
      ),
    };
    log("env =", env);
    const libImportObject = {
      ...importObject,
      env: new Proxy(env, { get: dlopenEnvHandler }),
      "GOT.mem": GOTmem,
      "GOT.func": GOTfunc,
    };

    // account for the entries that got inserted during the import.
    // This must happen BEFORE the import, since that will create some
    // new entries to get put in the table below, and the import itself
    // will put entries from the current position up to metadata.tableSize
    // positions forward.
    nextTablePos += metadata.tableSize ?? 0;

    const instance = importWebAssemblySync(path, libImportObject);

    //log("got exports=", instance.exports);
    if (__indirect_function_table == null) {
      throw Error("bug");
    }

    if (instance.exports.__wasm_call_ctors != null) {
      log("calling __wasm_call_ctors for dynamic library");
      (instance.exports.__wasm_call_ctors as CallableFunction)();
    }

    const symToPtr: { [symName: string]: number } = {};
    for (const name in instance.exports) {
      // TODO: I'm worried that these might be VERY slow.
      // It probably doesn't matter for Python, since I think it only
      // uses this for the module init...
      if (funcMap[name] != null) continue;
      const val = instance.exports[name];
      if (symToPtr[name] != null || typeof val != "function") continue;
      setTable(nextTablePos, val as Function);
      symToPtr[name] = nextTablePos;
      nextTablePos += 1;
    }
    for (const symName in funcMap) {
      const f = instance.exports[symName] ?? mainInstance.exports[symName];
      if (f == null) continue;
      log("table[%s] = %s", funcMap[symName], symName, f);
      setTable(funcMap[symName].value, f as Function);
      symToPtr[symName] = funcMap[symName];
      delete funcMap[symName];
    }

    // Get an available handle by maxing all the int versions of the
    // keys of the handleToLibrary map.
    const handle =
      Math.max(0, ...Object.keys(handleToLibrary).map(parseInt)) + 1;
    const library = {
      path,
      handle,
      instance,
      symToPtr,
    };
    pathToLibrary[path] = library;
    handleToLibrary[handle] = library;
    //     log(
    //       "after dlopen table looks like:",
    //       nonzeroPositions(__indirect_function_table)
    //     );
    return handle;
  };

  env.dlsym = (handle: number, symbolPtr: number): number => {
    if (memory == null) throw Error("bug"); // mainly for typescript
    const symName = recvString(symbolPtr, memory);
    log("dlsym: handle=%s, symName='%s'", handle, symName);
    const lib = handleToLibrary[handle];
    if (lib == null) {
      throw Error(`dlsym: invalid handle ${handle}`);
    }
    const ptr = lib.symToPtr[symName];
    log("ptr = ", ptr);
    if (ptr != null) {
      // symbol is a known function pointer
      return ptr;
    }
    // NOT sure if this is at all correct or meaningful or what to even
    // do with non functions!
    // I think Python only uses function pointers?
    // return lib.instance.exports[symName]
    throw Error(`dlsym: handle=${handle} - unknown symbol '${symName}'`);
  };

  const importObjectWithStub = stub
    ? { ...importObject, env: stubProxy(importObject.env, traceStub) }
    : importObject;
  const mainInstance =
    importWebAssembly != null
      ? await importWebAssembly(path, importObjectWithStub)
      : importWebAssemblySync(path, importObjectWithStub);

  if (mainInstance.exports.__wasm_call_ctors != null) {
    // We also **MUST** explicitly call the WASM constructors. This is
    // a library function that is part of the zig libc code.  We have
    // to call this because the wasm file is built using build-lib, so
    // there is no main that does this.  This call does things like
    // setup the filesystem mapping.    Yes, it took me **days**
    // to figure this out, including reading a lot of assembly code. :shrug:
    (mainInstance.exports.__wasm_call_ctors as CallableFunction)();
  }
  let nextTablePos =
    Math.max(0, ...nonzeroPositions(__indirect_function_table)) + 1;

  return mainInstance;
}
