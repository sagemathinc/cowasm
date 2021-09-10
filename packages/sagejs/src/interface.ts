import { WASI } from "@wasmer/wasi";
import { readFile as readFile0 } from "fs";
import { promisify } from "util";

const readFile = promisify(readFile0);

const env = {
  raise: () => console.warn("raise"),
  main: console.log,
};

const encoder = new TextEncoder();
export function stringToU8(s, buffer) {
  const array = new Int8Array(buffer, 0, s.length + 1);
  array.set(encoder.encode(s));
  array[s.length] = 0;
  return array;
}

export async function importWasm(name: string) {
  //const __dirname = dirname(new URL(import.meta.url).pathname);

  const wasi = new WASI({
    args: process.argv,
    env: process.env,
  });
  const wasi_snapshot_preview1 = wasi.wasiImport;

  const source = await readFile(`${__dirname}/${name}.wasm`);
  const typedArray = new Uint8Array(source);

  const result = await WebAssembly.instantiate(typedArray, {
    env,
    wasi_snapshot_preview1,
  });
  wasi.start(result.instance);

  return result.instance.exports;
}
