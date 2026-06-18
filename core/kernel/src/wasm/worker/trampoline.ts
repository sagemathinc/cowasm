/* Python Trampoline Calls */
import debug from "debug";
const log = debug("python-wasm-trampoline");

export default function initPythonTrampolineCalls(
  table: WebAssembly.Table,
  env: object
): void {
  env["_PyImport_InitFunc_TrampolineCall"] = (ptr: number): number => {
    try {
      const r = table.get(ptr)();
      log("_PyImport_InitFunc_TrampolineCall - ptr=", ptr, " r=", r);
      return r;
    } catch (err) {
      log("_PyImport_InitFunc_TrampolineCall failed - ptr=", ptr, err);
      throw err;
    }
  };

  env["_PyCFunctionWithKeywords_TrampolineCall"] = (
    ptr: number,
    self: number,
    args: number,
    kwds: number
  ) => {
    // log("_PyCFunctionWithKeywords_TrampolineCall - ptr=", ptr);
    return table.get(ptr)(self, args, kwds);
  };

  env["_PyEM_TrampolineCall"] = (
    ptr: number,
    arg1: number,
    arg2: number,
    arg3: number
  ) => {
    // Python 3.14 routes the older CPython trampoline macros through this
    // generic Emscripten entry point.
    try {
      return table.get(ptr)(arg1, arg2, arg3);
    } catch (err) {
      log(
        "_PyEM_TrampolineCall failed - ptr=",
        ptr,
        " args=",
        [arg1, arg2, arg3],
        err
      );
      throw err;
    }
  };

  env["descr_set_trampoline_call"] = (
    set: number,
    obj: number,
    value: number,
    closure: number
  ) => {
    // log("descr_set_trampoline_call");
    return table.get(set)(obj, value, closure);
  };

  env["descr_get_trampoline_call"] = (
    get: number,
    obj: number,
    closure: number
  ) => {
    // log("descr_get_trampoline_call");
    return table.get(get)(obj, closure);
  };
}
