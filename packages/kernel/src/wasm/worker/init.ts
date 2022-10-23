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

  async function handleMessage(message) {
    log("worker got message ", message);
    switch (message.event) {
      case "init":
        const ioHandler = new IOHandler(message.options, () => {
          parent.postMessage({ event: "service-worker-broken" });
        });
        if (message.debug) {
          // Enable debug logging to match main thread.  Otherwise, there is no possible
          // way to have any logging inside the WebWorker.
          debug.enable(message.debug);
        }
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
        return { event: "init", status: "ok" };

      case "callWithString":
        if (wasm == null) {
          throw Error("wasm must be initialized");
        }
        return {
          result: wasm.callWithString(
            message.name,
            message.str, // this is a string or string[]
            ...message.args
          ),
        };

      case "call":
        if (wasm == null) {
          throw Error("wasm must be initialized");
        }
        return {
          result: wasm.callWithString(message.name, "", []),
        };

      case "waitUntilFsLoaded":
        if (wasm?.fs == null) {
          throw Error("wasm.fs must be initialized");
        }
        // it might not be defined, e.g., if not using unionfs at all
        const { waitUntilLoaded } = wasm.fs;
        if (waitUntilLoaded == null) {
          log("waitUntilLoaded - no wait function defined");
        } else {
          await waitUntilLoaded();
          log("waited and now file system");
        }
        if (log.enabled) {
          // takes effort
          log("ls / = ", wasm.fs.readdirSync("/"));
        }
        return;

      case "fetch":
        if (wasm?.fs == null) {
          throw Error("wasm.fs must be initialized");
        }
        await wasm.fetch(message.url, message.path);
        return;
    }
  }

  parent.on("message", async (message) => {
    try {
      const resp = {
        id: message.id,
        ...(await handleMessage(message)),
      };
      parent.postMessage(resp);
    } catch (error) {
      parent.postMessage({
        id: message.id,
        error,
      });
    }
  });
}
