import { Options, WasmInstanceAbstractBaseClass, WorkerThread } from "./import";
import { callback } from "awaiting";
import { Worker } from "worker_threads";
import { dirname, join } from "path";
import callsite from "callsite";
import process from "node:process";
import debug from "../debug";

export class WasmInstance extends WasmInstanceAbstractBaseClass {
  protected initWorker(): WorkerThread {
    const path = join(
      dirname(callsite()[0]?.getFileName() ?? "."),
      "worker/node.js"
    );
    return new Worker(path);
  }

  protected async getStdin() {
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
      this.log?.("stdin", data.toString());
      if (data.includes("\u0003")) {
        this.sigint();
      }
    });
  }
}

export default async function wasmImportNodeWorker(
  wasmSource: string, // name of the wasm file
  options: Options
): Promise<WasmInstance> {
  const log = debug("import-node");
  return new WasmInstance(wasmSource, options, log);
}
