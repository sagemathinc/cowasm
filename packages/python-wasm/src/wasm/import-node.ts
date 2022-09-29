import { Options, WasmInstanceAbstractBaseClass, WorkerThread } from "./import";
import { Worker } from "worker_threads";
import { join } from "path";
import process from "node:process";
import debug from "debug";
import IOProviderUsingAtomics from "./io-using-atomics";

const log = debug("wasm:import-node");

export class WasmInstance extends WasmInstanceAbstractBaseClass {
  protected initWorker(): WorkerThread {
    const path = join(__dirname, 'worker', 'node.js');
    return new Worker(path, {
      trackUnmanagedFds: false, // this seems incompatible with our use of unionfs/memfs (lots of warnings).
    });
  }

  protected configureTerminal() {
    const stdinListeners: any[] = process.stdin.listeners("data");
    for (const f of stdinListeners) {
      // save listeners on stdin so we can restore them
      // when the terminal finishes
      process.stdin.removeListener("data", f);
    }
    if (this.worker == null) throw Error("configureTerminal - bug");
    this.worker.on("exit", () => {
      // put back the original listeners on stdin
      for (const f of stdinListeners) {
        process.stdin.addListener("data", f);
      }
    });
    process.stdin.on("data", (data) => {
      if (log.enabled) {
        log("stdin", data.toString());
      }
      this.writeToStdin(data);
    });
  }
}

export default async function wasmImportNodeWorker(
  wasmSource: string, // name of the wasm file
  options: Options
): Promise<WasmInstance> {
  return new WasmInstance(wasmSource, options, IOProviderUsingAtomics);
}
