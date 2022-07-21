import { EventEmitter } from "events";

export class WasmInstance extends EventEmitter {
  async callWithString(_name: string, _str: string, ..._args): Promise<any> {}
  async terminal(_argv: string[]=['command']) {}
  write(_data: string): void {}
}
