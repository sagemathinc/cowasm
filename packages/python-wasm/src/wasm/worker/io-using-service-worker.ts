import type { IOHandler } from "./types";
import debug from "debug";
const log = debug("wasm:worker:io-using-atomics");

/*
function readFromServiceWorker(id:string, msTimeout:number) : object {

}

function writeToServiceWorker(id:string, message:object) {

}
*/

export default function ioHandler(opts): IOHandler {
  log(opts);

  return {
    sleep: (milliseconds: number): void => {
      log("sleep ", milliseconds, " - TODO");
    },

    getStdin: (): Buffer => {
      log("getStdin - TODO");
      // Ask main thread to get any available stdin and write it to the service worker.
      return Buffer.from("");
    },

    getSignalState: (): number => {
      log("getSignalState - TODO");
      return 0;
    },
  };
}
