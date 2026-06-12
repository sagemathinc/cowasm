import stubProxy from "./stub";
import debug from "debug";
import FunctionTable from "./function-table";
import DlopenManager from "./dlopen";
import GlobalOffsetTable from "./global-offset-table";
import { Env } from "./types";

const log = debug("dylink");
const logImport = debug("dylink:import");

/*
** Our approach to the stack **

It took me a long time to understand __stack_pointer in WASM and with dynamic
linking, since no docs really explained it and I sort of hit a wall with the
emscripten sources, since the relevant code appears to be in assembly, and
anyway I have to operate in the constraints of what zig provides. The way I
understood __stack_pointer is by creating a bunch of sample programs and study
the output of wasm-decompile and wasm2wat.   First some remarks:

- the stack size for the main executable is controlled at compile time by zig.
It's by default 1MB.   I know of no way to create a WebAssembly.Global that
is the main __stack_pointer.   Maybe emscripten does via assmebly code, but
I can't tell, or maybe it just isn't allowed.

- The stack grows *DOWN*, i.e., if the stack is 1MB then __stack_pointer
gets set by default to 1048576 (= 1MB), and at the beginning of each
function, the VM grabs the current stack pointer, then substracts off
how much space will be needed for running that function, then starts
working with that (so it can go up), and then resets it to where it was.

- Since I have no idea how to get the current __stack_pointer for the main
module, here we allocate a new chunk of memory on the heap for each dynamic
library to use as its own stack. We then pass in __stack_pointer as a value
at the very end of that memory.   The __stack_pointer's in each dynamic
library and in the module are just completely different variables in different
WASM instances that are all using the same shared memory.  Everybody has
their own stacks and they don't overlap with each other at all. This
seems to work well, given our constaints, and hopefully doesn't waste too
much memory.

- Because of this architecture

NOTE: There are arguments about what stack size to use at the links below.  I
think it's still 5MB in emscripten today, and in zig it is 1MB:
 - https://github.com/emscripten-core/emscripten/pull/10019
 - https://github.com/ziglang/zig/issues/3735 <-- *this issue i reported did get fixed upstream!*
*/

export interface Options {
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
  stub?: "warn" | "silent" | false; // if warn, automatically generate stub functions but with a huge warning; if silent, just silently create stubs.
  allowMainExports?: boolean; // DANGEROUS -- allow dll to use functions defined in the main module that are NOT exported via the function table.  This is dangerous since they are 1000x slower, and might not be posisble to properly call (depending on data types).  Use with caution.
}

export default async function importWebAssemblyDlopen({
  path,
  importObject,
  importWebAssembly,
  importWebAssemblySync,
  readFileSync,
  stub,
  allowMainExports,
}: Options): Promise<WebAssembly.Instance> {
  let mainInstance: WebAssembly.Instance | null = null;
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
    // Note that this is only potentially an issue for the main core WASM module, not the
    // dynamic libraries that get loaded at runtime.
    __indirect_function_table = env.__indirect_function_table =
      new WebAssembly.Table({ initial: 1500, element: "anyfunc" });
  }
  const functionTable = new FunctionTable(__indirect_function_table);

  function functionViaPointer(key: string) {
    if (mainInstance == null) return; // not yet available
    const f = mainInstance.exports[`__WASM_EXPORT__${key}`];
    if (f == null) return;
    const ptr = (f as Function)();
    log("functionViaPointer", key, ptr);
    return functionTable.get(ptr);
  }

  function getFunction(
    name: string,
    path: string = ""
  ): Function | null | undefined {
    log("getFunction", name);
    let f = importObject?.env?.[name];
    if (f != null) {
      log("getFunction ", name, "from env");
      return f;
    }
    f = functionViaPointer(name);
    if (f != null) {
      log("getFunction ", name, "from function pointer");
      return f;
    }
    f = dlopenManager.getFunction(name);
    if (f != null) {
      log("getFunction ", name, "from other library");
      return f;
    }

    if (allowMainExports) {
      /*
      Any other way of resolving a function needed in a dynamic import that isn't
      a function pointer is NOT going to work in general:
      It will segfault or be 1000x too slow.  Every function
      needs to be via a pointer. The following doesn't work *in general*.  In addition to
      speed, there are C functions that make no sense to call via WASM,
      since they have signatures that are more complicated than WASM supports.
      */
      f = mainInstance?.exports[name];
      if (f != null) {
        log(
          "getFunction ",
          name,
          "from mainInstance exports (potentially dangerous!)"
        );
        return f;
      }
    }

    // **TODO: this is a temporary whitelist for some mangled C++ symbols in the numpy build**
    if (path?.includes("numpy") && name.startsWith("_Z")) {
      return () => {
        console.log("WARNING: calling dangerous stub for ", name);
      };
    }

    if (path) {
      // this is a dynamic library import, so fail at this point:
      throw Error(`${name} -- undefined when importing ${path}`);
    }

    return importObjectWithPossibleStub.env[name];
  }

  function getMainInstance() {
    if (mainInstance == null) throw Error("bug");
    return mainInstance;
  }
  function getMainInstanceExports() {
    if (mainInstance?.exports == null) throw Error("bug");
    return mainInstance.exports;
  }
  const globalOffsetTable = new GlobalOffsetTable(
    getMainInstanceExports,
    functionTable
  );

  const dlopenManager = new DlopenManager(
    getFunction,
    memory,
    globalOffsetTable,
    functionTable,
    readFileSync,
    importObject,
    importWebAssemblySync,
    getMainInstanceExports,
    getMainInstance
  );

  dlopenManager.add_dlmethods(env);

  const importObjectWithPossibleStub = stub
    ? {
        ...importObject,
        env: stubProxy(importObject.env, functionViaPointer, stub),
      }
    : importObject;

  let t0 = 0;
  if (logImport.enabled) {
    t0 = new Date().valueOf();
    logImport("importing ", path);
  }

  mainInstance =
    importWebAssembly != null
      ? await importWebAssembly(path, importObjectWithPossibleStub)
      : importWebAssemblySync(path, importObjectWithPossibleStub);

  if (logImport.enabled) {
    logImport("imported ", path, ", time =", new Date().valueOf() - t0, "ms");
  }

  if (mainInstance.exports.__wasm_call_ctors != null) {
    // We also **MUST** explicitly call the WASM constructors. This is
    // a library function that is part of the zig libc code.  We have
    // to call this because the wasm file is built using build-lib, so
    // there is no main that does this.  This call does things like
    // setup the filesystem mapping.    Yes, it took me **days**
    // to figure this out, including reading a lot of assembly code. :shrug:
    (mainInstance.exports.__wasm_call_ctors as CallableFunction)();
  }
  functionTable.updateAfterImport();
  // TODO
  (mainInstance as any).env = env;

  (mainInstance as any).getDlopenState = () => {
    return {
      dlopen: dlopenManager.getState(),
      got: globalOffsetTable.getState(),
    };
  };

  (mainInstance as any).setDlopenState = (state) => {
    const { dlopen, got } = state;
    dlopenManager.setState(dlopen);
    globalOffsetTable.setState(got);
  };
  return mainInstance;
}
