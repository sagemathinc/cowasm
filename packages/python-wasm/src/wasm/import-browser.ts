import { Options, WasmInstanceAbstractBaseClass } from "./import";
import { EventEmitter } from "events";
import IOProviderUsingAtomics from "./io-using-atomics";
import /* IOProviderUsingServiceWorker, */ {
  fixServiceWorker,
} from "./io-using-service-worker";
import IOProviderUsingSleep from "./io-using-sleep";

class WorkerThread extends EventEmitter {
  public postMessage: (message) => void;
  public terminate: () => void;

  constructor(worker: Worker) {
    super();
    this.setMaxListeners(100);
    this.postMessage = worker.postMessage.bind(worker);
    this.terminate = worker.terminate.bind(worker);
    worker.onmessage = ({ data: message }) => {
      if (message.event == "service-worker-broken") {
        fixServiceWorker();
        return;
      }
      this.emit("message", message);
    };
  }
}

export class WasmInstance extends WasmInstanceAbstractBaseClass {
  protected initWorker(): WorkerThread {
    // @ts-ignore this import.meta.url issue -- actually only consumed by webpack in calling code...
    const worker = new Worker(new URL("./worker/browser.js", import.meta.url));
    this.ioProvider.worker = worker;
    return new WorkerThread(worker);
  }
}

export default async function wasmImportBrowserWorker(
  wasmSource: string,
  options: Options = {}
): Promise<WasmInstance> {
  const IOProvider = crossOriginIsolated
    ? IOProviderUsingAtomics
    : IOProviderUsingSleep;
  return new WasmInstance(wasmSource, options, IOProvider);
}
