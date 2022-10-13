import wasmImport from "../wasm/import-browser";
import wasmImportNoWorker from "../wasm/worker/browser";
import { _init, wasm } from "./index";
export { wasm };
import type { FileSystemSpec } from "wasi-js";

import wasmUrl from "./wacalc.wasm";

export async function init({
  noWorker, // run in the main thread -- useful for debugging, but very bad for production since can block UI
}: { noWorker?: boolean } = {}) {
  const fs: FileSystemSpec[] = [{ type: "dev" }];

  await _init({
    programName: "/bin/zash", // made up name is better than blank (?)
    wasmSource: wasmUrl,
    wasmImport: noWorker ? wasmImportNoWorker : wasmImport,
    fs,
    env: {
      TERMCAP: "/termcap",
      TERM: "xterm-256color",
      PS1: "zash$ ",
    },
  });
}

export async function terminal({
  argv,
}: {
  argv?: string[];
} = {}): Promise<number> {
  await init();
  if (wasm == null) throw Error("bug");
  return await wasm.terminal(argv);
}
