import { WASI } from "@wasmer/wasi";
import { readFile as readFile0 } from "fs";
import { promisify } from "util";
import { dirname, join } from "path";
import callsite from "callsite";

const readFile = promisify(readFile0);

const STUBS =
  "main raise setjmp longjmp pclose popen getuid getpid getpwuid getpwnam geteuid system dlerror dlsym dlopen signal clock";
function stub(name: string) {
  return function () {
    console.log(`stub.${name}`, arguments);
    return "0";
  };
}
const wasmEnv: { [name: string]: Function } = {};
for (const name of STUBS.split(" ")) {
  wasmEnv[name] = stub(name);
}

const encoder = new TextEncoder();
export function stringToU8(s, buffer) {
  const array = new Int8Array(buffer, 0, s.length + 1);
  array.set(encoder.encode(s));
  array[s.length] = 0;
  return array;
}

export function string_cb(wasm, ptr, len) {
  const slice = wasm.memory.buffer.slice(ptr, ptr + len);
  const textDecoder = new TextDecoder();
  return textDecoder.decode(slice);
}

interface Options {
  noWasi?: boolean; // if true, include wasi
  noCache?: boolean;
  env?: object; // functions to include in the environment
}

// TODO: make this a weakref cache
// TODO: need to reuseInFlight importWasm
const cache: { [name: string]: any } = {};

export default async function wasmImport(name: string, options: Options = {}) {
  if (!options.noCache) {
    if (cache[name] != null) {
      return cache[name];
    }
  }
  const t = new Date().valueOf();
  const pathToWasm = join(
    dirname(callsite()[1]?.getFileName() ?? ""),
    `${name}.wasm`
  );

  wasmEnv.reportError = (ptr, len: number) => {
    // @ts-ignore
    const slice = result.instance.exports.memory.buffer.slice(ptr, ptr + len);
    const textDecoder = new TextDecoder();
    throw Error(textDecoder.decode(slice));
  };

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
  const result = await WebAssembly.instantiate(typedArray, wasmOpts);
  if (wasi != null) {
    wasi.start(result.instance);
  }

  if (!options.noCache) {
    cache[name] = result.instance.exports;
  }

  console.log(`imported ${name} in ${new Date().valueOf() - t}ms`);
  return result.instance.exports;
}
