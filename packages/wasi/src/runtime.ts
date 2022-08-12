import WASI from "./wasi";
import type { WASIConfig } from "./types";
import nodeBindings from "./bindings/node";
import fs from "fs";
import { readFile } from "fs/promises";
import debug from "debug";
const log = debug("wasi");

interface Options {
  noWasi?: boolean; // if true, include wasi
  env?: object; // functions to include in the environment
  dir?: string | null; // WASI pre-opened directory; default is to preopen /, i.e., full filesystem; explicitly set as null to sandbox.
  time?: boolean;
}

async function wasmImport(name: string, options: Options = {}): Promise<void> {
  const pathToWasm = `${name}${name.endsWith(".wasm") ? "" : ".wasm"}`;

  function getrandom(bufPtr, bufLen, _flags) {
    // NOTE: returning 0 here (our default stub behavior)
    // would result in Python hanging on startup!  So critical to do this.
    nodeBindings.randomFillSync(
      // @ts-ignore
      new Uint8Array(result.instance.exports.memory.buffer),
      bufPtr,
      bufLen
    );
    return bufLen;
  }

  const wasmOpts: any = {
    env: new Proxy(
      { getrandom, ...options?.env },
      {
        get(target, key) {
          if (key in target) {
            return Reflect.get(target, key);
          }
          log("WARNING: creating stub for", key);
          return (..._args) => {
            return 0;
          };
        },
      }
    ),
  };

  let wasi: any = undefined;
  if (!options?.noWasi) {
    const opts: WASIConfig = {
      args: process.argv,
      bindings: nodeBindings,
      env: process.env,
    };
    if (options.dir === null) {
      // sandbox -- don't give any fs access
    } else {
      opts.bindings = {
        ...nodeBindings,
        fs,
      };
      // just give full access; security of fs access isn't
      // really relevant for us at this point
      if (!options.dir) {
        opts.preopens = { "/": "/" };
      } else {
        opts.preopens = { [options.dir]: options.dir };
      }
    }
    wasi = new WASI(opts);
    wasmOpts.wasi_snapshot_preview1 = wasi.wasiImport;
  }

  //console.log(`reading ${pathToWasm}`);
  const source = await readFile(pathToWasm);
  const typedArray = new Uint8Array(source);
  const result = await WebAssembly.instantiate(typedArray, wasmOpts);
  if (wasi != null) {
    wasi.start(result.instance);
  }
}

export async function run(name: string, options: Options = {}): Promise<void> {
  await wasmImport(name, options);
}
