import WASI from "@wapython/wasi";

import type { FileSystemSpec, WASIConfig, WASIBindings } from "@wapython/wasi";
import reuseInFlight from "../reuseInFlight";
import WasmInstance from "./instance";
import importWebAssemblyDlopen from "dylink";
import initPythonTrampolineCalls from "./trampoline";

const textDecoder = new TextDecoder();

export function strlen(charPtr: number, memory: WebAssembly.Memory): number {
  const mem = new Uint8Array(memory.buffer);
  let i = charPtr;
  while (mem[i]) {
    i += 1;
  }
  return i - charPtr;
}

export interface Options {
  noWasi?: boolean; // if false, include wasi
  wasmEnv?: object; // functions to include in the environment
  env?: { [name: string]: string }; // environment variables
  time?: boolean;
  // init = initialization function that gets called when module first loaded.
  init?: (wasm: WasmInstance) => void | Promise<void>;
  traceSyscalls?: boolean;
  traceStubcalls?: "first" | boolean;
  spinLock?: (time: number) => void;
  stdinBuffer?: SharedArrayBuffer;
  signalBuffer?: SharedArrayBuffer;
  waitForStdin?: () => Buffer;
  sendStdout?: (Buffer) => void;
  sendStderr?: (Buffer) => void;
  fs?: FileSystemSpec[]; // only used in node.ts and browser.ts right now.  (TODO: this is due to refactoring)
}

const cache: { [name: string]: any } = {};

type WasmImportFunction = typeof doWasmImport;

async function doWasmImport({
  source,
  bindings,
  options = {},
  log,
  importWebAssemblySync,
  importWebAssembly,
  readFileSync,
}: {
  source: string; // path/url to the source
  bindings: WASIBindings;
  options: Options;
  log?: (...args) => void;
  importWebAssemblySync: (
    path: string,
    opts: WebAssembly.Imports
  ) => WebAssembly.Instance;
  importWebAssembly: (
    path: string,
    opts: WebAssembly.Imports
  ) => Promise<WebAssembly.Instance>;
  readFileSync;
}): Promise<WasmInstance> {
  log?.("doWasmImport", source);
  if (cache[source] != null) {
    return cache[source];
  }
  const t = new Date().valueOf();

  const memory = new WebAssembly.Memory({ initial: 10000 });
  const table = new WebAssembly.Table({ initial: 10000, element: "anyfunc" });

  function recvString(ptr: number, len?: number) {
    if (len == null) {
      // no len given, so assume it is a null terminated string.
      if (wasm.exports.stringLength != null) {
        // probably faster in WASM?  TODO: benchmark
        len = wasm.exports.stringLength(ptr);
      } else {
        len = strlen(ptr, memory);
      }
      if (len == null) throw Error("bug - stringLength must return len");
    }
    const slice = memory.buffer.slice(ptr, ptr + len);
    return textDecoder.decode(slice);
  }

  const wasmEnv = {
    reportError: (ptr, len: number) => {
      // @ts-ignore
      const slice = memory.buffer.slice(ptr, ptr + len);
      const textDecoder = new TextDecoder();
      throw Error(textDecoder.decode(slice));
    },
  };

  // NOTE: if we want to try to use WebAssembly.Table for something,
  // then set env.__indirect_function_table to it.  The name
  // __indirect_function_table is the arbitrary hardcoded name that zig
  // just happens to use for the table it imports when you compile
  // with --import-table. I only figured this out by decompiling and reading. See
  // https://github.com/ziglang/zig/pull/10382/files#diff-e2879374d581d6e9422f4f6f09ae3c8ee5f429f7581d7b899f3863319afff4e0R648
  const wasmOpts: any = {
    env: {
      ...wasmEnv,
      ...options.wasmEnv,
      memory,
      __indirect_function_table: table,
    },
  };

  let wasm;

  if (wasmOpts.env.wasmGetSignalState == null) {
    wasmOpts.env.wasmGetSignalState = () => {
      return 0;
    };
  }
  if (wasmOpts.env.wasmSendString == null) {
    wasmOpts.env.wasmSendString = (ptr: number, len: number) => {
      wasm.result = recvString(ptr, len);
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
        new Uint8Array(memory.buffer),
        bufPtr,
        bufLen
      );
      return bufLen;
    };
  }
  if (wasmOpts.env.main == null) {
    wasmOpts.env.main = () => {
      return 0;
    };
  }

  initPythonTrampolineCalls(table, wasmOpts.env);

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
    wasi = new WASI(opts);
    wasmOpts.wasi_snapshot_preview1 = wasi.wasiImport;
  }

  if (source == null) {
    throw Error("source must be defined for now...");
  }
  const instance = await importWebAssemblyDlopen({
    path: source,
    importWebAssemblySync,
    importWebAssembly,
    readFileSync,
    importObject: wasmOpts,
    stub: true,
    traceStub: options.traceStubcalls,
  });

  if (wasi != null) {
    // wasi assumes this:
    wasi.start(instance, memory);
  }

  wasm = new WasmInstance(instance.exports, memory, fs);
  if (options.init != null) {
    await options.init(wasm);
    // Uncomment this for low level debugging, so that the broken wasm
    // module gets returned.
    /*
    try {
      await options.init(wasm);
    } catch (err) {
      console.warn(`WARNING: init of ${source} failed`, err);
    }
    */
  }

  cache[source] = wasm;

  if (options.time) {
    log?.(`imported ${source} in ${new Date().valueOf() - t}ms`);
  }
  // TODO
  (wasm as any).table = table;

  return wasm;
}

const wasmImport: WasmImportFunction = reuseInFlight(doWasmImport, {
  createKey: (args) => args[0],
});
export default wasmImport;
