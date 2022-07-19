import { Options } from "./import";
import { callback, delay } from "awaiting";
import { EventEmitter } from "events";
import reuseInFlight from "./reuseInFlight";

export class WasmInstance extends EventEmitter {
  private id: number = 0;
  private wasmUrl: string;
  private options: Options;
  private worker?: Worker;
  private spinLock: Int32Array;
  result: any;
  exports: any;
  waitingForStdin: boolean = false;
  stdin: string = "";

  constructor(wasmUrl: string, options: Options) {
    super();
    this.wasmUrl = wasmUrl;
    this.options = options;
    this.init = reuseInFlight(this.init);
  }

  write(data: string): void {
    this.stdin += data;
    this.emit("stdin");
  }

  private async init() {
    if (this.worker) return;
    const log = (..._args) => {}; // console.log;
    this.worker = new Worker( // @ts-ignore -- actually only consumed by webpack in calling code...
      new URL("./import-browser-worker.js", import.meta.url)
    );
    const spinLockBuffer = new SharedArrayBuffer(4);
    const stdinBuffer = new SharedArrayBuffer(10000); // size = todo
    this.spinLock = new Int32Array(spinLockBuffer);
    const options = { spinLockBuffer, stdinBuffer, ...this.options };
    log("options = ", options);
    this.worker.postMessage({ event: "init", wasmUrl: this.wasmUrl, options });
    this.worker.onmessage = async ({ data: message }) => {
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
            log("waitForStdin...");
            if (!this.stdin) {
              await callback((cb) => {
                this.once("stdin", () => {
                  cb();
                });
              });
            }
            // console.log(`got stdin=${this.stdin}`);
            const data = Buffer.from(this.stdin);
            this.stdin = "";
            data.copy(Buffer.from(stdinBuffer));
            Atomics.store(this.spinLock, 0, data.length);
            Atomics.notify(this.spinLock, 0);
            return;
          } finally {
            this.waitingForStdin = false;
          }
        case "stdout":
          this.emit("stdout", message.data);
          break;
        case "stderr":
          this.emit("stderr", message.data);
          break;

        case "init":
          this.emit("init", message);
          return;
      }
    };

    await callback((cb) =>
      this.once("init", (message) => {
        cb(message.error);
      })
    );
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
        this.on("id", (message) => {
          if (message.id == id) {
            cb(undefined, message);
          }
        });
      })
    ).result;
  }

  async terminal() {
    await this.init();
    if (!this.worker) throw Error("bug");
    this.callWithString("terminal", "");
  }
}

export default async function wasmImportBrowserWorker(
  wasmUrl: string,
  options: Options = {}
): Promise<WasmInstance> {
  return new WasmInstance(wasmUrl, options);
}
