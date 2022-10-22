// Load Python kernel in the browser

import { asyncPython } from "python-wasm";
import * as debug from "debug";
const log = debug("browser:python");

export default async function main() {
  log("call python init");
  // noReadline saves a tiny amount of space; no terminal here so no need for readline
  const python = await asyncPython({ noReadline: true });
  log("loaded python");
  (window as any).python = python;
  console.log("set window.python");
  return python;
}
