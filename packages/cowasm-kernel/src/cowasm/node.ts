import type { WasmInstance } from "../wasm/types";
import wasmImportWorker from "../wasm/import-node";
import wasmImportNoWorker from "../wasm/worker/node";
import createKernel from "./kernel";
import { join } from "path";
import { existsSync } from "fs";

const COWASM_WASM = "cowasm.wasm";

// Our tiny termcap file only has one entry, which is for xterm
// so that's all we give you, even if you have a different terminal.
const TERM = "xterm-256color";

export default async function kernel({
  worker,
}: {
  worker?: boolean;
} = {}) : Promise<WasmInstance> {
  const path = __dirname;

  const env = {
    ...process.env,
    TERM,
    TERMCAP: join(path, "..", "termcap"),
    PS1: "(CoWasm) sh$ ",
  };
  //PS1: '(CoWasm) sh: (pwd | sed "s|^$HOME|~|")$ '
  if (!existsSync(env.TERMCAP)) {
    console.warn(`TERMCAP=${env.TERMCAP} is missing`);
  }

  return await createKernel({
    programName: process.env.PROGRAM_NAME, // real name or made up name
    wasmSource: join(path, COWASM_WASM),
    wasmImport: worker ? wasmImportWorker : wasmImportNoWorker,
    fs: [{ type: "native" }],
    env,
  });
}
