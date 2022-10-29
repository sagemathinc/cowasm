import { syncKernel, asyncKernel, FileSystemSpec } from "@cowasm/kernel";
import { join } from "path";
import debug from "debug";

const log = debug("dash-wasm");

import { Options } from "./common";

const dash_wasm = join(__dirname, "dash-wasm.wasm");
const bin_zip = join(__dirname, "bin.zip");

const BIN = "/bin.wasm";

class DashWasmSync {
  public kernel;
  constructor(kernel) {
    this.kernel = kernel;
  }
  terminal() {
    return this.kernel.exec([dash_wasm]);
  }
}

class DashWasmAsync {
  public kernel;
  constructor(kernel) {
    this.kernel = kernel;
  }
  async terminal() {
    return await this.kernel.exec([dash_wasm]);
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
