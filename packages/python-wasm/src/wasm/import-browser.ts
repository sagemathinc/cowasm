import { Options, WasmInstanceAbstractBaseClass } from "./import";
import { callback } from "awaiting";
import { EventEmitter } from "events";

import debug from "debug";

class WorkerThread extends EventEmitter {
  public postMessage: (message) => void;
  public terminate: () => void;

  constructor(worker: Worker) {
    super();
    this.postMessage = worker.postMessage.bind(worker);
    this.terminate = worker.terminate.bind(worker);
    worker.onmessage = ({ data: message }) => {
      this.emit("message", message);
    };
  }
}

export class WasmInstance extends WasmInstanceAbstractBaseClass {
  protected initWorker(): WorkerThread {
    // @ts-ignore this import.meta.url issue -- actually only consumed by webpack in calling code...
    const worker = new Worker(new URL("./worker/browser.js", import.meta.url));
    return new WorkerThread(worker);
  }

  write(data: string | Uint8Array): void {
    if (data) {
      this.emit("stdin", Buffer.from(data));
      if (typeof data == "string" && data.includes("\u0003")) {
        this.sigint();
      }
    }
  }

  protected async getStdin() {
    return await callback((cb) => {
      this.once("stdin", (data) => {
        cb(undefined, data);
      });
    });
  }
}

export default async function wasmImportBrowserWorker(
  wasmSource: string,
  options: Options = {}
): Promise<WasmInstance> {
  const log = debug("import-browser");
  return new WasmInstance(wasmSource, options, log);
}
