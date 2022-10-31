import { syncKernel, asyncKernel, FileSystemSpec } from "@cowasm/kernel";
import { join } from "path";
import debug from "debug";

const log = debug("dash-wasm:node");

import { Options, DashWasmAsync, DashWasmSync, ROOT, ENV } from "./common";

const fs_zip = join(__dirname, "fs.zip");
const dash_wasm = join(ROOT, "bin", "sh");

export async function syncDash(opts?: Options): Promise<DashWasmSync> {
  log("creating sync CoWasm kernel...");
  const fs = getFilesystem(opts);
  const kernel = await syncKernel({ env: ENV, fs });
  log("done");
  return new DashWasmSync(kernel, dash_wasm);
}

export async function asyncDash(opts?: Options): Promise<DashWasmAsync> {
  log("creating async CoWasm kernel...");
  const fs = getFilesystem(opts);
  const kernel = await asyncKernel({ env: ENV, fs });
  log("done");
  return new DashWasmAsync(kernel, dash_wasm);
}

export default asyncDash; // consistency with browser

function getFilesystem(_opts?: Options): FileSystemSpec[] {
  return [
    { type: "native" },
    {
      type: "zipfile",
      zipfile: fs_zip,
      mountpoint: ROOT,
    },
  ];
}
