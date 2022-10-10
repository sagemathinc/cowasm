import WASI from "wasi-js";
import type { WASIBindings } from "wasi-js";
import type WasmInstance from "./instance";
import posix, { PosixEnv } from "../posix";
import SendToWasm from "./send-to-wasm";
import RecvFromWasm from "./recv-from-wasm";

interface Options {
  bindings: WASIBindings;
  memory: WebAssembly.Memory;
  wasi: WASI;
}

export default class PosixContext {
  //private bindings: WASIBindings;
  private posixEnv: PosixEnv;
  private wasm: WasmInstance;

  constructor({ bindings, memory, wasi }: Options) {
    //this.bindings = bindings;

    const callFunction = this.callFunction.bind(this);

    this.posixEnv = posix({
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
    });
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

  // TODO: env
  private run(args: string[]): number {
    const path = args[0];
    if (path == null) {
      throw Error("args must have length at least 1");
    }
    console.log("need to rewrite run");
    return 1;
    /*
    //console.log("wasm run", args);
    let exitcode = 0;
    const _bindings = {
      ...bindings,
      exit: (_exitcode: number) => {
        // this is a callback, but it is called *synchronously*.
        exitcode = _exitcode;
      },
    };
    const _wasi = new WASI({ ...opts, bindings: _bindings, args });
    const _wasmOpts = { ...wasmOpts };
    _wasmOpts.wasi_snapshot_preview1 = _wasi.wasiImport;
    let instance;
    try {
      instance = importWebAssemblySync(path, _wasmOpts);
    } catch (err) {
      console.error(err);
      return 1;
    }
    _wasi.start(instance);
    return exitcode;
    */
  }
}
