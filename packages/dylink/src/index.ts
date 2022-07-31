import { nonzeroPositions, recvString } from "./util";
import debug from "debug";
const log = debug("dylink");

interface Env {
  __indirect_function_table: WebAssembly.Table;
  memory: WebAssembly.Memory;
  dlopen: (pathnamePtr: number, flags: number) => number;
  dlsym: (handle: number, symbolPtr: number) => number;
}

interface Input {
  path: string;
  opts?: { env?: Partial<Env> };
  importWebAssembly?: (
    path: string,
    opts: object
  ) => Promise<WebAssembly.Instance>;
  importWebAssemblySync: (path: string, opts: object) => WebAssembly.Instance;
}

export default async function dylinkInstance({
  path,
  opts,
  importWebAssembly,
  importWebAssemblySync,
}: Input): Promise<WebAssembly.Instance> {
  if (opts == null) {
    opts = {} as { env?: Partial<Env> };
  }
  let { env } = opts;
  if (env == null) {
    env = opts.env = {};
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

  // Global Offset Table
  const GOT = {};
  function GOTMemHandler(GOT, symName) {
    let rtn = GOT[symName];
    if (!rtn) {
      rtn = GOT[symName] = new WebAssembly.Global(
        {
          value: "i32",
          mutable: true,
        },
        mainInstance.exports[symName]
      );
    }
    return rtn;
  }
  const funcMap = {};
  function GOTFuncHandler(GOT, symName) {
    let rtn = GOT[symName];
    if (!rtn) {
      // place in the table
      funcMap[symName] = nextTablePos;
      rtn = GOT[symName] = new WebAssembly.Global(
        {
          value: "i32",
          mutable: true,
        },
        nextTablePos
      );
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
    log("dlopen: path=", path);
    if (pathToLibrary[path] != null) {
      return pathToLibrary[path].handle;
    }
    const __memory_base = 100000; // TODO: need to use malloc (but plugable?).
    const libOpts = {
      env: {
        memory,
        __indirect_function_table,
        __memory_base,
        __table_base: nextTablePos,
        __stack_pointer: new WebAssembly.Global(
          {
            value: "i32",
            mutable: true,
          },
          __memory_base
        ),
      },
      "GOT.mem": GOTmem,
      "GOT.func": GOTfunc,
    };

    const instance = importWebAssemblySync(path, libOpts);
    log("got exports=", instance.exports);
    if (__indirect_function_table == null) {
      throw Error("bug");
    }

    // @ts-ignore
    instance.exports.__wasm_call_ctors?.();

    const symToPtr: { [symName: string]: number } = {};
    for (const symName in funcMap) {
      log("table[%s] = %s", funcMap[symName], symName);
      __indirect_function_table.set(
        funcMap[symName],
        instance.exports[symName]
      );
      symToPtr[symName] = funcMap[symName];
      delete funcMap[symName];
    }
    for (const name in instance.exports) {
      const val = instance.exports[name];
      if (symToPtr[name] != null || typeof val != "function") continue;
      __indirect_function_table.set(nextTablePos, val);
      symToPtr[name] = nextTablePos;
      nextTablePos += 1;
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
    log(
      "after dlopen table looks like:",
      nonzeroPositions(__indirect_function_table)
    );
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

  const mainInstance =
    importWebAssembly != null
      ? await importWebAssembly(path, opts)
      : importWebAssemblySync(path, opts);
  // @ts-ignore
  mainInstance.exports.__wasm_call_ctors?.();

  let nextTablePos =
    Math.max(0, ...nonzeroPositions(__indirect_function_table)) + 1;

  return mainInstance;
}
