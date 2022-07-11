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
