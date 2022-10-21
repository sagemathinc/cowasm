import * as cowasm from "cowasm-kernel";
import { join } from "path";

const PYTHON_WASM = join(__dirname, "python.wasm");
console.log(PYTHON_WASM);

let wasm : any = undefined;
export { wasm };

export async function repr(code) {
  console.log("STUB: repr", code);
}

export async function exec(code) {
  console.log("STUB: exec", code);
}

export async function terminal(
  argv = [process.env.PROGRAM_NAME ?? "/usr/bin/python"]
): Promise<number> {
  console.log("STUB: terminal", argv);
  return 1;
}

export async function init(config?: any) {
  console.log("STUB: init", config);
  await cowasm.init({ debug: true });
  wasm = cowasm.wasm;
  if (wasm == null) {
    throw Error("bug");
  }
  const python_init = wasm.getFunction("cowasm_python_init", PYTHON_WASM);
  console.log("python_init = ", python_init);
  python_init();
}
