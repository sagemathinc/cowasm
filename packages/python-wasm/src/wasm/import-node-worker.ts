import { readFile } from "fs/promises";
import type { FileSystemSpec } from "@wapython/wasi";
import bindings from "@wapython/wasi/dist/bindings/node";
import { dirname, isAbsolute, join } from "path";
import callsite from "callsite";
import wasmImport, { Options } from "./import";
import type WasmInstance from "./instance";
export { WasmInstance };
import { parentPort } from "worker_threads";

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

if (parentPort != null) {
  const parent = parentPort;
  // Being used as a worker.
  let wasm: undefined | WasmInstance = undefined;
  parent.on("message", async (message) => {
    console.log("worker got message ", message);
    switch (message.event) {
      case "init":
        try {
          wasm = await wasmImportNode(message.name, message.options);
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
        const output = wasm.callWithString(
          message.name,
          message.str,
          ...message.args
        );
        parent.postMessage({ id: message.id, output });
        return;
    }
  });
}
