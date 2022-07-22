import { Options } from "./import";
import { callback } from "awaiting";
import { EventEmitter } from "events";
import { Worker } from "worker_threads";
import { dirname, join } from "path";
import callsite from "callsite";
import reuseInFlight from "./reuseInFlight";
import process from "node:process";
import debug from "./debug";

const log = debug("import-node");

const SIGINT = 2;

export class WasmInstance extends EventEmitter {
  private id: number = 0;
  private name: string;
  private options: Options;
  private worker?: Worker;
  private spinLock: Int32Array;
  private stdinLock: Int32Array;
  private signalBuf: Int32Array;
  private sleepTimer: any;
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
    const path = join(
      dirname(callsite()[0]?.getFileName() ?? "."),
      "import-node-worker.js"
    );

    this.worker = new Worker(path);
    const spinLockBuffer = new SharedArrayBuffer(4);
    this.spinLock = new Int32Array(spinLockBuffer);
    const stdinLockBuffer = new SharedArrayBuffer(4);
    this.stdinLock = new Int32Array(stdinLockBuffer);
    const signalBuffer = new SharedArrayBuffer(4);
    this.signalBuf = new Int32Array(signalBuffer);
    const stdinBuffer = new SharedArrayBuffer(10000); // size = todo
    const options = {
      stdinBuffer,
      signalBuffer,
      ...this.options,
    };
    log("options = ", options);

    this.worker.postMessage({
      event: "init",
      name: this.name,
      options,
      locks: { spinLockBuffer, stdinLockBuffer },
    });
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
          Atomics.store(this.spinLock, 0, 1);
          Atomics.notify(this.spinLock, 0);
          this.sleepTimer = setTimeout(() => {
            Atomics.store(this.spinLock, 0, 0);
            Atomics.notify(this.spinLock, 0);
          }, message.time);
          return;

        case "waitForStdin":
          if (this.waitingForStdin) return;
          this.waitingForStdin = true;
          try {
            Atomics.store(this.stdinLock, 0, -1);
            Atomics.notify(this.stdinLock, 0);
            log("waitForStdin");
            const data = await callback((cb) => {
              process.stdin.once("data", (data) => {
                cb(undefined, data);
              });
            });
            log("got data", JSON.stringify(data));
            data.copy(Buffer.from(stdinBuffer));
            Atomics.store(this.stdinLock, 0, data.length); // NOTE: length of 0 won't break this at least...
            Atomics.notify(this.stdinLock, 0);
          } finally {
            this.waitingForStdin = false;
          }
          return;
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
    worker.emit("exit");
    worker.terminate();
    worker.removeAllListeners();
    for (const f of this.stdinListeners ?? []) {
      process.stdin.addListener("data", f);
    }
    process.stdout.write("^D\n> ");
  }

  async callWithString(
    name: string,
    str: string | string[],
    ...args
  ): Promise<any> {
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

  private sigint() {
    if (Atomics.load(this.stdinLock, 0) == -1) {
      // TODO: blocked on stdin lock -- not sure how to deal with this yet.
      // Python normally would discard the input buffer and deal
      // with signals.  For some reason our readline isn't dealing
      // with signals.  Maybe it has to be made aware somehow.
      // For now, best we can do is nothing.
      return;
    }

    // tell other side about this signal.
    Atomics.store(this.signalBuf, 0, SIGINT);

    if (Atomics.load(this.spinLock, 0) == 1) {
      // blocked on our own sleep timer spin lock...
      // sleep timer
      clearTimeout(this.sleepTimer);
      // manually unblock
      Atomics.store(this.spinLock, 0, 0);
      Atomics.notify(this.spinLock, 0);
    }
  }

  async terminal(argv: string[] = ["command"]) {
    await this.init();
    if (!this.worker) throw Error("bug");
    this.stdinListeners = process.stdin.listeners("data");
    for (const f of this.stdinListeners) {
      process.stdin.removeListener("data", f);
    }
    try {
      process.stdin.on("data", (data) => {
        log(`stdin: ${data.toString()}`);
        if (data.includes("\u0003")) {
          this.sigint();
        }
      });
      await this.callWithString("terminal", argv);
      this.terminate();
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
