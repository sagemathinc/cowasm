// Load a CoWasm kernel in the browser

import { asyncKernel } from "@cowasm/kernel";
import * as debug from "debug";
const log = debug("browser:kernel");

export default async function main() {
  log("initializing kernel...");
  const kernel = await asyncKernel();
  log("initialized kernel");
  (window as any).kernel = kernel;
  log("set window.kernel");
  return kernel;
}
