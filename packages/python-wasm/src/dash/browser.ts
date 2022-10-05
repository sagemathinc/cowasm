import wasmImport from "../wasm/import-browser";
import wasmImportNoWorker from "../wasm/worker/browser";
import { _init, wasm } from "./index";
export { wasm };
import type { FileSystemSpec } from "wasi-js";

import wasmUrl from "./dash.wasm";

export async function init({
  noWorker, // run in the main thread -- useful for debugging, but very bad for production since can block UI
}: { noWorker?: boolean } = {}) {
  const fs: FileSystemSpec[] = [{ type: "dev" }];

  await _init({
    programName: "/bin/dash-wasm", // made up name is better than blank (?)
    wasmSource: wasmUrl,
    wasmImport: noWorker ? wasmImportNoWorker : wasmImport,
    fs,
    env: {
      TERMCAP: "/usr/lib/python3.11/termcap",
      TERM: "xterm-256color",
      PS1: "dash$ ",
    },
  });
}
