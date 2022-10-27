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

const KERNEL_WASM = "kernel.wasm";

// Our tiny termcap file only has one entry, which is for xterm
// so that's all we give you, even if you have a different terminal.
const TERM = "xterm-256color";

interface Options {
  env?: { [name: string]: string }; // extra env vars.
  fs?: FileSystemSpec[];
  wasmEnv?: { [name: string]: Function };
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
  if (!existsSync(env.TERMCAP)) {
    console.warn(`TERMCAP=${env.TERMCAP} is missing`);
  }

  return {
    programName: process.env.PROGRAM_NAME, // real name or made up name
    wasmSource: join(path, KERNEL_WASM),
    wasmImport,
    fs: opts?.fs ?? ([{ type: "native" }] as FileSystemSpec[]),
    env,
    wasmEnv: opts?.wasmEnv,
  };
}

let signal_state = 0;
function wasmGetSignalState() {
  const val = signal_state;
  signal_state = 0;
  return val;
}

export async function syncKernel(opts?: Options): Promise<WasmInstanceSync> {
  process.on("SIGINT", () => {
    console.log("SIGINT!");
    signal_state = SIGINT;
  });
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
  process.on("SIGINT", () => {
    console.log("SIGINT!");
    kernel.signal(SIGINT);
  });
  return kernel;
}
