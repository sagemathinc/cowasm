import { EventEmitter } from "events";
import type WASI from "@wapython/wasi";
import type { WASIFileSystem } from "@wapython/wasi";

export class WasmInstance extends EventEmitter {
  // these are sometimes available and useful, e.g., in testing
  fs?: WASIFileSystem;
  table?: WebAssembly.Table;
  wasi?: WASI;

  async callWithString(_name: string, _str: string, ..._args): Promise<any> {
    throw Error("not implemented");
  }
  async terminal(_argv: string[] = ["command"]): Promise<number> {
    throw Error("not implemented");
  }
  write(_data: string): void {
    throw Error("not implemented");
  }
  getFunction(_name: string): Function | undefined {
    throw Error("not implemented");
  }
  stringToCharStar(_s: string): number {
    throw Error("not implemented");
  }
}
