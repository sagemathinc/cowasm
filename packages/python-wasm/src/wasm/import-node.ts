import { Options } from "./import";
import { callback, delay } from "awaiting";
import { EventEmitter } from "events";
import { Worker } from "worker_threads";
import { dirname, join } from "path";
import callsite from "callsite";
import reuseInFlight from "./reuseInFlight";

const logToFile = (...args) => {
  require("fs").appendFile(
    "/tmp/import-node.log",
    args.map((s) => JSON.stringify(s)).join(" ") + "\n",
    () => {}
  );
};

export class WasmInstance extends EventEmitter {
  private id: number = 0;
  private name: string;
  private options: Options;
  private worker?: Worker;
  private spinLock: Int32Array;
  result: any;
  exports: any;
  waitingForStdin: boolean = false;
  stdinListeners?: any[];

  constructor(name: string, options: Options) {
    super();
    this.name = name;
    this.options = options;
    this.init = reuseInFlight(this.init);
  }

  write(_data: string): void {
    throw Error("write not implemented");
  }

  private async init() {
    if (this.worker) return;
    const log = logToFile;
    const path = join(
      dirname(callsite()[0]?.getFileName() ?? "."),
      "import-node-worker.js"
    );

    this.worker = new Worker(path);
    const spinLockBuffer = new SharedArrayBuffer(4);
    const stdinBuffer = new SharedArrayBuffer(10000); // size = todo
    this.spinLock = new Int32Array(spinLockBuffer);
    const options = { spinLockBuffer, stdinBuffer, ...this.options };
    log("options = ", options);
    this.worker.postMessage({ event: "init", name: this.name, options });
    this.worker.on("exit", () => this.terminate());
    this.worker.on("message", async (message) => {
      log("main thread got message", message);
      if (message.id != null) {
        // message with id handled elsewhere -- used for getting data back.
        this.emit("id", message);
        return;
      }
      switch (message.event) {
        case "sleep":
          this.pause();
          await delay(message.time);
          this.resume();
          return;
        case "waitForStdin":
          if (this.waitingForStdin) return;
          this.waitingForStdin = true;
          try {
            this.pause();
            log("waitForStdin");
            const data = await callback((cb) => {
              process.stdin.once("data", (data) => {
                cb(undefined, data);
              });
            });
            log("got data", data.toString());
            if (data.includes("\u0004")) {
              // Ctrl+D
              this.terminate();
              return;
            }
            data.copy(Buffer.from(stdinBuffer));
            Atomics.store(this.spinLock, 0, data.length);
            Atomics.notify(this.spinLock, 0);
            return;
          } finally {
            this.waitingForStdin = false;
          }
        case "init":
          this.emit("init", message);
          return;
      }
    });
    await callback((cb) =>
      this.once("init", (message) => {
        cb(message.error);
      })
    );
  }

  terminate() {
    if (!this.worker) return;
    const worker = this.worker;
    delete this.worker;
    worker.emit('exit');
    worker.terminate();
    worker.removeAllListeners();
    for (const f of this.stdinListeners ?? []) {
      process.stdin.addListener("data", f);
    }
    process.stdout.write("^D\n> ");
  }

  private pause() {
    Atomics.store(this.spinLock, 0, 0);
    Atomics.notify(this.spinLock, 0);
  }

  private resume() {
    Atomics.store(this.spinLock, 0, 1);
    Atomics.notify(this.spinLock, 0);
  }

  async callWithString(name: string, str: string, ...args): Promise<any> {
    await this.init();
    if (!this.worker) throw Error("bug");
    this.id += 1;
    this.worker.postMessage({
      id: this.id,
      event: "callWithString",
      name,
      str,
      args,
    });
    return await this.waitForResponse(this.id);
  }

  private async waitForResponse(id: number): Promise<any> {
    return (
      await callback((cb) => {
        const listener = (message) => {
          if (message.id == id) {
            this.removeListener("id", listener);
            cb(undefined, message);
          }
        };
        this.on("id", listener);
        this.worker?.on("exit", () => {
          this.removeListener("id", listener);
          cb("exit");
        });
      })
    ).result;
  }

  async terminal() {
    await this.init();
    if (!this.worker) throw Error("bug");
    this.stdinListeners = process.stdin.listeners("data");
    for (const f of this.stdinListeners) {
      process.stdin.removeListener("data", f);
    }
    try {
      await this.callWithString("terminal", "");
    } catch (_err) {
      // expected to fail -- call doesn't get output...
    }
  }
}

export default async function wasmImportNodeWorker(
  name: string,
  options: Options = {}
): Promise<WasmInstance> {
  return new WasmInstance(name, options);
}
