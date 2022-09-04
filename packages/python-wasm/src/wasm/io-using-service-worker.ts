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
import { SIGINT } from "./constants";
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
    // @ts-ignore this import.meta.url issue -- actually only consumed by webpack
    const url = new URL("./worker/service-worker.js", import.meta.url).href;
    const reg = await navigator.serviceWorker.register(url);
    if (!reg.active) location.reload(); // no way around this (?).
  }

  getExtraOptions() {
    return { id: this.id };
  }

  private async send(target: string, body: string): Promise<void> {
    const url = `/python-wasm-sw/send?id=${this.id}&target=${target}`;
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
