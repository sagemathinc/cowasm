import type { WasmInstanceAsync, WasmInstanceSync } from "../wasm/types";
export { WasmInstanceAsync, WasmInstanceSync };
import wasmAsyncImport from "../wasm/import-node";
import wasmSyncImport from "../wasm/worker/node";
import { createSyncKernel, createAsyncKernel } from "./kernel";
import { join } from "path";
import { existsSync } from "fs";
import type { FileSystemSpec } from "wasi-js";
export { FileSystemSpec };
import { SIGINT } from "../wasm/constants";
import posix from "posix-node";

const KERNEL_WASM = "kernel.wasm";

// Our tiny termcap file only has one entry, which is for xterm
// so that's all we give you, even if you have a different terminal.
const TERM = "xterm-256color";

interface Options {
  env?: { [name: string]: string }; // extra env vars.
  fs?: FileSystemSpec[];
  wasmEnv?: { [name: string]: Function };
  interactive?: boolean; // enable terminal and signal handling in async mode.
}

function getOptions(wasmImport, opts?: Options) {
  const path = __dirname;

  const env = {
    ...process.env,
    TERM,
    TERMCAP: join(path, "..", "termcap"),
    PS1: "(CoWasm) sh$ ",
    ...opts?.env,
  };
  //PS1: '(CoWasm) sh: (pwd | sed "s|^$HOME|~|")$ '

  return {
    programName: process.env.PROGRAM_NAME, // real name or made up name
    wasmSource: join(path, KERNEL_WASM),
    wasmImport,
    fs: opts?.fs ?? ([{ type: "native" }] as FileSystemSpec[]),
    env,
    wasmEnv: opts?.wasmEnv,
  };
}

// NOTE: we can't just use 'process.on("SIGINT", () => { signal_state = SIGINT; });'
// since the WASM program is blocking events. They just don't happen.  Hence
// we use Zig code against libc for the sync kernel.
// NOTE: Every program needs their own way of explicitly checking for signals, and
// this is only implemented for Python right now.  I'll add it for other things eventually.
function wasmGetSignalState() {
  const state = posix.getSignalState?.(SIGINT) ?? 0;
  return state ? SIGINT : 0;
}

export async function syncKernel(opts?: Options): Promise<WasmInstanceSync> {
  posix.watchForSignal?.(SIGINT);
  const kernel = await createSyncKernel(
    getOptions(wasmSyncImport, {
      ...opts,
      wasmEnv: { wasmGetSignalState, ...opts?.wasmEnv },
    })
  );
  return kernel;
}

export async function asyncKernel(opts?: Options): Promise<WasmInstanceAsync> {
  const kernel = await createAsyncKernel(getOptions(wasmAsyncImport, opts));
  if (opts?.interactive) {
    asyncIO(kernel);
  }
  return kernel;
}

export function supportsPosix(): boolean {
  return posix.makeStdinBlocking != null;
}

function asyncIO(kernel: WasmInstanceAsync) {
  const keyHandler = (key) => {
    kernel.writeToStdin(key);
  };
  process.stdin.on("data", keyHandler);

  const sigintHandler = () => {
    kernel.signal(SIGINT);
  };
  process.on("SIGINT", sigintHandler);

  kernel.on("terminate", () => {
    process.stdin.removeListener("data", keyHandler);
    process.removeListener("SIGINT", sigintHandler);
  });
}
