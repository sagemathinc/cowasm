import type { Options } from "./worker/import";
import { callback } from "awaiting";
import { EventEmitter } from "events";
import reuseInFlight from "./reuseInFlight";
import { SendToWasmAbstractBase } from "./worker/send-to-wasm";
import { RecvFromWasmAbstractBase } from "./worker/recv-from-wasm";
export { Options };
import type { IOProvider } from "./types";
import { SIGINT } from "./constants";
import debug from "debug";

const log = debug("wasm-main");

export interface WorkerThread extends EventEmitter {
  postMessage: (message: object) => void;
  terminate: () => void;
}

// TODO: typescript actually has "export abstract class" !  No need to fake it...
export class WasmInstanceAbstractBaseClass extends EventEmitter {
  private callId: number = 0;
  private options: Options;
  private ioProvider: IOProvider;
  result: any;
  exports: any;
  wasmSource: string;

  protected worker?: WorkerThread;

  public send: SendToWasmAbstractBase;
  public recv: RecvFromWasmAbstractBase;

  constructor(wasmSource: string, options: Options, IOProviderClass) {
    super();
    log("constructor", options);
    this.wasmSource = wasmSource;
    this.options = options;
    this.init = reuseInFlight(this.init);
    this.send = new SendToWasmAbstractBase();
    this.recv = new RecvFromWasmAbstractBase();
    this.ioProvider = new IOProviderClass();
  }

  signal(sig: number = SIGINT): void {
    this.ioProvider.signal(sig);
  }

  // MUST override in derived class
  protected initWorker(): WorkerThread {
    abstract("initWorker");
    return null as any; // for typescript
  }

  writeToStdin(data): void {
    log("writeToStdin", data);
    this.ioProvider.writeToStdin(Buffer.from(data));
    if (data.toString().includes("\u0003")) {
      this.signal(SIGINT);
      // This is a hack, but for some reason everything feels better with this included:
      this.ioProvider.writeToStdin(Buffer.from("\n"));
    }
  }

  private async init() {
    if (this.worker) return;
    this.worker = this.initWorker();
    if (!this.worker) throw Error("init - bug");

    const options = { ...this.ioProvider.getExtraOptions(), ...this.options };
    log("options = ", options);

    this.worker.postMessage({
      event: "init",
      name: this.wasmSource,
      options,
    });
    this.worker.on("exit", () => this.terminate());
    this.worker.on("message", (message) => {
      if (message == null) return;
      log("main thread got message", message);
      if (message.id != null) {
        // message with id handled elsewhere -- used for getting data back.
        this.emit("id", message);
        return;
      }
      switch (message.event) {
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

  getcwd(): string {
    throw Error("not implemented");
  }
}

function abstract(name: string) {
  throw Error(`${name} -- must be defined in derived class`);
}
