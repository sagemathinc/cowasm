import { asyncKernel, FileSystemSpec } from "@cowasm/kernel";
import { join } from "path";
import debug from "debug";
import { Options, DashWasmAsync, ENV, USR } from "./common";

const log = debug("dash-wasm:browser");

import dash_wasm from "./dash.wasm";
import fs_zip from "./fs.zip";

const DASH = join(USR, "bin", "sh");

export default async function asyncDash(
  opts?: Options
): Promise<DashWasmAsync> {
  log("creating async CoWasm kernel...");
  const fs = getFilesystem(opts);
  const kernel = await asyncKernel({
    env: ENV,
    fs,
  });
  await kernel.fetch(dash_wasm, DASH, 0o777);
  return new DashWasmAsync(kernel, DASH);
}

function getFilesystem(_opts?: Options): FileSystemSpec[] {
  return [
    {
      type: "zipurl",
      zipurl: fs_zip,
      mountpoint: USR,
    },
    // And the rest of the native filesystem.
    { type: "dev" },
  ];
}
