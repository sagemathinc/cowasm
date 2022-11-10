import WASI from "wasi-js";
import type { FileSystemSpec, WASIConfig, WASIBindings } from "wasi-js";
import reuseInFlight from "../reuseInFlight";
import WasmInstanceSync from "./instance";
import importWebAssemblyDlopen, {
  MBtoPages,
  Options as DylinkOptions,
} from "dylink";
import initPythonTrampolineCalls from "./trampoline";
import debug from "debug";
import PosixContext from "./posix-context";

const log = debug("wasm-worker");

export function strlen(charPtr: number, memory: WebAssembly.Memory): number {
  const mem = new Uint8Array(memory.buffer);
  let i = charPtr;
  while (mem[i]) {
    i += 1;
  }
  return i - charPtr;
}

export interface Options {
  wasmEnv?: { [name: string]: Function }; // functions to include in the environment
  env?: { [name: string]: string }; // environment variables
  time?: boolean;
  sleep?: (milliseconds: number) => void;
  stdinBuffer?: SharedArrayBuffer;
  signalBuffer?: SharedArrayBuffer;
  getStdin?: () => Buffer;
  sendStdout?: (Buffer) => void;
  sendStderr?: (Buffer) => void;
  fs?: FileSystemSpec[]; // only used in node.ts and browser.ts right now.  (TODO: this is due to refactoring)
  locks?: {
    spinLockBuffer: SharedArrayBuffer;
    stdinLockBuffer: SharedArrayBuffer;
  };
}

const cache: { [name: string]: any } = {};

type WasmImportFunction = typeof doWasmImport;

async function doWasmImport({
  source,
  bindings,
  options = {},
  importWebAssemblySync,
  importWebAssembly,
  readFileSync,
  maxMemoryMB,
}: {
  source: string; // path/url to the source
  bindings: WASIBindings;
  options: Options;
  importWebAssemblySync: (
    path: string,
    opts: WebAssembly.Imports
  ) => WebAssembly.Instance;
  importWebAssembly: (
    path: string,
    opts: WebAssembly.Imports
  ) => Promise<WebAssembly.Instance>;
  readFileSync;
  maxMemoryMB?: number;
}): Promise<WasmInstanceSync> {
  log("doWasmImport", source);
  if (source == null) {
    throw Error("source must be defined");
  }
  if (cache[source] != null) {
    return cache[source];
  }
  const t = new Date().valueOf();

  const memory = new WebAssembly.Memory({
    initial: MBtoPages(10),
    ...(maxMemoryMB ? { maximum: MBtoPages(maxMemoryMB) } : {}),
  });
  const table = new WebAssembly.Table({ initial: 10000, element: "anyfunc" });

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
    console.warn("wasmGetSignalState not defined; using STUB");
    wasmOpts.env.wasmGetSignalState = () => {
      return 0;
    };
  }
  if (wasmOpts.env.wasmSendString == null) {
    // This sends a string from WebAssembly back to Typescript and places
    // it in the result variable.
    wasmOpts.env.wasmSendString = (ptr: number, len: number) => {
      wasm.result = wasm.recv.string(ptr, len);
    };
  }
  if (wasmOpts.env.wasmSetException == null) {
    wasmOpts.env.wasmSetException = () => {
      wasm.resultException = true;
    };
  }
  if (wasmOpts.env.getrandom == null) {
    // TODO: didn't need to do this get fixed in newer zig?
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
    // TODO: this seems suspect
    wasmOpts.env.main = () => {
      return 0;
    };
  }

  if (wasmOpts.env._Py_emscripten == null) {
    // TODO: this seems suspect
    wasmOpts.env._Py_emscripten_runtime = () => {
      return 0;
    };
  }

  initPythonTrampolineCalls(table, wasmOpts.env);

  const { fs } = bindings;
  const wasiConfig: WASIConfig = {
    preopens: { "/": "/" },
    bindings,
    args: process.argv,
    env: options.env,
    sleep: options.sleep,
    getStdin: options.getStdin,
    sendStdout: options.sendStdout,
    sendStderr: options.sendStderr,
  };
  const wasi = new WASI(wasiConfig);
  wasmOpts.wasi_snapshot_preview1 = wasi.wasiImport;

  const dylinkOptions = {
    importWebAssemblySync,
    importWebAssembly,
    readFileSync,
    stub: false,
  } as Pick<
    DylinkOptions,
    "importWebAssemblySync" | "importWebAssembly" | "readFileSync" | "stub"
  >;

  const posixContext = new PosixContext({
    memory,
    wasi,
    wasiConfig,
  });
  // This adds the posix functions into env *and* also adds socket
  // functionality to wasi_snapshot_preview1.
  posixContext.injectFunctions(wasmOpts);

  const instance = await importWebAssemblyDlopen({
    ...dylinkOptions,
    path: source,
    importObject: wasmOpts,
  } as DylinkOptions);

  if (wasi != null) {
    // wasi assumes this is called.
    wasi.start(instance, memory);
  }

  wasm = new WasmInstanceSync(instance, memory, fs, table);
  posixContext.init(wasm);

  cache[source] = wasm;

  if (options.time && log.enabled) {
    log(`imported ${source} in ${new Date().valueOf() - t}ms`);
  }
  wasm.table = table;
  wasm.wasi = wasi;
  wasm.posixContext = posixContext;
  wasm.instance = instance;

  return wasm;
}

const wasmImport: WasmImportFunction = reuseInFlight(doWasmImport, {
  createKey: (args) => args[0],
});
export default wasmImport;
