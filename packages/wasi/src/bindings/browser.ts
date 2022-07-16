import { randomFillSync } from "randomfill";
import path from "path-browserify";
import hrtime from "./browser-hrtime";
import { WASIBindings, WASIExitError, WASIKillError } from "../types";

const bindings: WASIBindings = {
  hrtime: hrtime.bigint,
  exit: (code: number | null) => {
    throw new WASIExitError(code);
  },
  kill: (signal: string) => {
    throw new WASIKillError(signal);
  },
  randomFillSync,
  isTTY: () => true,
  path,

  // Let the user attach the fs at runtime
  fs: null,
};

export default bindings;
