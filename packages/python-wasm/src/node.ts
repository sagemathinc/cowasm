import debug from "debug";
import {
  syncKernel,
  asyncKernel,
  WasmInstanceAsync,
  WasmInstanceSync,
  FileSystemSpec,
} from "@cowasm/kernel";
import { join } from "path";
import { bind_methods } from "./util";

const log = debug("python-wasm");

type FileSystemOption = "auto" | "bundle";

interface Options {
  fs?: FileSystemOption;
}

const PYTHON_WASM = join(__dirname, "python.wasm");

// For now this is the best we can do.  TODO: cleanest solution in general would be to also include the
// python3.wasm binary (which has main) from the cpython package, to support running python from python.
// The following will only work in the build-from-source dev environment.
const PYTHONEXECUTABLE = join(__dirname, "../../cpython/bin/python-wasm");

// Running in main thread
class PythonWasmSync {
  kernel: WasmInstanceSync;

  constructor(kernel) {
    this.kernel = kernel;
    bind_methods(this);
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

export async function syncPython(opts?: Options) {
  log("creating sync CoWasm kernel...");
  const kernel = await syncKernel({
    env: { PYTHONEXECUTABLE },
    fs: getFilesystem(opts?.fs),
  });
  log("done");
  log("initializing python");
  const python = new PythonWasmSync(kernel);
  python.init();
  log("done");
  return python;
}

// idea for later:
// /*syncKernelSync,*/
//
// export async function syncPythonsync() {
//   log("creating sync CoWasm kernel...");
//   const kernel = syncKernelSync();
//   log("done");
//   log("initializing python");
//   const python = new PythonWasmSync(kernel);
//   python.init();
//   log("done");
//   return python;
// }

// Run in a worker
class PythonWasmAsync {
  kernel: WasmInstanceAsync;

  constructor(kernel) {
    this.kernel = kernel;
    bind_methods(this);
  }

  async init(): Promise<void> {
    log("loading and calling cowasm_python_init");
    await this.callWithString("cowasm_python_init");
    log("done");
  }

  terminate(): void {
    this.kernel.terminate();
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

export async function asyncPython(opts?: Options) {
  log("creating async CoWasm kernel...");
  const kernel = await asyncKernel({
    env: { PYTHONEXECUTABLE },
    fs: getFilesystem(opts?.fs),
  });
  log("done");
  log("initializing python");
  const python = new PythonWasmAsync(kernel);
  await python.init();
  log("done");
  return python;
}

function getFilesystem(fs?: FileSystemOption): FileSystemSpec[] {
  if (fs == null) {
    return [{ type: "native" }];
  }
  return [{ type: "native" }];
}
