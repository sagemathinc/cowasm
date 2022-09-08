import wasmImport from "../wasm/import-browser";
import wasmImportNoWorker from "../wasm/worker/browser";
import { _init, repr, exec, wasm } from "./index";
import type { FileSystemSpec } from "wasi-js";

import wasmUrl from "./python.wasm";
import pythonFull from "./python-stdlib.zip";
import pythonMinimal from "./python-minimal.zip";
import pythonReadline from "./python-readline.zip";
import py_mpmath from "./mpmath.zip";
import py_sympy from "./sympy.zip";

export async function init({
  noWorker, // run in the main thread -- useful for debugging, but very bad for production since can block UI
  noReadline, // don't load readline support library for startup; useful if not using Python as a REPL.
}: { noWorker?: boolean; noReadline?: boolean } = {}) {
  const fs: FileSystemSpec[] = [
    {
      type: "zipurl",
      zipurl: noReadline ? pythonMinimal : pythonReadline,
      mountpoint: "/usr/lib/python3.11",
    },
    { type: "dev" },
    {
      type: "zipurl",
      zipurl: pythonFull,
      mountpoint: "/usr/lib/python3.11",
      async: true,
    },
    // TODO: we will make a new file type which is a version of this that doesn't unzip the file into memory.
    {
      type: "zipurl",
      zipurl: py_mpmath,
      mountpoint: "/usr/lib/python3.11",
      async: true,
    },
    {
      type: "zipurl",
      zipurl: py_sympy,
      mountpoint: "/usr/lib/python3.11",
      async: true,
    },
  ];

  await _init({
    python_wasm: wasmUrl,
    wasmImport: noWorker ? wasmImportNoWorker : wasmImport,
    fs,
    env: {
      PYTHONHOME: "/usr",
      TERMCAP: "/usr/lib/python3.11/termcap",
      TERM: "xterm-256color",
    },
  });
  python.wasm = wasm;
}

const python = { repr, exec, wasm, init };
export default python;
