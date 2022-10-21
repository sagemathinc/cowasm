import type { WasmInstance } from "../wasm/types";
import wasmImportWorker from "../wasm/import-browser";
import wasmImportNoWorker from "../wasm/worker/browser";
import createKernel from "./kernel";
import type { FileSystemSpec } from "wasi-js";

import wasmUrl from "./cowasm.wasm";

export default async function kernel({ worker }: { worker?: boolean } = {}): Promise<WasmInstance> {
  const fs: FileSystemSpec[] = [{ type: "dev" }];
  const env = {
    TERMCAP: "/termcap",
    TERM: "xterm-256color",
    PS1: "sh$ ",
  };

  return await createKernel({
    programName: "/bin/cowasm", // made up name is better than blank (?)
    wasmSource: wasmUrl,
    wasmImport: worker ? wasmImportWorker : wasmImportNoWorker,
    fs,
    env,
  });
}
