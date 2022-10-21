import debug from "debug";
import * as cowasm from "cowasm-kernel";
import { join } from "path";

const log = debug("python-wasm");

const PYTHON_WASM = join(__dirname, "python.wasm");

async function getFunction(name: string): Promise<Function> {
  if (wasm == null) {
    await init();
    if (wasm == null) {
      throw Error("bug");
    }
  }
  return wasm.getFunction(name, PYTHON_WASM);
}

let wasm: any = undefined;
export { wasm };

export async function repr(code: string): Promise<string> {
  log("repr", code);
  const python_repr = await getFunction("cowasm_python_repr");
  const ret = wasm.callWithString(python_repr, code);
  log("ret", ret);
  return ret;
}

export async function exec(code: string): Promise<void> {
  log("exec", code);
  const python_exec = await getFunction("cowasm_python_exec");
  const ret = wasm.callWithString(python_exec, code);
  if (ret) {
    throw Error("exec failed");
  }
}

export async function terminal(
  argv = [process.env.PROGRAM_NAME ?? "/usr/bin/python"]
): Promise<number> {
  console.log("STUB: terminal", argv);
  return 1;
}

export async function init(config = { debug: true }) {
  log("initializing CoWasm kernel...");
  await cowasm.init(config);
  log("done");
  wasm = cowasm.wasm;
  if (wasm == null) {
    throw Error("bug");
  }
  log("loading python.wasm...");
  const python_init = wasm.getFunction("cowasm_python_init", PYTHON_WASM);
  log("done");
  log("initializing python...");
  const ret = python_init();
  if (ret) {
    throw Error("failed to initialize Python");
  }
  log("done");
}
