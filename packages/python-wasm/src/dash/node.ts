import wasmImport from "../wasm/import-node";
import wasmImportNoWorker from "../wasm/worker/node";
import { _init, repr, exec, wasm, terminal as _terminal } from "./index";
import { join } from "path";

const DASH_WASM = "dash.wasm";

// Our tiny termcap file only has one entry, which is for xterm
// so that's all we give you, even if you have a different terminal.
const TERM = "xterm-256color";

export async function init({
  debug,
}: {
  debug?: boolean;
} = {}) {
  const path = __dirname;

  const env = {
    ...process.env,
    TERM,
    TERMCAP: join(path, "termcap"),
  };

  await _init({
    programName: process.env.PROGRAM_NAME ?? "/usr/bin/dash-wasm", // real name or made up name
    wasmSource: join(path, DASH_WASM),
    wasmImport: debug ? wasmImportNoWorker : wasmImport,
    fs: [{ type: "native" }],
    env,
  });
}

async function terminal(
  argv = [process.env.PROGRAM_NAME ?? "/usr/bin/zython"]
): Promise<number> {
  await init();
  return await _terminal(argv);
}

export { repr, exec, wasm, terminal };
