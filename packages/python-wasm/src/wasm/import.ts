import type { Options } from "./worker/import";
import { callback } from "awaiting";
import { EventEmitter } from "events";
import reuseInFlight from "./reuseInFlight";
import { SendToWasmAbstractBase } from "./worker/send-to-wasm";
import { RecvFromWasmAbstractBase } from "./worker/recv-from-wasm";
export { Options };
import IOProviderUsingAtomics from "./io-using-atomics";
import type { IOProvider } from "./types";
import { SIGINT } from "./constants";

export interface WorkerThread extends EventEmitter {
  postMessage: (message: object) => void;
  terminate: () => void;
}

export class WasmInstanceAbstractBaseClass extends EventEmitter {
  private callId: number = 0;
  private options: Options;
  private ioProvider: IOProvider;
  result: any;
  exports: any;
  wasmSource: string;

  protected log?: Function;
  protected worker?: WorkerThread;

  public send: SendToWasmAbstractBase;
  public recv: RecvFromWasmAbstractBase;

  constructor(wasmSource: string, options: Options, log?: Function) {
    super();
    this.wasmSource = wasmSource;
    this.options = options;
    this.log = log;
    this.init = reuseInFlight(this.init);
    this.send = new SendToWasmAbstractBase();
    this.recv = new RecvFromWasmAbstractBase();
    this.ioProvider = new IOProviderUsingAtomics({
      getStdinAsync: this.getStdinAsync.bind(this),
    });
  }

  signal(sig: number = SIGINT): void {
    this.ioProvider.signal(sig);
  }

  sleep(milliseconds: number): void {
    this.ioProvider.sleep(milliseconds);
  }

  getStdin(): void {
    this.ioProvider.getStdin();
  }

  // MUST override in derived class
  protected initWorker(): WorkerThread {
    abstract("initWorker");
    return null as any; // for typescript
  }

  // MUST override in derived class
  protected async getStdinAsync(): Promise<Buffer> {
    abstract("getStdinAsync");
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

    const options = { ...this.ioProvider.getExtraOptions(), ...this.options };
    this.log?.("options = ", options);

    this.worker.postMessage({
      event: "init",
      name: this.wasmSource,
      options,
    });
    this.worker.on("exit", () => this.terminate());
    this.worker.on("message", (message) => {
      if (message == null) return;
      this.log?.("main thread got message", message);
      if (message.id != null) {
        // message with id handled elsewhere -- used for getting data back.
        this.emit("id", message);
        return;
      }
      switch (message.event) {
        case "sleep":
          this.sleep(message.milliseconds);
          return;

        case "getStdin":
          this.getStdin();
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

  async waitUntilFsLoaded(): Promise<void> {
    if (!this.worker) {
      throw Error(`waitUntilFsLoaded - bug; worker must be defined`);
    }
    this.callId += 1;
    this.worker.postMessage({
      id: this.callId,
      event: "waitUntilFsLoaded",
    });
    await this.waitForResponse(this.callId);
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

  getFunction(_name: string): Function | undefined {
    throw Error("not implemented");
  }
}

function abstract(name: string) {
  throw Error(`${name} -- must be defined in derived class`);
}
