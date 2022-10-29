import { syncKernel, asyncKernel, FileSystemSpec } from "@cowasm/kernel";
import { join } from "path";
import debug from "debug";
import { bind_methods } from "./util";

const log = debug("dash-wasm");

import { Options } from "./common";

const dash_wasm = join(__dirname, "dash.wasm");
const bin_zip = join(__dirname, "bin.zip");

const BIN = "/cowasm/bin";

class DashWasmSync {
  public kernel;
  constructor(kernel) {
    this.kernel = kernel;
    bind_methods(this);
  }
  terminal(argv = [dash_wasm]) {
    try {
      return this.kernel.exec([dash_wasm].concat(argv.slice(1)));
    } finally {
      this.kernel.terminate();
    }
  }
}

class DashWasmAsync {
  public kernel;
  constructor(kernel) {
    this.kernel = kernel;
    bind_methods(this);
  }
  async terminal(argv = [dash_wasm]) {
    try {
      return await this.kernel.exec([dash_wasm].concat(argv.slice(1)));
    } finally {
      this.kernel.terminate();
    }
  }
}

export async function syncDash(opts?: Options): Promise<DashWasmSync> {
  log("creating sync CoWasm kernel...");
  const fs = getFilesystem(opts);
  const kernel = await syncKernel({ env: { PATH: BIN }, fs });
  log("done");
  return new DashWasmSync(kernel);
}

export async function asyncDash(opts?: Options): Promise<DashWasmAsync> {
  log("creating async CoWasm kernel...");
  const fs = getFilesystem(opts);
  const kernel = await asyncKernel({ env: { PATH: BIN }, fs });
  log("done");
  return new DashWasmAsync(kernel);
}

function getFilesystem(_opts?: Options): FileSystemSpec[] {
  return [
    // This will result in synchronously loading a tiny filesystem needed for starting python interpreter.
    {
      type: "zipfile",
      zipfile: bin_zip,
      mountpoint: BIN,
    },
    // And the rest of the native filesystem.
    { type: "native" },
  ];
}
