import WASI from "../../../wasi-js/dist/index.js";
import bindings from "../../../wasi-js/dist/bindings/server.js";
import importWebAssemblyDlopen from "../../dist/index.js";
import { nonzeroPositions } from "../../dist/util.js";
import { readFileSync } from "fs";
import assert from "assert";
import debug from "debug";

function importWebAssemblySync(path, importObject) {
  const binary = new Uint8Array(readFileSync(path));
  const mod = new WebAssembly.Module(binary);
  return new WebAssembly.Instance(mod, importObject);
}

const table = new WebAssembly.Table({ initial: 10000, element: "anyfunc" });

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
        bindings.randomFillSync(
          // @ts-ignore
          new Uint8Array(memory.buffer),
          bufPtr,
          bufLen
        );
        return 0;
      },
    },
  };
  initPythonTrampolineCalls(table, importObject.env);
  const instance = await importWebAssemblyDlopen({
    path: "app.wasm",
    importWebAssemblySync,
    importObject,
    stub: "silent",
    readFileSync,
  });
  wasi.start(instance, memory);
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
