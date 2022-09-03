import type { IOHandler } from "./types";
import debug from "debug";
const log = debug("wasm:worker:io-using-atomics");

export default function ioHandler(parent, opts): IOHandler {
  log(parent, opts);

  return {
    sleep: (milliseconds: number): void => {
      log("sleep ", milliseconds, " - TODO");
    },
    getStdin: (): Buffer => {
      log("getStdin - TODO");
      return Buffer.from("");
    },
    getSignalState: (): number => {
      log("getSignalState - TODO");
      return 0;
    },
  };
}
