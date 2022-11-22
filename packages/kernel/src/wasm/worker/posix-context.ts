import WASI from "wasi-js";
import type { WASIBindings, WASIConfig } from "wasi-js";
import WasmInstanceSync from "./instance";
import posix, { Context, PosixEnv } from "../posix";
import SendToWasm from "./send-to-wasm";
import RecvFromWasm from "./recv-from-wasm";
import { cloneDeep } from "lodash";
import debug from "debug";
const log = debug("kernel:posix-context");

interface Options {
  wasiConfig: WASIConfig;
  memory: WebAssembly.Memory;
  wasi: WASI;
}

export default class PosixContext {
  private posixEnv: PosixEnv;
  private wasm?: WasmInstanceSync;
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
    const callWithString = this.callWithString.bind(this);
    this.posixEnv = this.createPosixEnv({
      memory,
      wasi,
      bindings,
      callFunction,
      callWithString,
      sleep,
    });
  }

  private createPosixEnv({
    bindings,
    memory,
    wasi,
    callFunction,
    callWithString,
    sleep,
  }: {
    bindings: WASIBindings;
    memory: WebAssembly.Memory;
    wasi: WASI;
    callFunction: (name: string, ...args) => number | undefined;
    callWithString;
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
      callWithString,
      getcwd: this.getcwd.bind(this),
      free: this.free.bind(this),
      sleep,
    };
    return posix(this.context);
  }

  init(wasm: WasmInstanceSync) {
    this.wasm = wasm;
    this.posixEnv.init();
  }

  // set all the posix functions in env, but do NOT overwrite
  // anything that is already set.  Also, add socket functionality
  // to wasi.
  injectFunctions({
    env,
    wasi_snapshot_preview1,
  }: {
    env: { [name: string]: Function };
    wasi_snapshot_preview1: { [name: string]: Function };
  }) {
    for (const name in this.posixEnv) {
      if (env[name] == null) {
        env[name] = this.posixEnv[name];
      }
    }

    // Add socket functionality to WASI.  This just works around
    // that there is a tiny amount in wasi v0 itself and we have
    // to replace it.  Someday wasi may have more that we have
    // to replace or implement.  See
    //    https://github.com/WebAssembly/wasi-sockets/
    for (const name of [
      "recv",
      "send",
      "shutdown",
      "fcntlSetFlags",
      "pollSocket",
    ]) {
      if (this.posixEnv[name] != null) {
        wasi_snapshot_preview1[`sock_${name}`] = this.posixEnv[name];
      }
    }
  }

  private callWithString(
    func: string | { name: string; dll: string } | Function,
    str?: string | string[],
    ...args
  ): number | undefined {
    if (this.wasm == null) {
      throw Error("wasm must be define");
    }
    return this.wasm.callWithString(func, str, ...args);
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
    log("run", args);
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
      dlopen: wasm.instance.getDlopenState(),
    };
    // I wonder if I could use immer.js instead for any of this?  It might be slower.
    this.context.state = cloneDeep(state.context);
    const wasi_state = cloneDeep(state.wasi);
    let return_code = -1; // not set ==> something went wrong since exit never called.
    wasi_state.bindings.exit = (code: number) => {
      // uncomment this for debugging only
      // console.trace(`exit(${code}) called`);
      return_code = code;
      // after this, the main call below throws an exception
      // then the return_code gets returned right after the
      // finally cleansthings up.
    };

    try {
      this.wasi.setState(wasi_state);
      let main;
      try {
        // this does dlopen of args[0]:
        main = wasm.getFunction("__main_argc_argv", args[0]);
        if (main == null) {
          throw Error("__main_argc_argv is null");
        }
      } catch (_err) {
        try {
          main = wasm.getFunction("main", args[0]);
          if (main == null) {
            throw Error("main and __main_argc_argv are both null");
          }
        } catch (err) {
          console.error(`${args[0]}: ${err}`);
          return 127;
        }
      }
      try {
        return main(args.length, wasm.send.arrayOfStrings(args));
      } catch (err) {
        if (return_code == -1) {
          // code did not get set -- something crashed badly.
          console.error(args[0], err);
          return 139; // segfault return code.
        }
      }
      if (return_code == -1) {
        // code did not get set -- something bad?
        return 139; // segfault return code.
      }
      return return_code;
    } finally {
      // Free up tables allocated to the dynamic library in Javascript memory. These
      // would persist even after resetting memory below, which would break everything.
      wasm.instance.setDlopenState(state.dlopen);
      // Restore memory to how it was before running the subprocess.
      // This of course safely frees up and undoes all changes made to
      // the memory when running code.
      new Uint8Array(this.memory.buffer).set(state.memory);
      // Restore posix context to before running the subprocess.
      this.context.state = state.context;
      this.wasi.setState(state.wasi);
    }
  }
}
