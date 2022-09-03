import type WasmInstance from "./instance";
import { Options } from "./import";
import debug from "debug";

const log = debug("wasm:worker:init");

export default function initWorker({
  wasmImport,
  parent,
  captureOutput,
}: {
  wasmImport: Function;
  parent: {
    // on events:
    //   'message', (message) => ...
    //   'exit'
    on: Function;
    postMessage: Function;
  };
  // if captureOutput is true, we will send stdout and stderr events when such output is
  // written, instead of writing to /dev/stdout and /dev/stderr.  This saves trouble having
  // to watch and read from those filesystems.  For browser xterm.js integration, we use
  // this, but for a nodejs terminal, we don't.
  captureOutput?: boolean;
}) {
  let wasm: undefined | WasmInstance = undefined;
  parent.on("message", async (message) => {
    log("worker got message ", message);
    switch (message.event) {
      case "init":
        try {
          const opts: Options = { ...message.options };
          const { spinLockBuffer, stdinLockBuffer } = opts.locks ?? {};
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
          opts.sleep = (milliseconds: number) => {
            log("sleep starting, milliseconds=", milliseconds);
            // We ask main thread to do the lock:
            parent.postMessage({ event: "sleep", milliseconds });
            // We wait a moment for that message to be processed:
            while (spinLock[0] != 1) {
              // wait for it to change from what it is now.
              Atomics.wait(spinLock, 0, spinLock[0], 100);
            }
            // now the lock is set, and we wait for it to get unset:
            Atomics.wait(spinLock, 0, 1, milliseconds);
            log("sleep done, milliseconds=", milliseconds);
          };

          const stdinBuffer = opts.stdinBuffer;
          const stdinLock = new Int32Array(stdinLockBuffer);

          opts.getStdin = () => {
            parent.postMessage({ event: "getStdin" });
            // wait to change to -1
            while (stdinLock[0] != -1) {
              // wait with a timeout of 1s
              Atomics.wait(stdinLock, 0, stdinLock[0], 1000);
              if (stdinLock[0] != -1) {
                // if it didn't change to -1, maybe the message was
                // somehow missed or discarded due to already waiting
                // or something else.  Shouldn't happen, but I've observed
                // deadlock here before in a browser.  So we send message
                // again to frontend asking it to make the change.
                parent.postMessage({ event: "getStdin" });
              }
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
              const signal = Atomics.load(signalState, 0);
              if (signal) {
                log("signalState", signalState[0]);
                Atomics.store(signalState, 0, 0);
                return signal;
              }
              return 0;
            },
          };

          if (captureOutput) {
            opts.sendStdout = (data) => {
              log("sendStdout", data);
              parent.postMessage({ event: "stdout", data });
            };

            opts.sendStderr = (data) => {
              log("sendStderr", data);
              parent.postMessage({ event: "stderr", data });
            };
          }

          wasm = await wasmImport(message.name, opts);
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
        try {
          parent.postMessage({
            id: message.id,
            result: wasm.callWithString(
              message.name,
              message.str, // this is a string or string[]
              ...message.args
            ),
          });
        } catch (error) {
          parent.postMessage({
            id: message.id,
            error,
          });
        }
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

      case "waitUntilFsLoaded":
        if (wasm?.fs == null) {
          throw Error("wasm.fs must be initialized");
        }
        try {
          await wasm.fs.waitUntilLoaded();
          parent.postMessage({
            id: message.id,
            result: {},
          });
        } catch (error) {
          parent.postMessage({
            id: message.id,
            error,
          });
        }
        return;
    }
  });
}
