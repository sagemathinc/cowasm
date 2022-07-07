import { WASI } from "./index";
import nodeBindings from "./bindings/node";

import { readFile as readFile0 } from "fs";
import { promisify } from "util";
import fs from "fs";

const readFile = promisify(readFile0);

interface Options {
  noWasi?: boolean; // if true, include wasi
  env?: object; // functions to include in the environment
  dir?: string | null; // WASI pre-opened directory; default is to preopen /, i.e., full filesystem; explicitly set as null to sandbox.
  traceSyscalls?: boolean;
  time?: boolean;
}

async function wasmImport(name: string, options: Options = {}): Promise<void> {
  const pathToWasm = `${name}${name.endsWith(".wasm") ? "" : ".wasm"}`;

  const wasmOpts: any = { env: { ...options.env } };

  let wasi: any = undefined;
  if (!options?.noWasi) {
    const opts: any = {
      args: process.argv,
      env: process.env,
      traceSyscalls: options.traceSyscalls,
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
      opts.preopenDirectories = { "/": "/" };
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
