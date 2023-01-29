/*
Code that is the same for both the browser and node.
*/

import { WasmInstanceAsync, WasmInstanceSync } from "@cowasm/kernel";
import { bind_methods } from "./util";
import debug from "debug";

const log = debug("python-wasm");

type FileSystemOption = "auto" | "bundle" | "everything" | "stdlib";

export interface Options {
  fs?: FileSystemOption;
  noReadline?: boolean;
  env?: object; // overrides or sets environment variables
  interactive?: boolean; // for interactive async terminal or program under nodejs
  noStdio?: boolean; // for nodejs -- do NOT use process.stdin, process.stdout, and process.stderr.  Instead, use the same programatic control of IO as in the browser, i.e., the .kernel has a writeToStdin function and 'stdout' and 'stderr' events.   ONLY for async mode.
}

export class PythonWasmSync {
  kernel: WasmInstanceSync;
  python_wasm: string;

  constructor(kernel: WasmInstanceSync, python_wasm: string) {
    this.kernel = kernel;
    this.python_wasm = python_wasm;
    bind_methods(this);
  }

  init(): void {
    log("loading python.wasm...");
    this.callWithString("cowasm_python_init");
    log("done");
  }

  callWithString(name: string, str?: string | string[], ...args): any {
    return this.kernel.callWithString(
      { name, dll: this.python_wasm },
      str,
      ...args
    );
  }

  repr(code: string): string {
    log("repr", code);
    const s = this.callWithString("cowasm_python_repr", code);
    log("result =", s);
    return s;
  }

  exec(code: string): void {
    log("exec", code);
    const ret = this.callWithString("cowasm_python_exec", code);
    log("ret", ret);
    if (ret) {
      throw Error("exec failed");
    }
  }

  // starts the python REPL
  terminal(argv: string[] = []): number {
    log("terminal", argv);
    // NOTE: when you pass a string[] it actually sends argv.length, argv over to WASM!
    const ret = this.callWithString("cowasm_python_terminal", argv);
    log("terminal ended and returned ", ret);
    return ret;
  }
}

// Run in a worker
export class PythonWasmAsync {
  kernel: WasmInstanceAsync;
  python_wasm: string;

  constructor(kernel: WasmInstanceAsync, python_wasm: string) {
    this.kernel = kernel;
    this.python_wasm = python_wasm;
    bind_methods(this);
  }

  async init(): Promise<void> {
    log("loading and calling cowasm_python_init");
    await this.callWithString("cowasm_python_init");
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
      { name, dll: this.python_wasm },
      str,
      ...args
    );
  }

  async repr(code: string): Promise<string> {
    log("repr", code);
    const ret = await this.callWithString("cowasm_python_repr", code);
    log("done", "ret =", ret);
    return ret;
  }

  async exec(code: string): Promise<void> {
    log("exec", code);
    const ret = await this.callWithString("cowasm_python_exec", code);
    if (ret) {
      throw Error("exec failed");
    }
  }

  async terminal(argv: string[] = []): Promise<number> {
    log("terminal", argv);
    const ret = await this.callWithString(
      "cowasm_python_terminal",
      argv,
      argv.length
    );
    log("terminal ended and returned ", ret);
    return ret;
  }
}
