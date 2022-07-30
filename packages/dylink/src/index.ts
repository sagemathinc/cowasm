import { recvString } from "./util";
import debug from "debug";
const log = debug("dylink");

interface Env {
  __indirect_function_table: WebAssembly.Table;
  memory: WebAssembly.Memory;
  dlopen: (pathnamePtr: number, flags: number) => number;
  dlsym: (handle: number, symbolPtr: number) => number;
}

export default function dylink(importObject?: { env?: Partial<Env> }): {
  env: Env;
} {
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

  /*
  // Global Offset Table
  function GOTMemHandler(GOT, symName) {
    let rtn = GOT[symName];
    if (!rtn) {
      rtn = GOT[symName] = new WebAssembly.Global(
        {
          value: "i32",
          mutable: true,
        },
        instance.exports[symName]
      );
    }
    return rtn;
  }
  let nextTablePos = 1;
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
  }*/

  env.dlopen = (pathnamePtr: number, _flags: number): number => {
    // TODO: _flags are ignored for now.
    if (memory == null) throw Error("bug");
    const pathname = recvString(pathnamePtr, memory);
    log("dlopen: pathname", pathname);
    return 0;
  };

  env.dlsym = (handle: number, symbolPtr: number): number => {
    if (memory == null) throw Error("bug");
    const symbol = recvString(symbolPtr, memory);
    log("dlsym: handle", handle, " symbol", symbol);
    return 0;
  };

  return importObject as {
    env: Env;
  };
}
