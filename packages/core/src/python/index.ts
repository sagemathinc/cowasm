import wasmImport, { WasmInstance } from "../wasm";

export let wasm: WasmInstance | undefined = undefined;

export function exec(str: string): void {
  if (wasm == null) throw Error("call init");
  wasm.callWithString("exec", str);
}

export function repr(str: string): string {
  if (wasm == null) throw Error("call init");
  return wasm.callWithString("eval", str) as string;
}

// export function toObject(str: string): object {
//   if (wasm == null) throw Error("call init");
//   //return JSON.parse(wasm.callWithString("toJSON", str));
// }

export async function init() {
  if (wasm != null) {
    // already initialized
    return;
  }
  wasm = await wasmImport("python/python.wasm", {
    init: (wasm) => wasm.exports.init(),
    env: { PYTHONHOME: "/pythonhome" },
    fs: [
      {
        type: "zip",
        zipfile: "python/python311.zip",
        mountpoint: "/pythonhome/lib/python3.11",
      },
      { type: "dev" },
      { type: "native" }, // provides stdout,stderr natively, for now...
    ],
    //traceSyscalls: true,
    //traceStubcalls: 'first',
  });
}

init();
