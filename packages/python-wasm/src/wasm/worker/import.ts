import WASI, { createFileSystem } from "@wapython/wasi";
import type { WASIConfig, FileSystemSpec, WASIBindings } from "@wapython/wasi";
import reuseInFlight from "../reuseInFlight";
import WasmInstance from "./instance";
import debug from "debug";
const log = debug("wasm-import");

const textDecoder = new TextDecoder();
function recvString(wasm, ptr, len) {
  const slice = wasm.exports.memory.buffer.slice(ptr, ptr + len);
  return textDecoder.decode(slice);
}

export interface Options {
  noWasi?: boolean; // if false, include wasi
  wasmEnv?: object; // functions to include in the environment
  env?: { [name: string]: string }; // environment variables
  fs?: FileSystemSpec[]; // if not given, code has full native access to /
  time?: boolean;
  // init = initialization function that gets called when module first loaded.
  init?: (wasm: WasmInstance) => void | Promise<void>;
  traceSyscalls?: boolean;
  traceStubcalls?: "first" | true;
  spinLock?: (time: number) => void;
  stdinBuffer?: SharedArrayBuffer;
  signalBuffer?: SharedArrayBuffer;
  waitForStdin?: () => Buffer;
  sendStdout?: (Buffer) => void;
  sendStderr?: (Buffer) => void;
}

const cache: { [name: string]: any } = {};

type WasmImportFunction = (
  name: string,
  source,
  bindings: WASIBindings,
  options?: Options
) => Promise<WasmInstance>;

async function doWasmImport(
  name: string, // this is only used for caching and printing
  source: Buffer | Promise<any>, // contents of the .wasm file or promise returned by fetch (in browser).
  bindings: WASIBindings,
  options: Options = {}
): Promise<WasmInstance> {
  if (cache[name] != null) {
    return cache[name];
  }
  const t = new Date().valueOf();
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

  if (wasmOpts.env.wasmGetSignalState == null) {
    wasmOpts.enve.wasmGetSignalState = () => {
      return 0;
    };
  }
  if (wasmOpts.env.wasmSendString == null) {
    wasmOpts.env.wasmSendString = (ptr: number, len: number) => {
      wasm.result = recvString(wasm, ptr, len);
    };
  }
  if (wasmOpts.env.wasmSetException == null) {
    wasmOpts.env.wasmSetException = () => {
      wasm.resultException = true;
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
  let fs: FileSystem | undefined = undefined;
  if (!options?.noWasi) {
    const opts: WASIConfig = {
      preopens: { "/": "/" },
      bindings,
      args: process.argv,
      env: options.env,
      traceSyscalls: options.traceSyscalls,
      spinLock: options.spinLock,
      waitForStdin: options.waitForStdin,
      sendStdout: options.sendStdout,
      sendStderr: options.sendStderr,
    };
    if (options.fs != null) {
      // explicit fs option given, so create the bindings.fs object, which is typically
      // a union of several filesystems...
      fs = createFileSystem(options.fs, bindings);
      opts.bindings = {
        ...bindings,
        fs,
      };
    }
    wasi = new WASI(opts);
    wasmOpts.wasi_snapshot_preview1 = wasi.wasiImport;
  }

  wasmOpts.env = new Proxy(wasmOpts.env, {
    get(target, key) {
      if (key in target) {
        log("using existing for ", key);
        return Reflect.get(target, key);
      }
      if (options.traceStubcalls) {
        log("creating stub for", key);
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

  if (source == null) {
    throw Error("source must be defined for now...");
  }
  let result;
  if (source instanceof Promise) {
    // This is in a web browser, which has WebAssembly.instantiateStreaming
    // whereas node doesn't.
    result = await WebAssembly.instantiateStreaming(source, wasmOpts);
  } else {
    // This is in node, or in browser without doing a streaming load.
    const typedArray = new Uint8Array(source);
    result = await WebAssembly.instantiate(typedArray, wasmOpts);
  }

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
    // Uncomment this for low level debugging, so that the broken wasm
    // module gets returned.
    /*
    try {
      await options.init(wasm);
    } catch (err) {
      console.warn(`WARNING: init of ${name} failed`, err);
    }
    */
  }

  cache[name] = wasm;

  if (options.time) {
    log(`imported ${name} in ${new Date().valueOf() - t}ms`);
  }

  return wasm;
}

const wasmImport: WasmImportFunction = reuseInFlight(doWasmImport, {
  createKey: (args) => args[0],
});
export default wasmImport;

const stubUsed = new Set<string>([]);
function stub(functionName, behavior, args, firstOnly) {
  if (firstOnly) {
    if (stubUsed.has(functionName)) return;
    stubUsed.add(functionName);
  }
  log(`WARNING STUB - ${functionName}: `, behavior, args);
}
