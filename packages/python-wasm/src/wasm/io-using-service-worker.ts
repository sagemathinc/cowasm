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
    log("IOProviderUsingXMLHttpRequest", "id = ", this.id);
    registerServiceWorker();
  }

  getExtraOptions() {
    return { id: this.id };
  }

  private async send(
    target: "write-signal" | "write-stdin",
    body: object
  ): Promise<void> {
    const url = `/python-wasm-sw/${target}`;
    try {
      await fetch(url, { method: "POST", body: JSON.stringify(body) });
    } catch (err) {
      console.warn("failed to send to service worker", { url, body }, err);
    }
  }

  signal(sig: number = SIGINT): void {
    log("signal", sig);
    this.send("write-signal", { sig, id: this.id });
  }

  writeToStdin(data: Buffer): void {
    log("writeToStdin", data);
    this.send("write-stdin", { data: data.toString(), id: this.id });
  }
}

function getURL(): string {
  // @ts-ignore this import.meta.url issue -- actually only consumed by webpack
  const url = new URL("./worker/service-worker.js", import.meta.url).href;
  console.log("service worker url = ", url);
  return url;
}

function hasServiceWorker() {
  if (!navigator.serviceWorker) {
    console.warn(
      "WARNING: service worker is not available, so nothing is going to work"
    );
    return false;
  }
  return true;
}

async function registerServiceWorker() {
  if (!hasServiceWorker()) return;
  const url = getURL();
  const reg = await navigator.serviceWorker.register(url);
  if (reg.active?.state != "activated") {
    // I think there is no way around this, since it is an unfortunate
    // part of the service worker spec.
    console.warn("Reloading page to activate service worker...");
    if (localStorage["python-wasm-service-worker-broken"]) {
      // use local storage to avoid DOS of server
      setTimeout(() => {
        location.reload();
      }, 3000);
    } else {
      localStorage["python-wasm-service-worker-broken"] = true;
      location.reload();
    }
  } else {
    // It probably worked.
    delete localStorage["python-wasm-service-worker-broken"];
  }
}

/*
fixServiceWorker:

There is exactly one situation where I know this is definitely needed, though
browsers I think could revoke the service worker at any time, so it is good to
have an automated way to fix this. Also, this may be useful if we upgrade the
service worker and add a new URL endpoint, since this will get triggered.

1. Open python-wasm using a service worker on an iphone or ipad in safari.

2. Maybe open another page so the python-wasm page is in the background.
(Probably not needed.)

3. Suspend your phone and wait 1 minute.

4. Turn phone back on. The service worker *might* be completely broken and no
amount of refreshing fixes it. Without the workaround below, the only option is
for the user to clear all private data associated with the site, or wait a while
(maybe an hour) and things maybe start to work again.

I think this is caused by the page suspending in the middle of a "get stdin"
call. This code below does seem to effectively work around the problem, at the
expense of a page refresh when you return to the page. This isn't uncommon on
safari anyways though, since it often dumps pages to save memory.

This doesn't seem to happen on any desktop browsers (including safari) as far
as I can tell, even when suspending/resuming a laptop.

There may be a better fix involving changing how the service worker behaves,
but that is for another commit, and another day.
*/
export async function fixServiceWorker() {
  if (!hasServiceWorker()) return;
  console.warn("The service work seems to be disabled.  Fixing it...");
  const url = getURL();
  try {
    const reg = await navigator.serviceWorker.register(url);
    await reg.unregister();
  } catch (err) {
    console.warn(err);
  }
  location.reload();
}
