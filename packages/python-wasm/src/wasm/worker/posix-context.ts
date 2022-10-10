import WASI from "wasi-js";
import type { WASIBindings, WASIConfig } from "wasi-js";
import type WasmInstance from "./instance";
import posix, { PosixEnv } from "../posix";
import SendToWasm from "./send-to-wasm";
import RecvFromWasm from "./recv-from-wasm";
// import importWebAssemblyDlopen from "dylink"
import { MBtoPages, Options as DylinkOptions } from "dylink";

interface Options {
  wasiConfig: WASIConfig;
  memory: WebAssembly.Memory;
  wasi: WASI;
  dylinkOptions: Pick<DylinkOptions, "importWebAssemblySync">;
}

export default class PosixContext {
  //private bindings: WASIBindings;
  private posixEnv: PosixEnv;
  private wasm: WasmInstance;
  private wasiConfig: WASIConfig;
  private dylinkOptions: Pick<DylinkOptions, "importWebAssemblySync">;

  constructor({ wasiConfig, memory, wasi, dylinkOptions }: Options) {
    this.wasiConfig = wasiConfig;
    this.dylinkOptions = dylinkOptions;
    const { bindings } = wasiConfig;
    this.posixEnv = this.createPosixEnv({ memory, wasi, bindings });
  }

  private createPosixEnv({
    bindings,
    memory,
    wasi,
  }: {
    bindings: WASIBindings;
    memory: WebAssembly.Memory;
    wasi: WASI;
  }) {
    const callFunction = this.callFunction.bind(this);

    return posix({
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
  // TODO: version that uses importWebAssemblyDlopen instead. Don't always do this,
  //       since it's much more expensive. Will need it for running python.  But
  //       maybe later many applications (?).
  private run(args: string[]): number {
    const path = args[0];
    if (path == null) {
      throw Error("args must have length at least 1");
    }
    //console.log("wasm run", args);

    // Create memory, wasi, and bindings
    const memory = new WebAssembly.Memory({
      initial: MBtoPages(1), // maybe some heuristics here, e.g., 10mb better for python, but much less for ls?
    });

    let exitcode = 0;
    const bindings = {
      ...this.wasiConfig.bindings,
      exit: (code: number) => {
        // this is a callback, but it is called *synchronously*.
        exitcode = code;
      },
    };

    const wasi = new WASI({ ...this.wasiConfig, bindings, args });

    const wasmOpts: any = {
      env: this.createPosixEnv({ memory, wasi, bindings }),
      wasi_snapshot_preview1: wasi.wasiImport,
    };

    let instance;
    try {
      instance = this.dylinkOptions.importWebAssemblySync(path, wasmOpts);
    } catch (err) {
      console.error(err);
      return 1;
    }

    // This runs synchronously until exit gets called above, which sets exitcode.
    wasi.start(instance);
    // Then we are here and exit with that exitcode.
    return exitcode;
  }
}
