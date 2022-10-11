import WASI from "wasi-js";
import type { WASIBindings, WASIConfig } from "wasi-js";
import WasmInstance from "./instance";
import posix, { Context, PosixEnv } from "../posix";
import SendToWasm from "./send-to-wasm";
import RecvFromWasm from "./recv-from-wasm";
import { cloneDeep } from "lodash";

interface Options {
  wasiConfig: WASIConfig;
  memory: WebAssembly.Memory;
  wasi: WASI;
}

export default class PosixContext {
  private posixEnv: PosixEnv;
  private wasm: WasmInstance;
  private memory: WebAssembly.Memory;
  private context: Context;

  constructor({ wasiConfig, memory, wasi }: Options) {
    this.memory = memory;
    const { bindings } = wasiConfig;
    const callFunction = this.callFunction.bind(this);
    this.posixEnv = this.createPosixEnv({
      memory,
      wasi,
      bindings,
      callFunction,
    });
  }

  private createPosixEnv({
    bindings,
    memory,
    wasi,
    callFunction,
  }: {
    bindings: WASIBindings;
    memory: WebAssembly.Memory;
    wasi: WASI;
    callFunction: (name: string, ...args) => number | undefined;
  }) {
    this.context = {
      state: {},
      fs: bindings.fs,
      send: new SendToWasm({ memory, callFunction }),
      recv: new RecvFromWasm({ memory, callFunction }),
      wasi,
      run: this.run.bind(this),
      process,
      os: bindings.os ?? {},
      posix: bindings.posix ?? {},
      child_process: bindings.child_process ?? {},
      memory,
      callFunction,
      getcwd: this.getcwd.bind(this),
      free: this.free.bind(this),
    };
    return posix(this.context);
  }

  init(wasm: WasmInstance) {
    this.wasm = wasm;
    this.posixEnv.init();
  }

  // set all the posix functions in env, but do NOT overwrite
  // anything that is already set.
  injectFunctions(env: { [name: string]: Function }) {
    for (const name in this.posixEnv) {
      if (env[name] == null) {
        env[name] = this.posixEnv[name];
      }
    }
  }

  private callFunction(name: string, ...args): number | undefined {
    const f = this.wasm.getFunction(name);
    if (f == null) {
      throw Error(`error - ${name} is not defined`);
    }
    return f(...args);
  }

  private getcwd(): string {
    if (this.wasm.getcwd == null) {
      throw Error(`error - getcwd is not defined`);
    }
    return this.wasm.getcwd();
  }

  private free(ptr: number): void {
    this.wasm.exports.c_free(ptr);
  }

  private run(args: string[]): number {
    const path = args[0];
    if (path == null) {
      throw Error("args must have length at least 1");
    }

    // save memory and function caching context
    const state = {
      memory: new Uint8Array(this.memory.buffer).slice(),
      context: this.context.state,
    };
    // I wonder if I could use immer.js instead?
    this.context.state = cloneDeep(this.context.state);

    try {
      const handle = this.wasm.callWithString("dlopen", args[0]);
      const dlsym = this.wasm.getFunction("dlsym");
      if (dlsym == null) {
        console.error(`${args[0]}: dlsym not defined`);
        return 1;
      }
      // This is not a memory leak, since we reset the memory below.
      const sPtr = this.wasm.send.string("__main_argc_argv");
      const mainPtr = dlsym(handle, sPtr);
      if (!mainPtr) {
        console.error(`${args[0]}: unable to find main pointer`);
        return 1;
      }
      const main = this.wasm.table?.get(mainPtr);
      if (!main) {
        console.error(`${args[0]}: unable to find main function`);
        return 1;
      }
      const ret = main(args.length, this.wasm.send.arrayOfStrings(args));

      const dlclose = this.wasm.getFunction("dlclose");
      if (dlclose == null) {
        console.error(`${args[0]}: dlclose not defined`);
        return 1;
      }
      dlclose(handle);

      return ret;
    } finally {
      // Restore memory to how it was before running the subprocess.
      new Uint8Array(this.memory.buffer).set(state.memory);
      // Restore posix context to befoe running the subprocess.
      this.context.state = state.context;
    }
  }
}
