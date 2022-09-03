import { randomFillSync } from "crypto";
import fs from "fs";
import { isatty as isTTY } from "tty";
import path from "path";

import { WASIBindings } from "../types";

const bindings: WASIBindings = {
  hrtime: process.hrtime.bigint,
  exit: (code: number) => {
    process.exit(code);
  },
  kill: (signal: string) => {
    process.kill(process.pid, signal);
  },
  randomFillSync,
  isTTY,
  fs,
  path,
};

export default bindings;
