/*
Code that is the same for both the browser and node.
*/

import { WasmInstanceAsync, WasmInstanceSync } from "@cowasm/kernel";
import { bind_methods } from "./util";
import debug from "debug";

const log = debug("dash-wasm");

export interface Options {
  noReadline?: boolean;
}

export class DashWasmSync {
  kernel: WasmInstanceSync;
  dash_wasm: string;

  constructor(kernel: WasmInstanceSync, dash_wasm: string) {
    this.kernel = kernel;
    this.dash_wasm = dash_wasm;
    bind_methods(this);
  }

  init(): void {
    log("loading dash.wasm...");
    this.callWithString("cowasm_dash_init");
    log("done");
  }

  callWithString(name: string, str?: string | string[], ...args): any {
    return this.kernel.callWithString(
      { name, dll: this.dash_wasm },
      str,
      ...args
    );
  }

  repr(code: string): string {
    log("repr", code);
    const s = this.callWithString("cowasm_dash_repr", code);
    log("result =", s);
    return s;
  }

  exec(code: string): void {
    log("exec", code);
    const ret = this.callWithString("cowasm_dash_exec", code);
    log("ret", ret);
    if (ret) {
      throw Error("exec failed");
    }
  }

  // starts the dash REPL
  terminal(argv): number {
    console.log("STUB: terminal", argv);
    return 1;
  }
}

// Run in a worker
export class DashWasmAsync {
  kernel: WasmInstanceAsync;
  dash_wasm: string;

  constructor(kernel: WasmInstanceAsync, dash_wasm: string) {
    this.kernel = kernel;
    this.dash_wasm = dash_wasm;
    bind_methods(this);
  }

  async init(): Promise<void> {
    log("loading and calling cowasm_dash_init");
    await this.callWithString("cowasm_dash_init");
    log("done");
  }

  terminate(): void {
    this.kernel.terminate();
  }

  async callWithString(
    name: string,
    str?: string | string[],
    ...args
  ): Promise<any> {
    return await this.kernel.callWithString(
      { name, dll: this.dash_wasm },
      str,
      ...args
    );
  }

  async terminal(argv): Promise<number> {
    console.log("STUB: terminal", argv);
    return 1;
  }
}
