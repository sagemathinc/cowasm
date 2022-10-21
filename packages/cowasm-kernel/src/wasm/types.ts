import { EventEmitter } from "events";
import type WASI from "wasi-js";
import type { WASIFileSystem } from "wasi-js";
import type { SendToWasmAbstractBase } from "./worker/send-to-wasm";
import type { RecvFromWasmAbstractBase } from "./worker/recv-from-wasm";
import type PosixContext from "./worker/posix-context";

export class WasmInstance extends EventEmitter {
  // these are sometimes available and useful, e.g., in testing
  fs?: WASIFileSystem;
  table?: WebAssembly.Table;
  wasi?: WASI;
  posixContext?: PosixContext;
  send: SendToWasmAbstractBase;
  recv: RecvFromWasmAbstractBase;

  async callWithString(_name: string, _str: string | string[], ..._args): Promise<any> {
    throw Error("not implemented");
  }

  async exec(_argv: string[] = ["command"]): Promise<number> {
    throw Error("not implemented");
  }

  writeToStdin(_data): void {
    throw Error("not implemented");
  }

  getFunction(_name: string, _dll?:string): Function | undefined {
    throw Error("not implemented");
  }

  // Wait until the filesystem is loaded enough to run user code.
  waitUntilFsLoaded(): Promise<void> {
    throw Error("not implemented");
  }

  signal(_sig?: number): void {
    throw Error("not implemented");
  }

  // Get the current working directory.
  getcwd(): string {
    throw Error("not implemented");
  }
}

export class IOProvider {
  signal: (sig: number) => void;
  getExtraOptions: () => object;
  writeToStdin: (data: Buffer) => void;
}
