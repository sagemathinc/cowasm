import WASI, { createFileSystem } from "@wapython/wasi";
import type { WASIConfig, Filesystem, FileSystemSpec } from "@wapython/wasi";
import bindings from "@wapython/wasi/dist/bindings/node";
import { reuseInFlight } from "async-await-utils/hof";
import { readFile as readFile0 } from "fs";
import { promisify } from "util";
import { dirname, isAbsolute, join } from "path";
import callsite from "callsite";

const readFile = promisify(readFile0);

const textDecoder = new TextDecoder();
function recvString(wasm, ptr, len) {
  const slice = wasm.exports.memory.buffer.slice(ptr, ptr + len);
  return textDecoder.decode(slice);
}

interface Options {
  noWasi?: boolean; // if false, include wasi
  wasmEnv?: object; // functions to include in the environment
  env?: { [name: string]: string }; // environment variables
  fs?: FileSystemSpec[]; // if not given, code has full native access to /
  time?: boolean;
  init?: (wasm: WasmInstance) => void | Promise<void>; // initialization function that gets called when module first loaded.
  traceSyscalls?: boolean;
  traceStubcalls?: "first" | true;
}

const cache: { [name: string]: any } = {};

type WasmImportFunction = (
  name: string,
  options?: Options
) => Promise<WasmInstance>;

async function doWasmImport(
  name: string,
  options: Options = {}
): Promise<WasmInstance> {
  if (cache[name] != null) {
    return cache[name];
  }
  const t = new Date().valueOf();
  if (!isAbsolute(name)) {
    throw Error(`name must be an absolute path -- ${name}`);
  }
  const pathToWasm = `${name}${name.endsWith(".wasm") ? "" : ".wasm"}`;

  const wasmEnv = {
    reportError: (ptr, len: number) => {
      // @ts-ignore
      const slice = result.instance.exports.memory.buffer.slice(ptr, ptr + len);
      const textDecoder = new TextDecoder();
      throw Error(textDecoder.decode(slice));
    },
  };

  const wasmOpts: any = { env: { ...wasmEnv, ...options.wasmEnv } };

  let wasm;

  if (wasmOpts.env.wasmSendString == null) {
    wasmOpts.env.wasmSendString = (ptr: number, len: number) => {
      wasm.result = recvString(wasm, ptr, len);
    };
  }
  if (wasmOpts.env.getrandom == null) {
    wasmOpts.env.getrandom = (bufPtr, bufLen, _flags) => {
      // NOTE: returning 0 here (our default stub behavior)
      // would result in Python hanging on startup!
      bindings.randomFillSync(
        // @ts-ignore
        new Uint8Array(result.instance.exports.memory.buffer),
        bufPtr,
        bufLen
      );
      return bufLen;
    };
  }
  if (wasmOpts.env.getpid == null) {
    wasmOpts.env.getpid = () => {
      if (options.traceStubcalls) {
        stub("getpid", "returning 1", [], options.traceStubcalls == "first");
      }
      return 1;
    };
  }
  if (wasmOpts.env.main == null) {
    wasmOpts.env.main = () => {
      return 0;
    };
  }

  let wasi: WASI | undefined = undefined;
  let fs: Filesystem | undefined = undefined;
  if (!options?.noWasi) {
    const opts: WASIConfig = {
      preopens: { "/": "/" },
      bindings,
      args: process.argv,
      env: options.env,
      traceSyscalls: options.traceSyscalls,
    };
    if (options.fs != null) {
      // explicit fs option given, so create the bindings.fs object:
      fs = await createFileSystem(options.fs);
      opts.bindings = {
        ...bindings,
        fs,
      };
    }
    //    console.log(opts);
    wasi = new WASI(opts);
    wasmOpts.wasi_snapshot_preview1 = wasi.wasiImport;
  }

  wasmOpts.env = new Proxy(wasmOpts.env, {
    get(target, key) {
      if (key in target) {
        // console.log("using existing stub for ", key);
        return Reflect.get(target, key);
      }
      // console.log("creating stub for", key);
      if (options.traceStubcalls) {
        return (...args) => {
          stub(key, "returning 0", args, options.traceStubcalls == "first");
          return 0;
        };
      } else {
        // faster to not trace or even check, obviously.
        return () => 0;
      }
    },
  });

  const source = await readFile(pathToWasm);
  const typedArray = new Uint8Array(source);
  const result = await WebAssembly.instantiate(typedArray, wasmOpts);

  if (wasi != null) {
    wasi.start(result.instance);
  }
  if (result.instance.exports.__wasm_call_ctors != null) {
    // We also **MUST** explicitly call the WASM constructors. This is
    // a library function that is part of the zig libc code.  We have
    // to call this because the wasm file is built using build-lib, so
    // there is no main that does this.  This call does things like
    // setup the filesystem mapping.    Yes, it took me **days**
    // to figure this out, including reading a lot of assembly code. :shrug:
    (result.instance.exports.__wasm_call_ctors as CallableFunction)();
  }

  wasm = new WasmInstance(result.instance.exports, fs);
  if (options.init != null) {
    await options.init(wasm);
  }

  cache[name] = wasm;

  if (options.time) {
    console.log(`imported ${name} in ${new Date().valueOf() - t}ms`);
  }

  return wasm;
}

const wasmImportDebounced: WasmImportFunction = reuseInFlight(doWasmImport, {
  createKey: (args) => args[0],
});

export default async function wasmImport(
  name: string,
  options: Options = {}
): Promise<WasmInstance> {
  const path = dirname(callsite()[1]?.getFileName() ?? "");
  if (!isAbsolute(name)) {
    // it's critical to make this canonical BEFORE calling the debounced function,
    // or randomly otherwise end up with same module imported twice, which will
    // result in a "hellish nightmare" of subtle bugs.
    name = join(path, name);
  }
  // also fix zip path, if necessary:
  for (const X of options.fs ?? []) {
    if (X.type == "zip") {
      if (!isAbsolute(X.zipfile)) {
        X.zipfile = join(path, X.zipfile);
      }
    }
  }
  return await wasmImportDebounced(name, options);
}

const encoder = new TextEncoder();

export class WasmInstance {
  result: any = undefined;
  exports: any;
  fs?: Filesystem;

  constructor(exports, fs?: Filesystem) {
    this.exports = exports;
    this.fs = fs;
  }

  private stringToCharStar(str: string): number {
    // Caller MUST free the returned char* from stringToU8 using wasm.c_free!
    const strAsArray = encoder.encode(str);
    const len = strAsArray.length + 1;
    const ptr = this.exports.c_malloc(len);
    const array = new Int8Array(this.exports.memory.buffer, ptr, len);
    array.set(strAsArray);
    array[len - 1] = 0;
    return ptr;
  }

  public callWithString(name: string, str: string, ...args): any {
    this.result = undefined;
    const ptr = this.stringToCharStar(str);
    let r;
    try {
      const f = this.exports[name];
      if (f == null) {
        throw Error(`no function ${name} defined in wasm module`);
      }
      // @ts-ignore
      r = f(ptr, ...args);
    } finally {
      // @ts-ignore
      this.exports.c_free(ptr);
    }
    return this.result ?? r;
  }
}

export function run(filename: string) {
  wasmImport(filename);
}

const stubUsed = new Set<string>([]);
function stub(functionName, behavior, args, firstOnly) {
  if (firstOnly) {
    if (stubUsed.has(functionName)) return;
    stubUsed.add(functionName);
  }
  console.log(`WARNING STUB - ${functionName}: `, behavior, args);
}
