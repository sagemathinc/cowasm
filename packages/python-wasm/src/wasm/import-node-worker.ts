/*
This is the webworker script when importing the wasm module in node.js.
*/

import { readFile } from "fs/promises";
import type { FileSystemSpec } from "@wapython/wasi";
import bindings from "@wapython/wasi/dist/bindings/node";
import { dirname, isAbsolute, join } from "path";
import callsite from "callsite";
import wasmImport, { Options } from "./import";
import type WasmInstance from "./instance";
export { WasmInstance };
import { parentPort } from "worker_threads";
import debug from "./debug";

const log = debug("import-node-worker");

export default async function wasmImportNode(
  name: string,
  options: Options = {}
): Promise<WasmInstance> {
  const path = dirname(join(callsite()[1]?.getFileName() ?? "", ".."));
  if (!isAbsolute(name)) {
    // it's critical to make this canonical BEFORE calling the debounced function,
    // or randomly otherwise end up with same module imported twice, which will
    // result in a "hellish nightmare" of subtle bugs.
    name = join(path, name);
  }
  // also fix zip path, if necessary and read in any zip files (so they can be loaded into memfs).
  const fs: FileSystemSpec[] = [];
  for (const X of options.fs ?? []) {
    if (X.type == "zipfile") {
      if (!isAbsolute(X.zipfile)) {
        X.zipfile = join(path, X.zipfile);
      }
      const Y = {
        type: "zip",
        data: await readFile(X.zipfile),
        mountpoint: X.mountpoint,
      } as FileSystemSpec;
      fs.push(Y);
    } else {
      fs.push(X);
    }
  }
  const source = await readFile(name);
  return await wasmImport(name, source, bindings, { ...options, fs });
}

function initWorker() {
  const parent = parentPort;
  if (parent == null) {
    throw Error("bug");
  }
  // Being used as a worker.
  let wasm: undefined | WasmInstance = undefined;
  parent.on("message", async (message) => {
    log("worker got message ", message);
    switch (message.event) {
      case "init":
        try {
          const opts: Options = { ...message.options };
          const { spinLockBuffer, stdinLockBuffer } = message.locks ?? {};
          if (spinLockBuffer == null) {
            throw Error("must define spinLockBuffer");
          }
          if (stdinLockBuffer == null) {
            throw Error("must define stdinLockBuffer");
          }

          if (opts.stdinBuffer == null) {
            throw Error("must define stdinBuffer");
          }

          const spinLock = new Int32Array(spinLockBuffer);
          opts.spinLock = (time: number) => {
            // log(`spinLock: ${time}`);
            // We ask main thread to do the lock:
            parent.postMessage({ event: "sleep", time });
            // We wait a moment for that message to be processed:
            while (spinLock[0] != 1) {
              // wait for it to change from what it is now.
              Atomics.wait(spinLock, 0, spinLock[0], 100);
            }
            // now the lock is set, and we wait for it to get unset:
            Atomics.wait(spinLock, 0, 1, time);
          };

          const stdinBuffer = opts.stdinBuffer;
          const stdinLock = new Int32Array(stdinLockBuffer);
          opts.waitForStdin = () => {
            parent.postMessage({ event: "waitForStdin" });
            while (stdinLock[0] != -1) {
              Atomics.wait(stdinLock, 0, stdinLock[0]);
            }
            // wait to change from -1
            Atomics.wait(stdinLock, 0, -1);
            // how much was read
            const bytes = stdinLock[0];
            const data = Buffer.from(stdinBuffer.slice(0, bytes)); // not a copy
            return data;
          };

          const { signalBuffer } = message.options;
          if (signalBuffer == null) {
            throw Error("must define signalBuffer");
          }
          const signalState = new Int32Array(signalBuffer);
          opts.wasmEnv = {
            wasmGetSignalState: () => {
              log(`signalState = ${signalState[0]}`);
              const signal = Atomics.load(signalState, 0);
              if (signal) {
                Atomics.store(signalState, 0, 0);
                return signal;
              }
              return 0;
            },
          };

          wasm = await wasmImportNode(message.name, opts);
          parent.postMessage({ event: "init", status: "ok" });
        } catch (err) {
          parent.postMessage({
            event: "init",
            status: "error",
            error: err.toString(),
          });
        }
        return;

      case "callWithString":
        if (wasm == null) {
          throw Error("wasm must be initialized");
        }
        parent.postMessage({
          id: message.id,
          result: wasm.callWithString(
            message.name,
            message.str, // this is a string or string[]
            ...message.args
          ),
        });
        return;

      case "call":
        if (wasm == null) {
          throw Error("wasm must be initialized");
        }
        parent.postMessage({
          id: message.id,
          result: wasm.callWithString(message.name, "", []),
        });
        return;
    }
  });
}

if (parentPort != null) {
  initWorker();
}
