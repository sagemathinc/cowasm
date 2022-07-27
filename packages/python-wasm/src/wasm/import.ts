import type { Options } from "./worker/import";
import { callback } from "awaiting";
import { EventEmitter } from "events";
import reuseInFlight from "./reuseInFlight";
export { Options };

const SIGINT = 2;

export interface WorkerThread extends EventEmitter {
  postMessage: (message: object) => void;
  terminate: () => void;
}

export class WasmInstanceAbstractBaseClass extends EventEmitter {
  private callId: number = 0;
  private options: Options;
  private spinLock: Int32Array;
  private stdinLock: Int32Array;
  private signalBuf: Int32Array;
  private sleepTimer: any;
  result: any;
  exports: any;
  waitingForStdin: boolean = false;
  wasmSource: string;

  protected log?: Function;
  protected worker?: WorkerThread;

  constructor(wasmSource: string, options: Options, log?: Function) {
    super();
    this.wasmSource = wasmSource;
    this.options = options;
    this.log = log;
    this.init = reuseInFlight(this.init);
  }

  // MUST override in derived class
  protected initWorker(): WorkerThread {
    abstract("initWorker");
    return null as any; // for typescript
  }

  // MUST override in derived class
  protected async getStdin(): Promise<Buffer> {
    abstract("getStdin");
    return Buffer.from(""); // for typescript
  }

  // Optionally this could be overwritten, if needed (e.g., for the browser version).
  write(_data: string | Uint8Array): void {
    throw Error("write not implemented");
  }

  private async init() {
    if (this.worker) return;
    this.worker = this.initWorker();
    if (!this.worker) throw Error("init - bug");
    const spinLockBuffer = new SharedArrayBuffer(4);
    this.spinLock = new Int32Array(spinLockBuffer);
    const stdinLockBuffer = new SharedArrayBuffer(4);
    this.stdinLock = new Int32Array(stdinLockBuffer);
    const signalBuffer = new SharedArrayBuffer(4);
    this.signalBuf = new Int32Array(signalBuffer);
    const stdinBuffer = new SharedArrayBuffer(10000); // TODO: size?!
    const options = {
      stdinBuffer,
      signalBuffer,
      ...this.options,
    };
    this.log?.("options = ", options);

    this.worker.postMessage({
      event: "init",
      name: this.wasmSource,
      options,
      locks: { spinLockBuffer, stdinLockBuffer },
    });
    this.worker.on("exit", () => this.terminate());
    this.worker.on("message", async (message) => {
      this.log?.("main thread got message", message);
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

            this.log?.("waitForStdin");
            const data = await this.getStdin();
            this.log?.("got data", JSON.stringify(data));

            data.copy(Buffer.from(stdinBuffer));
            Atomics.store(this.stdinLock, 0, data.length);
            Atomics.notify(this.stdinLock, 0);
          } finally {
            this.waitingForStdin = false;
          }

          return;
        case "init":
          this.emit("init", message);
          return;
        case "stdout":
          this.emit("stdout", message.data);
          break;
        case "stderr":
          this.emit("stderr", message.data);
          break;
      }
    });
    await callback((cb) =>
      this.once("init", (message) => {
        cb(message.error);
      })
    );
  }

  terminate() {
    if (this.worker == null) return;
    const worker = this.worker;
    delete this.worker;
    worker.emit("exit");
    worker.terminate();
    worker.removeAllListeners();
  }

  async callWithString(
    name: string,
    str: string | string[],
    ...args
  ): Promise<any> {
    await this.init();
    if (!this.worker) {
      throw Error(
        `callWithString - bug; name=${name}, str=${JSON.stringify(str)}`
      );
    }
    this.callId += 1;
    this.worker.postMessage({
      id: this.callId,
      event: "callWithString",
      name,
      str,
      args,
    });
    return await this.waitForResponse(this.callId);
  }

  private async waitForResponse(id: number): Promise<any> {
    return (
      await callback((cb) => {
        const removeListeners = () => {
          this.removeListener("id", messageListener);
          this.removeListener("sigint", sigintListener);
        };

        const messageListener = (message) => {
          removeListeners();
          if (message.id == id) {
            if (message.error) {
              cb(message.error);
            } else {
              cb(undefined, message);
            }
          }
        };
        this.on("id", messageListener);

        const sigintListener = () => {
          removeListeners();
          cb("KeyboardInterrupt");
        };
        this.once("sigint", sigintListener);

        this.worker?.on("exit", () => {
          removeListeners();
          cb("exit");
        });
      })
    ).result;
  }

  protected sigint() {
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
    Atomics.notify(this.signalBuf, 0);

    if (Atomics.load(this.spinLock, 0) == 1) {
      // Blocked on the sleep timer spin lock.
      clearTimeout(this.sleepTimer);
      // manually unblock
      Atomics.store(this.spinLock, 0, 0);
      Atomics.notify(this.spinLock, 0);
    }
  }

  // Optionally override in derived class
  protected configureTerminal() {}

  async terminal(argv: string[] = ["command"]): Promise<number> {
    await this.init();
    if (this.worker == null) throw Error("terminal: bug");
    this.configureTerminal();
    let r = 0;
    try {
      r = await this.callWithString("terminal", argv);
      this.terminate();
    } catch (_) {
      // expected to fail -- call doesn't get output...
    }
    return r;
  }
}

function abstract(name: string) {
  throw Error(`${name} -- must be defined in derived class`);
}
