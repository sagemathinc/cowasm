import wasmImport from "../wasm/import-node";
import { _init, repr, exec, wasm, terminal as _terminal } from "./index";
import type { FileSystemSpec } from "@wapython/wasi";
import { dirname, join } from "path";
import { existsSync } from "fs";
import callsite from "callsite";

const DATA = join("python", "python.zip");
const fs: FileSystemSpec[] = [
  {
    type: "zipfile",
    zipfile: DATA,
    mountpoint: "/usr/lib/python3.11",
  },
  { type: "dev" }, // always include this -- it is necessary for python to start when using nodejs windows, but doesn't hurt on linux/macos.
  { type: "native" }, // provides stdout,stderr natively, for now...
];

export async function init() {
  const path = dirname(join(callsite()[1]?.getFileName() ?? "", ".."));
  let env;
  if (existsSync(join(path, DATA))) {
    env = {
      ...process.env,
      ...{
        PYTHONHOME: "/usr",
        TERMCAP: "/usr/lib/python3.11/termcap",
        TERM: "xterm-256color",
      },
    };
  } else {
    env = { ...process.env };
  }
  await _init("python/python.wasm", wasmImport, fs, env);
}

async function terminal(argv = ["python"]) {
  await init();
  await _terminal(argv);
}

export { repr, exec, wasm, terminal };

init();
