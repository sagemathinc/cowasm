import type WasmInstanceSync from "./instance";
import { Options } from "./import";
import debug from "debug";

const log = debug("wasm:worker:init");

interface Parent {
  // on events:
  //   'message', (message) => ...
  //   'exit'
  on: Function;
  postMessage: Function;
}

export default function initWorker({
  wasmImport,
  parent,
  captureOutput,
  IOHandler,
}: {
  wasmImport: Function;
  parent: Parent;
  // if captureOutput is true, we will send stdout and stderr events when such output is
  // written, instead of writing to /dev/stdout and /dev/stderr.  This saves trouble having
  // to watch and read from those filesystems.  For browser xterm.js integration, we use
  // this, but for a nodejs terminal, we don't.
  captureOutput?: boolean;
  IOHandler;
}) {
  let wasm: undefined | WasmInstanceSync = undefined;
  parent.on("message", async (message) => {
    log("worker got message ", message);
    switch (message.event) {
      case "init":
        try {
          const ioHandler = new IOHandler(message.options, () => {
            parent.postMessage({ event: "service-worker-broken" });
          });

          const opts: Options = {
            ...message.options,
            sleep: ioHandler.sleep.bind(ioHandler),
            getStdin: ioHandler.getStdin.bind(ioHandler),
            wasmEnv: {
              wasmGetSignalState: ioHandler.getSignalState.bind(ioHandler),
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
          // it might not be defined, e.g., if not using unionfs at all
          await wasm.fs.waitUntilLoaded?.();
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
