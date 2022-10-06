/* Synchronous IO using sleep!?

*/

import type { IOHandlerClass } from "./types";
import debug from "debug";

const log = debug("wasm:worker:io-using-sleep");

const SIGNAL_CHECK_MS = 500;

export default class IOHandler implements IOHandlerClass {
  private lastSignalCheck: number = 0;

  constructor(opts) {
    log(opts);
  }

  sleep(milliseconds: number): void {
    console.log("SLEEP");
    log("sleep ", milliseconds);
    const start = new Date().valueOf();
    while (new Date().valueOf() - start <= milliseconds) {
      try {
        // We don't sleep the entire, because (1) we want to check for signals periodically,
        // and (2) long synchronous requests CRASH the service worker!  On Safari, it will kill
        // the worker and ban it.  So do NOT do that.
        const request = new XMLHttpRequest();
        request.timeout = Math.min(milliseconds, 1000);
        request.open("GET", "/index.html", false); // false = synchronous
        request.send();
      } catch (_err) {
        // ignore
      }
      if (this.getSignal(false)) {
        // TODO: there could be signals that maybe don't interrupt sleep?
        return;
      }
    }
  }

  getStdin(): Buffer {
    // TODO
    return Buffer.from("");
  }

  private getSignal(_clear: boolean): number {
    // TODO
    return 0;
  }

  // Python kernel will call this VERY frequently, which is fine for
  // checking an atomic, but NOT for using xmlhttprequest.
  getSignalState(): number {
    const now = new Date().valueOf();
    if (now - this.lastSignalCheck < SIGNAL_CHECK_MS) {
      return 0;
    }
    this.lastSignalCheck = now;
    return this.getSignal(true);
  }
}
