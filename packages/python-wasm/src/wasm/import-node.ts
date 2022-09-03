import { Options, WasmInstanceAbstractBaseClass, WorkerThread } from "./import";
import { callback } from "awaiting";
import { Worker } from "worker_threads";
import { dirname, join } from "path";
import callsite from "callsite";
import process from "node:process";
import { SIGINT } from "./constants";
import debug from "debug";
import IOProviderUsingAtomics from "./io-using-atomics";

const log = debug("wasm:import-node");

export class WasmInstance extends WasmInstanceAbstractBaseClass {
  protected initWorker(): WorkerThread {
    const path = join(
      dirname(callsite()[0]?.getFileName() ?? "."),
      "worker/node.js"
    );
    return new Worker(path, {
      trackUnmanagedFds: false, // this seems incompatible with our use of unionfs/memfs (lots of warnings).
    });
  }

  protected async getStdinAsync() {
    return await callback((cb) => {
      process.stdin.once("data", (data) => {
        cb(undefined, data);
      });
    });
  }

  protected configureTerminal() {
    const stdinListeners: any[] = process.stdin.listeners("data");
    for (const f of stdinListeners) {
      process.stdin.removeListener("data", f);
    }
    if (this.worker == null) throw Error("configureTerminal - bug");
    this.worker.on("exit", () => {
      for (const f of stdinListeners) {
        process.stdin.addListener("data", f);
      }
    });
    process.stdin.on("data", (data) => {
      if (log.enabled) {
        log("stdin", data.toString());
      }
      if (data.includes("\u0003")) {
        this.signal(SIGINT);
      }
    });
  }
}

export default async function wasmImportNodeWorker(
  wasmSource: string, // name of the wasm file
  options: Options
): Promise<WasmInstance> {
  return new WasmInstance(wasmSource, options, IOProviderUsingAtomics);
}
