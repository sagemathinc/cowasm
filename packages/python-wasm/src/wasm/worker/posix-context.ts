import WASI from "wasi-js";
import type { WASIBindings, WASIConfig } from "wasi-js";
import WasmInstance from "./instance";
import posix, { PosixEnv } from "../posix";
import SendToWasm from "./send-to-wasm";
import RecvFromWasm from "./recv-from-wasm";
import { Options as DylinkOptions } from "dylink";

interface Options {
  wasiConfig: WASIConfig;
  memory: WebAssembly.Memory;
  wasi: WASI;
  dylinkOptions: Pick<DylinkOptions, "importWebAssemblySync">;
}

export default class PosixContext {
  private posixEnv: PosixEnv;
  private wasm: WasmInstance;
  private wasiConfig: WASIConfig;
  private dylinkOptions: Pick<DylinkOptions, "importWebAssemblySync">;
  // private runCache: any = {}; // TODO: LRU cache?

  constructor({ wasiConfig, memory, wasi, dylinkOptions }: Options) {
    this.wasiConfig = wasiConfig;
    this.dylinkOptions = dylinkOptions;
    const { bindings } = wasiConfig;
    const callFunction = this.callFunction.bind(this);
    this.posixEnv = this.createPosixEnv({
      getView: () => new DataView(memory.buffer),
      wasi,
      bindings,
      callFunction,
    });
  }

  private createPosixEnv({
    bindings,
    getView,
    wasi,
    callFunction,
  }: {
    bindings: WASIBindings;
    getView: () => DataView;
    wasi: WASI;
    callFunction: (name: string, ...args) => number | undefined;
  }) {
    return posix({
      fs: bindings.fs,
      send: new SendToWasm({ getView, callFunction }),
      recv: new RecvFromWasm({ getView, callFunction }),
      wasi,
      run: this.run.bind(this),
      process,
      os: bindings.os ?? {},
      posix: bindings.posix ?? {},
      child_process: bindings.child_process ?? {},
      getView,
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
  // TODO: version that uses importWebAssemblyDlopen instead. Don't always do this,
  //       since it's much more expensive. Will need it for running python.  But
  //       maybe later many applications (?).
  //   private run_getInstance(path:string) {
  //     if (this.runCache[path] != null) {
  //       return this.runCache[path];
  //     }

  //   }

  private run(args: string[]): number {
    //let t0 = new Date();
    const path = args[0];
    if (path == null) {
      throw Error("args must have length at least 1");
    }
    //console.log("wasm run", args);
    let exitcode = 0;
    const bindings = {
      ...this.wasiConfig.bindings,
      exit: (code: number) => {
        // this is a callback, but it is called *synchronously*.
        exitcode = code;
      },
    };

    const wasi = new WASI({ ...this.wasiConfig, bindings, args });
    let wasm: WasmInstance | undefined;

    const callFunction = (name: string, ...args) => {
      const f = wasm?.getFunction(name);
      if (f == null) {
        console.warn(`${name} is not defined; using stub`);
        return 0;
        throw Error(`error - ${name} is not defined`);
      }
      return f(...args);
    };

    const posixEnv = this.createPosixEnv({
      getView: () => new DataView(instance.exports.memory.buffer),
      wasi,
      bindings,
      callFunction,
    });
    const wasmOpts: any = {
      env: posixEnv,
      wasi_snapshot_preview1: wasi.wasiImport,
    };

    let instance;
    try {
      instance = this.dylinkOptions.importWebAssemblySync(path, wasmOpts);
    } catch (err) {
      console.error(err);
      return 1;
    }
    wasm = new WasmInstance(instance.exports, instance.exports.memory);
    //console.log("init", new Date() - t0); t0 = new Date();
    // This runs synchronously until exit gets called above, which sets exitcode.
    wasi.start(instance);

    //console.log("ran", new Date() - t0);
    // Then we are here and exit with that exitcode.
    return exitcode;
  }
}
