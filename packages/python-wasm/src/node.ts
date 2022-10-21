import debug from "debug";
import {
  syncKernel,
  asyncKernel,
  WasmInstanceAsync,
  WasmInstanceSync,
} from "cowasm-kernel";
import { join } from "path";

const log = debug("python-wasm");

const PYTHON_WASM = join(__dirname, "python.wasm");

// Running in main thread
class PythonWasmSync {
  kernel: WasmInstanceSync;

  constructor(kernel) {
    this.kernel = kernel;
  }

  init(): void {
    log("loading python.wasm...");
    this.callWithString("cowasm_python_init");
    log("done");
  }

  callWithString(name: string, str?: string | string[], ...args): any {
    return this.kernel.callWithString({ name, dll: PYTHON_WASM }, str, ...args);
  }

  repr(code: string): string {
    log("repr", code);
    const s = this.callWithString("cowasm_python_repr", code);
    log("result =", s);
    return s;
  }

  exec(code: string): void {
    log("exec", code);
    const ret = this.callWithString("cowasm_python_exec", code);
    log("ret", ret);
    if (ret) {
      throw Error("exec failed");
    }
  }

  // starts the python REPL
  terminal(argv): number {
    console.log("STUB: terminal", argv);
    return 1;
  }
}

export async function syncPython() {
  log("creating sync CoWasm kernel...");
  const kernel = await syncKernel();
  log("done");
  log("initializing python");
  const python = new PythonWasmSync(kernel);
  python.init();
  log("done");
  return python;
}

// Run in a worker
class PythonWasmAsync {
  kernel: WasmInstanceAsync;

  constructor(kernel) {
    this.kernel = kernel;
  }

  async init(): Promise<void> {
    log("loading and calling cowasm_python_init");
    await this.callWithString("cowasm_python_init");
    log("done");
  }

  async callWithString(
    name: string,
    str?: string | string[],
    ...args
  ): Promise<any> {
    return await this.kernel.callWithString(
      { name, dll: PYTHON_WASM },
      str,
      ...args
    );
  }

  async repr(code: string): Promise<string> {
    log("repr", code);
    const ret = await this.callWithString("cowasm_python_repr", code);
    log("done", "ret =", ret);
    return ret;
  }

  async exec(code: string): Promise<void> {
    log("exec", code);
    const ret = await this.callWithString("cowasm_python_exec", code);
    if (ret) {
      throw Error("exec failed");
    }
  }

  async terminal(argv): Promise<number> {
    console.log("STUB: terminal", argv);
    return 1;
  }
}

export async function asyncPython() {
  log("creating async CoWasm kernel...");
  const kernel = await asyncKernel();
  log("done");
  log("initializing python");
  const python = new PythonWasmAsync(kernel);
  await python.init();
  log("done");
  return python;
}
