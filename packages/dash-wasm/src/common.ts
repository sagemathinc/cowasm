/*
Code that is the same for both the browser and node.
*/

//import debug from "debug";
import { bind_methods } from "./util";
import { join } from "path";

export interface Options {
  interactive?: boolean;
}

const ROOT = "/";

const ENV = {
  TERMCAP: join(ROOT, "share", "termcap"),
  PYTHONHOME: ROOT,
  PATH: join(ROOT, "bin"),
};

export { ROOT, ENV };

class DashWasm {
  public kernel;
  protected dash_wasm: string;

  constructor(kernel, dash_wasm: string) {
    this.kernel = kernel;
    this.dash_wasm = dash_wasm;
    bind_methods(this);
  }
}

export class DashWasmSync extends DashWasm {
  terminal(argv: string[] = []) {
    try {
      return this.kernel.exec([this.dash_wasm].concat(argv.slice(1)));
    } finally {
      this.kernel.terminate();
    }
  }
}

export class DashWasmAsync extends DashWasm {
  async terminal(argv: string[] = []) {
    try {
      return await this.kernel.exec([this.dash_wasm].concat(argv.slice(1)));
    } finally {
      this.kernel.terminate();
    }
  }
}
