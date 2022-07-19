import type WasmInstance from "./instance";
export { WasmInstance };
import wasmImport, { Options } from "./import";
import type { FileSystemSpec } from "@wapython/wasi";
import bindings from "@wapython/wasi/dist/bindings/browser";

export default async function wasmImportBrowser(
  wasmUrl: string,
  options: Options = {}
): Promise<WasmInstance> {
  // also fix zip path, if necessary and read in any zip files (so they can be loaded into memfs).
  const fs: FileSystemSpec[] = [];
  for (const X of options.fs ?? []) {
    if (X.type == "zipurl") {
      const Y = {
        type: "zip",
        data: await (await fetch(X.zipurl)).arrayBuffer(),
        mountpoint: X.mountpoint,
      } as FileSystemSpec;
      fs.push(Y);
    } else {
      fs.push(X);
    }
  }
  return await wasmImport(wasmUrl, fetch(wasmUrl), bindings, {
    ...options,
    fs,
  });
}

// TODO: figure out how to refactor this with import-node-worker.ts.

function initWorker() {
  let wasm: undefined | WasmInstance = undefined;
  self.onmessage = async ({ data: message }) => {
    console.log("worker got message ", message);
    switch (message.event) {
      case "init":
        try {
          const opts: any = { ...message.options };
          if (message.options.spinLockBuffer != null) {
            const lock = new Int32Array(message.options.spinLockBuffer);
            opts.spinLock = (time: number) => {
              // logToFile(`spinLock: ${time}`);
              // We ask parent thread to do the lock:
              self.postMessage({ event: "sleep", time });
              // We wait a moment for that message to be processed:
              while (lock[0] != 0) {}
              // now the lock is set, and we wait for it to get unset:
              Atomics.wait(lock, 0, 0);
            };
            opts.waitForStdin = () => {
              self.postMessage({ event: "waitForStdin" });
              while (lock[0] != 0) {}
              Atomics.wait(lock, 0, 0);
              // how much was read
              const bytes = lock[0];
              // and what was actually read
              const data = Buffer.from(opts.stdinBuffer.slice(0, bytes)); // not a copy
              return data;
            };
          }
          wasm = await wasmImportBrowser(message.wasmUrl, opts);
          (self as any).wasm = wasm;
          self.postMessage({ event: "init", status: "ok" });
        } catch (err) {
          self.postMessage({
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
        self.postMessage({
          id: message.id,
          result: wasm.callWithString(
            message.name,
            message.str,
            ...message.args
          ),
        });
        return;

      case "call":
        if (wasm == null) {
          throw Error("wasm must be initialized");
        }
        self.postMessage({
          id: message.id,
          result: wasm.callWithString(message.name, "", []),
        });
        return;
    }
  };
}

initWorker();
