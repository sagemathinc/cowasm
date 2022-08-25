import { alignMemory, nonzeroPositions, recvString } from "./util";
import getMetadata from "./metadata";
import stubProxy from "./stub";
import debug from "debug";
const log = debug("dylink");

const STACK_ALIGN = 16; // copied from emscripten

/*
** Our approach to the stack **

It took me a long time to understand __stack_pointer in WASM and with dynamic
linking, since no docs really explained it and I sort of hit a wall with the
emscripten sources, since the relevant code appears to be in assembly, and
anyway I have to operate in the constraints of what zig provides. The way I
understood __stack_pointer is by creating a bunch of sample programs and study
the output of wasm-decompile and wasm2wat.   First some remarks:

- the stack size for the main executable is controlled at compile time by zig.
It's by default 1MB when you use "zig build-exe", but it's only 64KB
when you use "zig build-lib".   This difference is probably a bug, but a
rememedy is type include "--stack 1048576 " in the command line. Also, I know
of no way to create a WebAssembly.Global that is the main __stack_pointer.
Maybe emscripten does via assmebly code, but I can't tell.

- The stack grows *DOWN*, i.e., if the stack is 1MB then __stack_pointer
gets set by default to 1048576 (= 1MB), and at the beginning of each
function, the VM grabs the current stack pointer, then substracts off
how much space will be needed for running that function, then starts
working with that (so it can go up), and then resets it to where it was.

- Since I have no idea how to get the current __stack_pointer for ther main
module, here we allocate a new chunk of memory on the heap for each dynamic
library to use as its own stack. We then pass in __stack_pointer as a value
at the very end of that memory.   The __stack_pointer's in each dynamic
library and in the module are just completely different variables in different
WASM instances that are all using the same shared memory.  Everybody has
their own stacks and they don't overlap with each other at all. This
seems to work well, given our constaints, and hopefully doesn't waste too
much memory.

NOTE: There arguments about what stack size to use here -- it's still 5MB in
emscripten today, and in zig it is 1MB:
 - https://github.com/emscripten-core/emscripten/pull/10019
 - https://github.com/ziglang/zig/issues/3735
*/

// Stack size for imported dynamic libraries -- we use 1MB. This is
// a runtime parameter.
const STACK_SIZE = 1048576; // 1MB;  to use 64KB it would be 65536.

interface Env {
  __indirect_function_table?: WebAssembly.Table;
  memory?: WebAssembly.Memory;
  dlopen?: (pathnamePtr: number, flags: number) => number;
  dlsym?: (handle: number, symbolPtr: number) => number;
  dlerror?: () => number; // basically a stub right now
  dlclose?: (handle: number) => number; // basically a stub right now
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
  stub?: "warn" | "silent"; // if warn, automatically generate stub functions but with a huge warning; if silent, just silently create stubs.
}

export default async function importWebAssemblyDlopen({
  path,
  importObject,
  importWebAssembly,
  importWebAssemblySync,
  readFileSync,
  stub,
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
    memory = env.memory = new WebAssembly.Memory({ initial: 10 });
  }
  let { __indirect_function_table } = env;
  if (__indirect_function_table == null) {
    // TODO: Make the 1000 bigger if your main module has a large number of function pointers
    // Maybe we need to parse the wasm bundle in general (that's what emscripten does).
    __indirect_function_table = env.__indirect_function_table =
      new WebAssembly.Table({ initial: 1000, element: "anyfunc" });
  }

  function symbolViaPointer(key: string) {
    log("symbolViaPointer", key);
    const f = mainInstance.exports[`__WASM_EXPORT__${key}`];
    if (f == null) return;
    return (f as Function)();
  }

  function functionViaPointer(key: string) {
    if (mainInstance == null) return; // not yet available
    const f = mainInstance.exports[`__WASM_EXPORT__${key}`];
    if (f == null) return;
    const ptr = (f as Function)();
    log("functionViaPointer", key, ptr);
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
    // log("setTable ", index, typeof index, f, typeof f);
    __indirect_function_table.set(index, f);
  }

  // See if the function we want is defined in some
  // already imported dynamic library:
  function functionFromOtherLibrary(name: string): Function | undefined {
    for (const handle in handleToLibrary) {
      const { symToPtr, instance } = handleToLibrary[handle];
      // two places that could have the pointer:
      const ptr =
        symToPtr[name] ??
        (instance.exports[`__WASM_EXPORT__${name}`] as Function)?.();
      if (ptr != null) {
        if (__indirect_function_table == null) {
          throw Error("__indirect_function_table must be defined");
        }
        log("functionFromOtherLibrary - got ", name, " from ", path);
        return __indirect_function_table.get(ptr);
      }
    }
    return undefined;
  }

  function getFunction(name: string, path: string = ""): Function | undefined {
    const f =
      importObject?.env?.[name] ??
      functionViaPointer(name) ??
      mainInstance.exports[name] ??
      functionFromOtherLibrary(name);
    if (f != null) return f;
    if (path) {
      debug("stub")(name, "undefined importing", path);
    }
    return importObjectWithStub.env[name];
  }

  function dlopenEnvHandler(path: string) {
    return (env, key: string) => {
      if (key in env) {
        return Reflect.get(env, key);
      }
      log("dlopenEnvHandler", key);

      // important to check importObject.env LAST since it could be a proxy
      // that generates stub functions:
      const f = getFunction(key, path);
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

  // Global Offset Table
  const GOT = {};
  const memMap = {};
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
      const x = new WebAssembly.Global(
        {
          value: "i32",
          mutable: true,
        },
        0
      );
      memMap[key] = x;
      rtn = GOT[key] = x;
    }
    return rtn;
  }
  const funcMap: { [key: string]: number } = {};
  function GOTFuncHandler(GOT, key: string) {
    if (key in GOT) {
      return Reflect.get(GOT, key);
    }
    let rtn = GOT[key];
    if (!rtn) {
      // Dynamic module needs a *pointer* to the function with name "key".
      // There are several possibilities:
      //
      // 1. This function is already in a our global function table, from
      // the main module or another dynamic link library defining it. An
      // example is the function strcmp from libc, which is often used as a pointer
      // with qsort.  In that case, we know the pointer and immediately
      // set the value of the function pointer to that value -- it's important
      // to use the *same* pointer in both the main module and the dynamic library,
      // rather than making another one just for the dynamic library (which would
      // waste space, and completely breaks functions like qsort that take a
      // function pointer).
      //
      // 2. Another likely possibility is that this is a function that will get defined
      // as a side effect of the dynamic link module being loaded.  We don't know
      // what address that function will get, so we in that case we create an entry
      // in funcMap, and later below we update the pointer created here.
      //
      // 3. A third possibility is that the requested function isn't in the
      // function pointer table but it's made available via the Javascript
      // environment.  As far as I know, there is no way to make such a Javascript
      // function available as a function pointer aside from creating a new compiled
      // function in web assembly that calls that Javascript function, so this is
      // a fatal error, and we have to modify libc.ts to make such a wrapper.  This
      // happened with geteuid at one point, which comes from node.js.
      //
      // 4. The function might be defined in another dynamic library that hasn't
      // been loaded yet.  We have NOT addressed this problem yet, and this must
      // also be a fatal error.
      //
      let value;
      const f = mainInstance.exports[`__WASM_EXPORT__${key}`];
      if (f == null) {
        // new function
        value = nextTablePos;
        funcMap[key] = value; // have to do further work below to add this to table.
        nextTablePos += 1;
      } else {
        // existing function perhaps from libc, e.g., "strcmp".
        value = (f as Function)();
      }
      log("GOTFuncHandler ", key, "-->", value);
      // place in the table -- we make a note of where to put it,
      // and actually place it later below after the import is done.
      const ptr = new WebAssembly.Global(
        {
          value: "i32",
          mutable: true,
        },
        value
      );
      rtn = GOT[key] = ptr;
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
      throw Error("malloc failed (you cannot use a stub for malloc)");
    }

    const stack_alloc = malloc(STACK_SIZE);
    if (stack_alloc == 0) {
      throw Error("malloc failed for stack");
    }

    log(
      "allocating %s bytes for shared library -- at ",
      metadata.memorySize + memAlign,
      alloc
    );
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
        // This is a pointer to the top of the memory we allocated
        // for this dynamic library's stack, since the stack grows
        // down, in terms of memory addresses.
        stack_alloc + STACK_SIZE
      ),
    };
    log("env =", env);
    const libImportObject = {
      ...importObject,
      env: new Proxy(env, { get: dlopenEnvHandler(path) }),
      "GOT.mem": GOTmem,
      "GOT.func": GOTfunc,
    };

    // account for the entries that got inserted during the import.
    // This must happen BEFORE the import, since that will create some
    // new entries to get put in the table below, and the import itself
    // will put entries from the current position up to metadata.tableSize
    // positions forward.
    nextTablePos += metadata.tableSize ?? 0;
    // Ensure there is space in the table for the functions
    // we are about to import
    if (__indirect_function_table == null) {
      throw Error("__indirect_function_table must not be null");
    }
    if (__indirect_function_table.length <= nextTablePos + 50) {
      __indirect_function_table.grow(
        50 + nextTablePos - __indirect_function_table.length
      );
    }

    const instance = importWebAssemblySync(path, libImportObject);

    //log("got exports=", instance.exports);
    if (__indirect_function_table == null) {
      throw Error("bug");
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

    // Set all functions in the function table that couldn't
    // be resolved to pointers when creating the webassembly module.
    for (const symName in funcMap) {
      const f = instance.exports[symName] ?? mainInstance.exports[symName];
      log("table[%s] = %s", funcMap[symName], symName, f);
      if (f == null) {
        // This has to be a fatal error, since the only other option would
        // be having a pointer to random nonsense or a broke function,
        // which is definitely going to segfault randomly later when it
        // gets hit by running code. See comments above in GOTFuncHandler.
        throw Error(`dlopen -- UNRESOLVED FUNCTION: ${symName}`);
      }
      setTable(funcMap[symName], f as Function);
      symToPtr[symName] = funcMap[symName];
      delete funcMap[symName];
    }
    for (const symName in memMap) {
      const x = memMap[symName];
      delete memMap[symName];
      const ptrBeforeOffset = (instance.exports[symName] as any)?.value;
      if (ptrBeforeOffset == null) {
        const ptr = symbolViaPointer(symName);
        if (ptr == null) {
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
      Math.max(0, ...Object.keys(handleToLibrary).map((n) => parseInt(n))) + 1;
    const library = {
      path,
      handle,
      instance,
      symToPtr,
    };
    pathToLibrary[path] = library;
    handleToLibrary[handle] = library;
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
    let ptr = lib.symToPtr[symName];
    log("ptr = ", ptr);
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
    // I think Python only uses function pointers?
    // return lib.instance.exports[symName]
    throw Error(`dlsym: handle=${handle} - unknown symbol '${symName}'`);
  };

  /*
  "The function dlerror() returns a human readable string describing the most
  recent error that occurred from dlopen(), dlsym() or dlclose() since the last
  call to dlerror(). It returns NULL if no errors have occurred since
  initialization or since it was last called."
  */
  env.dlerror = () => {
    // TODO: need to allocate a string to implement this, and also keep track
    // of errors.
    return 0;
  };

  /*
  "The function dlclose() decrements the reference count on the dynamic library
  handle handle. If the reference count drops to zero and no other loaded
  libraries use symbols in it, then the dynamic library is unloaded. The function
  dlclose() returns 0 on success, and nonzero on error."
  */
  env.dlclose = (_handle) => {
    // TODO: we never clean up... yet. But we could.
    return 0;
  };

  const importObjectWithStub = stub
    ? {
        ...importObject,
        env: stubProxy(importObject.env, functionViaPointer, stub),
      }
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
