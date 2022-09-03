import { Options, WasmInstanceAbstractBaseClass } from "./import";
import { callback } from "awaiting";
import { EventEmitter } from "events";
import { SIGINT } from "./constants";
import IOProviderUsingAtomics from "./io-using-atomics";
import IOProviderUsingServiceWorker from "./io-using-service-worker";

class WorkerThread extends EventEmitter {
  public postMessage: (message) => void;
  public terminate: () => void;

  constructor(worker: Worker) {
    super();
    this.setMaxListeners(100);
    this.postMessage = worker.postMessage.bind(worker);
    this.terminate = worker.terminate.bind(worker);
    worker.onmessage = ({ data: message }) => {
      this.emit("message", message);
    };
  }
}

export class WasmInstance extends WasmInstanceAbstractBaseClass {
  private stdinBuffer: Buffer = Buffer.from("");

  protected initWorker(): WorkerThread {
    // @ts-ignore this import.meta.url issue -- actually only consumed by webpack in calling code...
    const worker = new Worker(new URL("./worker/browser.js", import.meta.url));
    return new WorkerThread(worker);
  }

  write(data: string | Uint8Array): void {
    if (data) {
      if (this.stdinBuffer.length > 0) {
        this.stdinBuffer = Buffer.concat([this.stdinBuffer, Buffer.from(data)]);
      } else {
        this.stdinBuffer = Buffer.from(data);
      }
      this.emit("stdin");
      if (typeof data == "string" && data.includes("\u0003")) {
        this.signal(SIGINT);
      }
    }
  }

  protected async getStdinAsync() {
    if (this.stdinBuffer.length > 0) {
      const data = this.stdinBuffer;
      this.stdinBuffer = Buffer.from("");
      return data;
    }
    return await callback((cb) => {
      this.once("stdin", () => {
        const data = this.stdinBuffer;
        this.stdinBuffer = Buffer.from("");
        cb(undefined, data);
      });
    });
  }
}

export default async function wasmImportBrowserWorker(
  wasmSource: string,
  options: Options = {}
): Promise<WasmInstance> {
  const IOProvider = crossOriginIsolated
    ? IOProviderUsingAtomics
    : IOProviderUsingServiceWorker;
  return new WasmInstance(wasmSource, options, IOProvider);
}
