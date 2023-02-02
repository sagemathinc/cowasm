import debug from "debug";
import { asyncPython } from "python-wasm";

// TODO: will get exported in future version of python-wasm.
type PythonWasmAsync = Awaited<ReturnType<typeof asyncPython>>;

const log = debug("python");

let python: PythonWasmAsync | null = null;

// todo: reuseInFlight...?
export default async function getPython() {
  if (python == null) {
    // Very important to explicitly set the fs, since that's not the default yet.
    python = await asyncPython({ noStdio: true, fs: "everything" });
  }
  return python;
}

export function pythonTerminate() {
  if (python == null) return;
  const kernel = python.kernel;
  python = null;
  kernel.terminate();
}
