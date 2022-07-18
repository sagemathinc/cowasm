import { Options } from "./import";
import { callback, delay } from "awaiting";
import { EventEmitter } from "events";
import { Worker } from "worker_threads";

const logToFile = (...args) => {
  require("fs").appendFile(
    "/tmp/import-node.log",
    args.map((s) => JSON.stringify(s)).join(" ") + "\n",
    () => {}
  );
};

export class WasmInstance extends EventEmitter {
  private worker: Worker;
  private spinLock: Int32Array;
  result: any;
  exports: any;

  constructor(name: string, options: Options) {
    const log = logToFile;
    super();
    this.worker = new Worker( // TODO: the path
      "/Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/python-wasm/packages/python-wasm/dist/wasm/import-node-worker.js",
      { stdin: true }
    );
    const spinLockBuffer = new SharedArrayBuffer(4);
    const stdinBuffer = new SharedArrayBuffer(10000); // size = todo
    this.spinLock = new Int32Array(spinLockBuffer);
    options = { spinLockBuffer, stdinBuffer, ...options };
    log("options = ", options);
    this.worker.postMessage({ event: "init", name, options });
    this.worker.on("message", async (message) => {
      log("main thread got message", message);
      switch (message.event) {
        case "sleep":
          this.pause();
          await delay(message.time);
          this.resume();
          return;
        case "waitForStdin":
          this.pause();
          log("waitForStdin");
          const data = await callback((cb) => {
            process.stdin.once("data", (data) => {
              cb(undefined, data);
            });
          });
          log("got data", data.toString());
          data.copy(Buffer.from(stdinBuffer));
          Atomics.store(this.spinLock, 0, data.length);
          Atomics.notify(this.spinLock, 0);
          return;
        case "init":
          this.emit("init", message);
          return;
      }
    });
  }

  private pause() {
    // console.log("pause");
    Atomics.store(this.spinLock, 0, 0);
    Atomics.notify(this.spinLock, 0);
  }

  private resume() {
   // console.log("resume");
    Atomics.store(this.spinLock, 0, 1);
    Atomics.notify(this.spinLock, 0);
  }

  public callWithString(name: string, str: string, ...args): any {
    console.log("STUB: callWithString ", name, str, args);
    this.worker.postMessage({ event: "callWithString", name, str, args });
  }

  public pymain() {
    const mainListener = process.stdin.listeners("data");
    this.worker.postMessage({ event: "call", name: "pymain" });
    process.stdin.removeListener("data", mainListener[0] as any);
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
