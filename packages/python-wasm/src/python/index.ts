import type { WasmInstance } from "../wasm/types";
import { Options } from "../wasm/import";
import type { FileSystemSpec } from "wasi-js";
import initZythonImporter from "./zython-importer";

export let wasm: WasmInstance | undefined = undefined;

export async function exec(str: string): Promise<void> {
  if (wasm == null) throw Error("call init");
  await wasm.callWithString("exec", str);
}

export async function repr(str: string): Promise<string> {
  if (wasm == null) throw Error("call init");
  return (await wasm.callWithString("eval", str)) as string;
}

export async function terminal(argv: string[] = ["python"]): Promise<number> {
  if (wasm == null) throw Error("call init");
  return await wasm.terminal(argv);
}

type WASMImportFunction = (
  python_wasm: string,
  options: Options,
  log?: (...args) => void
) => Promise<WasmInstance>;

interface InitOpts {
  python_wasm: string; // file path in node.js; a URL in browser.
  programName?: string; // file path to executable script, e.g., /.../python-wasm[-debug] in nodejs; fine to leave blank in browser (?).
  wasmImport: WASMImportFunction;
  fs: FileSystemSpec[];
  env: { [name: string]: string };
}

export async function _init({
  python_wasm,
  programName,
  wasmImport,
  fs,
  env,
}: InitOpts): Promise<void> {
  if (wasm != null) {
    // already initialized
    return;
  }
  wasm = await wasmImport(python_wasm, {
    env,
    fs,
  });
  // critical to do this first, because otherwise process.cwd() gets
  // set to '/' (the default in WASM) when any posix call happens.
  await wasm.callWithString("chdir", process.cwd());

  if (programName) {
    await wasm.callWithString("initProgramName", programName);
  }

  // This calls Py_Initialize and gets the Python interpreter initialized.
  await wasm.callWithString("python_init", "");

  const s = await initZythonImporter();
  if (s) {
    await wasm.callWithString("exec", s);
  }

  // Wait until the standard libary zip filesystem is loaded, if necessary,
  // since user may want to immediately run arbitrary code right when
  // this function returns.
  await wasm.waitUntilFsLoaded();
}
