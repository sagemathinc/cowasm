import { WASI } from "@wasmer/wasi";
import { readFile as readFile0 } from "fs";
import { promisify } from "util";
import { dirname, join } from "path";
import callsite from "callsite";

const readFile = promisify(readFile0);

const STUBS = "main raise";
function stub(name: string) {
  return function () {
    return console.log(`stub.${name}`, arguments);
  };
}
const wasmEnv: { [name: string]: Function } = {};
for (const name of STUBS.split(" ")) {
  wasmEnv[name] = stub(name);
}
wasmEnv.reportError = () => {
  throw Error();
};

const encoder = new TextEncoder();
export function stringToU8(s, buffer) {
  const array = new Int8Array(buffer, 0, s.length + 1);
  array.set(encoder.encode(s));
  array[s.length] = 0;
  return array;
}

interface Options {
  noWasi?: boolean; // if true, include wasi
  noCache?: boolean;
  env?: object; // functions to include in the environment
}

// TODO: make this a weakref cache
// TODO: need to reuseInFlight importWasm
const cache: { [name: string]: any } = {};

export async function importWasm(name: string, options: Options = {}) {
  if (!options.noCache) {
    if (cache[name] != null) {
      return cache[name];
    }
  }
  const pathToWasm = join(
    dirname(callsite()[1]?.getFileName() ?? ""),
    `${name}.wasm`
  );

  const wasmOpts: any = { env: { ...wasmEnv, ...options.env } };
  let wasi: any = undefined;
  if (!options?.noWasi) {
    wasi = new WASI({
      args: process.argv,
      env: process.env,
    });
    wasmOpts.wasi_snapshot_preview1 = wasi.wasiImport;
  }

  const source = await readFile(pathToWasm);
  const typedArray = new Uint8Array(source);
  console.log(wasmOpts.env);
  const result = await WebAssembly.instantiate(typedArray, wasmOpts);
  if (wasi != null) {
    wasi.start(result.instance);
  }

  if (!options.noCache) {
    cache[name] = result.instance.exports;
  }

  return result.instance.exports;
}
