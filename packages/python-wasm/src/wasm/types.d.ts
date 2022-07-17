import { EventEmitter } from "events";

export class WasmInstance extends EventEmitter {
  public callWithString(name: string, str: string, ...args);
}
