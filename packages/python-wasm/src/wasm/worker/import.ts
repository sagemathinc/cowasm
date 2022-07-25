import WASI, { createFileSystem } from "@wapython/wasi";
import type { WASIConfig, FileSystemSpec, WASIBindings } from "@wapython/wasi";
import reuseInFlight from "../reuseInFlight";
import WasmInstance from "./instance";

const textDecoder = new TextDecoder();
function recvString(wasm, ptr: number, len?: number) {
  if (len == null) {
    // no len given, so assume it is a null terminated string.
    len = wasm.exports.stringLength(ptr);
    if (len == null) throw Error("bug - stringLength must return len");
  }
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
  options?: Options,
  log?: (...args) => void
) => Promise<WasmInstance>;

async function doWasmImport(
  name: string, // this is only used for caching and printing
  source: Buffer | Promise<any>, // contents of the .wasm file or promise returned by fetch (in browser).
  bindings: WASIBindings,
  options: Options = {},
  log?: (...args) => void
): Promise<WasmInstance> {
  log?.("doWasmImport", name);
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

  // By defining the table, any time we do
  //    WebAssembly.instantiate(..., wasmOpts)
  // with these wasmOpts after the initial time, the resulting
  // functions get loaded into
  // the SAME table, instead of a completely new one.  This makes
  // dynamic loading possible, e.g., dlopen.
  //
  // TODO: 1000 is just made up!  Obviously, we need to grow
  // it dynamically.
  const table = new WebAssembly.Table({ initial: 1000, element: "anyfunc" });
  const wasmOpts: any = {
    js: { table },
    env: { ...wasmEnv, ...options.wasmEnv },
  };

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
        stub(
          "getpid",
          "returning 1",
          [],
          options.traceStubcalls == "first",
          log
        );
      }
      return 1;
    };
  }
  if (wasmOpts.env.main == null) {
    wasmOpts.env.main = () => {
      return 0;
    };
  }

  // dlopen implementation -- will move to dlopen/ subdirectory once I figure out how this works!
  // OK, I explained to myself how to actually fully solve all this here:
  //    https://cocalc.com/projects/369491f1-9b8a-431c-8cd0-150dd15f7b11/files/work/2022-07-18-ws-diary.board#id=55096f05
  // I think, and this is obviously by far my top priority now.
  if (wasmOpts.env.dlopen == null) {
    let dylink : any = undefined;
    let dylink_i : number = 0;
    wasmOpts.env.dlopen = (pathnamePtr: number, flags: number): number => {
      if(dylink != null) return 1;
      log?.("dlopen -- pathnamePtr = ", pathnamePtr, " flags=", flags);
      log?.("dlopen -- table = ", table?.length);
      const pathname = recvString(wasm, pathnamePtr);
      log?.("dlopen -- work in progress, pathname = ", pathname);
      const typedArray = new Uint8Array(require("fs").readFileSync(pathname));
      //await WebAssembly.instantiate(typedArray, wasmOpts);
      //const metadata = getDylinkMetadata(typedArray);
      //log?.("dlopen -- metadata = ", metadata);
      const module = new WebAssembly.Module(typedArray);
      const exports = WebAssembly.Module.exports(module);
      //log?.("dlopen -- exports = ", JSON.stringify(exports));
      const instance = new WebAssembly.Instance(module, wasmOpts);
      dylink = instance.exports;
      return 1;
    };
    wasmOpts.env.dlsym = (handle: number, funcnamePtr: number): number => {
      const funcname = recvString(wasm, funcnamePtr);
      log?.(`dlopen - dlsym -- handle=${handle}, funcname=${funcname}`);
      const f = dylink[funcname];
      log?.(`dlopen - dlsym -- f = `, f);
      table.set(dylink_i, f);
      dylink_i += 1;
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
        log?.("using existing for ", key);
        return Reflect.get(target, key);
      }
      if (options.traceStubcalls) {
        log?.("creating stub for", key);
        return (...args) => {
          stub(
            key,
            "returning 0",
            args,
            options.traceStubcalls == "first",
            log
          );
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
    log?.(`imported ${name} in ${new Date().valueOf() - t}ms`);
  }

  return wasm;
}

const wasmImport: WasmImportFunction = reuseInFlight(doWasmImport, {
  createKey: (args) => args[0],
});
export default wasmImport;

const stubUsed = new Set<string>([]);
function stub(functionName, behavior, args, firstOnly, log) {
  if (firstOnly) {
    if (stubUsed.has(functionName)) return;
    stubUsed.add(functionName);
  }
  log?.(`WARNING STUB - ${functionName}: `, behavior, args);
}
