import { EventEmitter } from "events";

export class WasmInstance extends EventEmitter {
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
