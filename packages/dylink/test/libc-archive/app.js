const WASI = require("../../../wasi/dist/").default;
const bindings = require("../../../wasi/dist/bindings/node").default;
const importWebAssemblyDlopen = require("../../dist").default;
const { readFileSync } = require("fs");
const debug = require("debug");

function importWebAssemblySync(path, importObject) {
  const binary = new Uint8Array(readFileSync(path));
  const mod = new WebAssembly.Module(binary);
  return new WebAssembly.Instance(mod, importObject);
}

const table = new WebAssembly.Table({ initial: 10000, element: "anyfunc" });
exports.table = table;

async function main() {
  const memory = new WebAssembly.Memory({ initial: 1000 });
  const wasi = new WASI({ bindings, env: process.env, preopens: { "/": "/" } });
  const importObject = {
    wasi_snapshot_preview1: wasi.wasiImport,
    env: {
      memory,
      __indirect_function_table: table,
      _Py_CheckEmscriptenSignals: () => {},
      _Py_CheckEmscriptenSignalsPeriodically: () => {},
      _Py_emscripten_runtime: () => 0,
      getrandom: (bufPtr, bufLen, _flags) => {
        // NOTE: returning 0 here (our default stub behavior)
        // would result in Python hanging on startup!
        bindings.randomFillSync(
          // @ts-ignore
          new Uint8Array(memory.buffer),
          bufPtr,
          bufLen
        );
        return bufLen;
      },
    },
  };
  initPythonTrampolineCalls(table, importObject.env);
  const instance = await importWebAssemblyDlopen({
    path: "app.wasm",
    importWebAssemblySync,
    importObject,
    stub: true,
    traceStub: true,
    readFileSync,
  });
  wasi.start(instance, memory);
  exports.instance = instance;
  exports.wasi = wasi;
}

// copied from packages/python-wasm/src/wasm/worker/trampoline.ts
// without types so we can have a nice self-contained example for dylink.

function initPythonTrampolineCalls(table, env) {
  const log = debug("trampoline");
  env["_PyImport_InitFunc_TrampolineCall"] = (ptr) => {
    const r = table.get(ptr)();
    log("_PyImport_InitFunc_TrampolineCall - ptr=", ptr, " r=", r);
    return r;
  };

  env["_PyCFunctionWithKeywords_TrampolineCall"] = (ptr, self, args, kwds) => {
    // log("_PyCFunctionWithKeywords_TrampolineCall - ptr=", ptr);
    return table.get(ptr)(self, args, kwds);
  };

  env["descr_set_trampoline_call"] = (set, obj, value, closure) => {
    // log("descr_set_trampoline_call");
    return table.get(set)(obj, value, closure);
  };

  env["descr_get_trampoline_call"] = (get, obj, closure) => {
    // log("descr_get_trampoline_call");
    return table.get(get)(obj, closure);
  };
}

main();
