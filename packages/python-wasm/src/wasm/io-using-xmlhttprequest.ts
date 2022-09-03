import type { IOProvider } from "./types";
import { SIGINT } from "./constants";
import debug from "debug";
const log = debug("wasm:io-provider");

interface Options {
  getStdinAsync: () => Promise<Buffer>;
}

export default class IOProviderUsingXMLHttpRequest implements IOProvider {
  private getStdinAsync: () => Promise<Buffer>;
  private waitingForStdin: boolean = false;

  constructor(options: Options) {
    log("IOProviderUsingXMLHttpRequest");
    this.getStdinAsync = options.getStdinAsync;
    this.initServiceWorker();
  }

  initServiceWorker() {
    log("setting up service worker");
    // @ts-ignore this import.meta.url issue -- actually only consumed by webpack in calling code...
    const url = new URL("./worker/service-worker.js", import.meta.url);
    navigator.serviceWorker
      .register(url, {
        scope: "./fubar",
      })
      .then((registration) => {
        let serviceWorker;
        if (registration.installing) {
          serviceWorker = registration.installing;
          log("installing");
        } else if (registration.waiting) {
          serviceWorker = registration.waiting;
          log("waiting");
        } else if (registration.active) {
          serviceWorker = registration.active;
          log("active");
        }
        if (serviceWorker) {
          log(serviceWorker.state);
          serviceWorker.addEventListener("statechange", (e) => {
            log("statechange", e.target.state);
          });
        }
      })
      .catch((error) => {
        log("something went wrong", error);
      });
  }

  getExtraOptions() {
    return {};
  }

  signal(_sig: number = SIGINT): void {
    throw Error("signal -- not implemented");
  }

  sleep(milliseconds: number): void {
    log("sleep", milliseconds);
    throw Error("sleep -- not implemented");
  }

  private async _getStdin(): Promise<void> {
    log("getStdin: waiting...");
    try {
      this.waitingForStdin = true;
      // TODO

      const data = await this.getStdinAsync();
      log("got data", data);

      // TODO
    } catch (err) {
      // not much to do -- no way to report problem.
      log("failed to get data", err);
    } finally {
      this.waitingForStdin = false;
    }
  }

  getStdin(): void {
    // while this.waitingForStdin is true, stdinLock[0]
    // should be -1 unless something is very wrong.
    if (this.waitingForStdin) {
      log("getStdin: already waiting");
      return;
    }
    this._getStdin();
  }

  //   isWaitingForStdin(): boolean {
  //     return this.waitingForStdin;
  //   }
}
