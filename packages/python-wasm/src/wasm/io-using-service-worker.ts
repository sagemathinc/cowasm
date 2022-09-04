/*
Synchronous blocking IO using service workers and XMLHttpRequest,
in cases when can't use atomics.  By "IO", we also include "IO with
the system", e.g., signals.

This is inspired by the sync-message package.

References:

- https://github.com/alexmojaki/sync-message
- https://jasonformat.com/javascript-sleep/
- https://stackoverflow.com/questions/10590213/synchronously-wait-for-message-in-web-worker
- https://github.com/pyodide/pyodide/issues/1503

*/

import type { IOProvider } from "./types";
import { SERVICE_WORKER_SCOPE, SIGINT } from "./constants";
import debug from "debug";
import { v4 as uuidv4 } from "uuid";

const log = debug("wasm:io-provider");

export default class IOProviderUsingServiceWorker implements IOProvider {
  private id: string = uuidv4();

  constructor() {
    log("IOProviderUsingXMLHttpRequest");
    this.initServiceWorker();
  }

  async initServiceWorker() {
    log("register service worker");
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
    //     // @ts-ignore this import.meta.url issue -- actually only consumed by webpack in calling code...
    //     const url = new URL("./worker/service-worker.js", import.meta.url).href;
    //     //     const registration = await navigator.serviceWorker.register(url, {
    //     //       scope: SERVICE_WORKER_SCOPE,
    //     //     });
    //     try {
    //       const registration = await navigator.serviceWorker.register(url, {
    //         scope: SERVICE_WORKER_SCOPE,
    //       });
    //       console.log({ registration, url });
    //       if (registration.installing) {
    //         console.log("Service worker installing");
    //       } else if (registration.waiting) {
    //         console.log("Service worker installed");
    //       } else if (registration.active) {
    //         console.log("Service worker active");
    //       }
    //     } catch (error) {
    //       console.error(`Registration failed with ${error}`);
    //     }
  }

  getExtraOptions() {
    return { id: this.id };
  }

  private async send(target: string, body: string): Promise<void> {
    const url = `${SERVICE_WORKER_SCOPE}/${this.id}/send/${target}`;
    try {
      await fetch(url, { method: "POST", body });
    } catch (err) {
      console.warn("failed to send to service worker", { url, body }, err);
    }
  }

  signal(sig: number = SIGINT): void {
    log("signal", sig);
    this.send("signal", `${sig}`);
  }

  writeToStdin(data: Buffer): void {
    log("writeToStdin", data);
    this.send("stdin", data.toString());
  }
}
