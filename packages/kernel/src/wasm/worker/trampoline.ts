/* Python Trampoline Calls */
import debug from "debug";
const log = debug("python-wasm-trampoline");

export default function initPythonTrampolineCalls(
  table: WebAssembly.Table,
  env: object
): void {
  env["_PyImport_InitFunc_TrampolineCall"] = (ptr: number): number => {
    const r = table.get(ptr)();
    log("_PyImport_InitFunc_TrampolineCall - ptr=", ptr, " r=", r);
    return r;
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
