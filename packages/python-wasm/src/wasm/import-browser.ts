import { Options, WasmInstanceAbstractBaseClass } from "./import";
import { EventEmitter } from "events";
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
  protected initWorker(): WorkerThread {
    // @ts-ignore this import.meta.url issue -- actually only consumed by webpack in calling code...
    const worker = new Worker(new URL("./worker/browser.js", import.meta.url));
    return new WorkerThread(worker);
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
