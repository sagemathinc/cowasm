import type { IOHandlerClass } from "./types";
import debug from "debug";

const log = debug("wasm:worker:io-using-atomics");

const SIGNAL_CHECK_MS = 500;

export default class IOHandler implements IOHandlerClass {
  private id: string;
  private lastSignalCheck: number = 0;
  private counter: number = 0;

  constructor(opts) {
    log(opts);
    this.id = opts.id;
    if (this.id == null) {
      throw Error(`${this.id} must be a v4 uuid`);
    }
  }

  private receive(target: string, timeout: number = 0): string | null {
    const url = `python-wasm-sw/${this.id}/receive/${target}/${timeout}`;
    const request = new XMLHttpRequest();
    // false makes the request synchronous
    request.open("GET", url, false);
    const { status } = request;
    if (status == 200) {
      return request.response;
    } else {
      // TODO -- how to deal with errors?
      log("error", status);
      return null;
    }
  }

  sleep(milliseconds: number): void {
    log("sleep ", milliseconds, " - TODO");
  }

  getStdin(): Buffer {
    this.counter += 1;
    if (this.counter == 10) return Buffer.from("\nDONE.");
    if (this.counter > 10) return Buffer.from("");
    log("getStdin - TODO");
    const t0 = new Date().valueOf();
    const url = `/python-wasm-sw/sleep?t=2000`;
    const request = new XMLHttpRequest();
    // false makes the request synchronous
    request.open("GET", url, false);
    request.setRequestHeader("cache-control", "no-cache, no-store, max-age=0");
    try {
      request.send();
    } catch (err) {
      return Buffer.from(`ERROR: ${err}`);
    }
    return Buffer.from(
      JSON.stringify({ status: request.status, t: new Date().valueOf() - t0 })
    );
    //     while (true) {
    //       const data = this.receive("stdin", 1000);
    //       if (data && data.length > 0) {
    //         return Buffer.from(data);
    //       }
    //       // TODO: check for signals
    //     }
  }

  // Python kernel will call this VERY frequently, which is fine for
  // checking an atomic, but NOT for using xmlhttprequest.
  getSignalState(): number {
    const now = new Date().valueOf();
    if (now - this.lastSignalCheck < SIGNAL_CHECK_MS) {
      return 0;
    }
    this.lastSignalCheck = now;
    const sig = this.receive("signal", 0);
    if (sig) {
      return parseInt(sig);
    }
    return 0;
  }
}
