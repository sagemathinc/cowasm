import { Options } from "./import";
import { callback, delay } from "awaiting";
import { EventEmitter } from "events";
import { Worker } from "worker_threads";

export class WasmInstance extends EventEmitter {
  private worker: Worker;
  private spinLock: Int32Array;
  result: any;
  exports: any;

  constructor(name: string, options: Options) {
    super();
    this.worker = new Worker( // TODO: the path
      "/Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/python-wasm/packages/python-wasm/dist/wasm/import-node-worker.js"
    );
    const spinLockBuffer = new SharedArrayBuffer(4);
    this.spinLock = new Int32Array(spinLockBuffer);
    options = { spinLockBuffer, ...options };
    console.log("options = ", options);
    this.worker.postMessage({ event: "init", name, options });
    this.worker.on("message", async (message) => {
      console.log("main thread got message", message);
      switch (message.event) {
        case "sleep":
          this.pause();
          await delay(message.ms);
          this.resume();
          return;
        case "init":
          this.emit("init", message);
          return;
      }
    });
  }

  private pause() {
    console.log("pause");
    Atomics.store(this.spinLock, 0, 1);
    Atomics.notify(this.spinLock, 0);
  }

  private resume() {
    console.log("resume");
    Atomics.store(this.spinLock, 0, 0);
    Atomics.notify(this.spinLock, 0);
  }

  public callWithString(name: string, str: string, ...args): any {
    console.log("STUB: callWithString ", name, str, args);
    this.worker.postMessage({event:'callWithString', name, str, args});
  }
}

/*
export async function once(
  obj: EventEmitter,
  event: string,
  timeout_ms: number = 0
): Promise<any> {
  if (!(obj instanceof EventEmitter)) {
    // just in case typescript doesn't catch something:
    throw Error("obj must be an EventEmitter");
  }
  if (timeout_ms > 0) {
    // just to keep both versions more readable...
    return once_with_timeout(obj, event, timeout_ms);
  }
  let val: any[] = [];
  function wait(cb: Function): void {
    obj.once(event, function (...args): void {
      val = args;
      cb();
    });
  }
  await awaiting.callback(wait);
  return val;
}*/

export default async function wasmImportNodeWorker(
  name: string,
  options: Options = {}
): Promise<WasmInstance> {
  const wasm = new WasmInstance(name, options);
  await callback((cb) => {
    wasm.once("init", ({ error }) => {
      cb(error);
    });
  });
  return wasm;
}
