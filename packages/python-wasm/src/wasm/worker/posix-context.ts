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
  private wasm?: WasmInstance;
  private wasi: WASI;
  private memory: WebAssembly.Memory;
  private context: Context;
  private wasiConfig: WASIConfig;

  constructor({ wasiConfig, memory, wasi }: Options) {
    this.memory = memory;
    this.wasi = wasi;
    this.wasiConfig = wasiConfig;
    const { bindings, sleep } = wasiConfig;
    const callFunction = this.callFunction.bind(this);
    this.posixEnv = this.createPosixEnv({
      memory,
      wasi,
      bindings,
      callFunction,
      sleep,
    });
  }

  private createPosixEnv({
    bindings,
    memory,
    wasi,
    callFunction,
    sleep,
  }: {
    bindings: WASIBindings;
    memory: WebAssembly.Memory;
    wasi: WASI;
    callFunction: (name: string, ...args) => number | undefined;
    sleep?: (milliseconds: number) => void;
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
      sleep,
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
    if (this.wasm == null) {
      throw Error("wasm must be define");
    }
    const f = this.wasm.getFunction(name);
    if (f == null) {
      throw Error(`error - ${name} is not defined`);
    }
    return f(...args);
  }

  private getcwd(): string {
    if (this.wasm == null) {
      throw Error("wasm must be define");
    }
    if (this.wasm.getcwd == null) {
      throw Error(`error - getcwd is not defined`);
    }
    return this.wasm.getcwd();
  }

  private free(ptr: number): void {
    this.wasm?.exports.c_free(ptr);
  }

  private run(args: string[]): number {
    const { wasm } = this;
    if (wasm == null) {
      throw Error("wasm must be define");
    }
    const path = args[0];
    if (path == null) {
      throw Error("args must have length at least 1");
    }

    // save memory and function caching context
    const state = {
      memory: new Uint8Array(this.memory.buffer).slice(),
      context: this.context.state,
      wasi: this.wasi.getState(),
      exit: this.wasiConfig.bindings.exit,
    };
    // I wonder if I could use immer.js instead for any of this?  It might be slower.
    this.context.state = cloneDeep(state.context);
    const wasi_state = cloneDeep(state.wasi);
    let return_code = 1; // not set ==> something went wrong
    wasi_state.bindings.exit = (code: number) => {
      return_code = code;
      // after this, the main call below throws an exception
      // then the return_code gets returned right after the
      // finally cleansthings up.
    };

    let handle = 0;
    try {
      this.wasi.setState(wasi_state);
      handle = wasm.callWithString("dlopen", args[0]);
      const dlsym = wasm.getFunction("dlsym");
      if (dlsym == null) {
        console.error(`${args[0]}: dlsym not defined`);
        return 1;
      }
      // These wasm.send.string's are NOT really memory leaks, since we reset the memory below.
      let mainPtr;
      let sPtr = wasm.send.string("__main_argc_argv");
      mainPtr = dlsym(handle, sPtr);
      if (!mainPtr) {
        sPtr = wasm.send.string("main");
        mainPtr = dlsym(handle, sPtr);
        if (!mainPtr) {
          console.error(
            `${args[0]}: unable to find either symbol '__main_argc_argv' or 'main' in '${path}' (compile with -fvisibility-main?)`
          );
          return 1;
        }
      }
      const main = wasm.table?.get(mainPtr);
      if (!main) {
        console.error(`${args[0]}: unable to find main function`);
        return 1;
      }
      try {
        return main(args.length, wasm.send.arrayOfStrings(args));
      } catch (_) {}
      return return_code;
    } finally {
      if (handle) {
        const dlclose = wasm.getFunction("dlclose");
        if (dlclose == null) {
          // should definitely never happen
          console.error(`${args[0]}: dlclose not defined`);
          return 1;
        }
        dlclose(handle);
      }
      // Restore memory to how it was before running the subprocess.
      new Uint8Array(this.memory.buffer).set(state.memory);
      // Restore posix context to before running the subprocess.
      this.context.state = state.context;
      this.wasi.setState(state.wasi);
    }
  }
}
