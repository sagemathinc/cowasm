import wasmImport from "../wasm/import-node";
import wasmImportNoWorker from "../wasm/worker/node";
import { _init, repr, exec, wasm, terminal as _terminal } from "./index";
import type { FileSystemSpec } from "@wapython/wasi";
import { dirname, join } from "path";
import { existsSync } from "fs";
import callsite from "callsite";

const PYTHON_ZIP = "python.zip";
const PYTHON_WASM = "python.wasm";

export async function init({
  noWorker,
  noZip,
  debug,
}: { noWorker?: boolean; noZip?: boolean; debug?: boolean } = {}) {
  if (debug) {
    noWorker = noZip = true;
  }
  const path = dirname(join(callsite()[1]?.getFileName() ?? ""));
  const zipfile = join(path, PYTHON_ZIP);
  const fs: FileSystemSpec[] = [];
  if (existsSync(zipfile)) {
    fs.push({
      type: "zipfile",
      zipfile,
      mountpoint: "/usr/lib/python3.11",
    });
  }
  // always include dev -- it is necessary for python to start when using nodejs windows, but doesn't hurt on linux/macos.
  fs.push({ type: "dev" });
  // native: provides stdout,stderr natively, for now...
  fs.push({ type: "native" });

  let env;
  if (!noZip && existsSync(zipfile)) {
    env = {
      ...process.env,
      ...{
        PYTHONHOME: "/usr",
        TERMCAP: "/usr/lib/python3.11/termcap",
        TERM: "xterm-256color",
      },
    };
  } else {
    env = {
      ...process.env,
      PYTHONHOME: join(path, "../../../cpython/dist/wasm-shared"),
    };
  }
  await _init({
    python_wasm: join(path, PYTHON_WASM),
    wasmImport: noWorker ? wasmImportNoWorker : wasmImport,
    fs,
    env,
  });
}

async function terminal(argv = ["python"]): Promise<number> {
  await init();
  return await _terminal(argv);
}

export { repr, exec, wasm, terminal };
