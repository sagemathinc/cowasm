import { EventEmitter } from "events";

export class WasmInstance extends EventEmitter {
  callWithString(name: string, str: string, ...args);
  terminal();
}
