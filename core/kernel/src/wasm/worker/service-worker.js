/*
NOTES:

- This is not in typescript and can't use require without using a webpack plugin
  or complicating the configuration, as explained here

     https://stackoverflow.com/questions/64549183/how-to-load-a-service-worker-using-webpack-5

  We choose to keep this low level due to our usability requirements.

- To debug in chrome, look at chrome://inspect/#service-workers

- Requires https, except on localhost with chrome or firefox + special config.

- IMPORTANT! On Safari it is **absolutely critical** that this only take a few seconds max to
  respond to any requests.  If it takes longer, then Safari kills the service worker and blacklists
  it so it won't work at all.    Perhaps Firefox and Chrome might do something similar, but
  with different parameters, though I didn't see that.  Figuring out that this is the case
  was pretty difficult for me, since I couldn't find it in any docs anywhere, and somehow I
  just figured it out.  That's why we have a timeout for waiting for stdin, and similar
  comments in io-using-service-worker.ts.

REFERENCES:

- This blog post was helpful: https://jasonformat.com/javascript-sleep/
- This library: https://github.com/alexmojaki/sync-message

*/

// Version is only used for some logging right now.
const VERSION = 6;

const log = (...args) => {
  // for debugging, uncomment this.
  //console.log("service-worker.js - v", VERSION, ...args);
};

// This MUST match what's in io-using-service-worker.ts and ../io-using-service-worker.ts
const PREFIX = "/python-wasm-sw/";

self.addEventListener("install", (e) => {
  log("install  - python-wasm service worker, version: ", VERSION, e);
});

self.addEventListener("activate", (e) => {
  log("activate - python-wasm service worker, version: ", VERSION, e);
});

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function handleSleep(e) {
  const body = await e.request.json();
  const ms = Math.round(body?.ms) ?? 100;
  log("sleep", ms);
  await delay(ms);
  return new Response({ status: 304 });
}

const cache = {
  sig: {},
  stdin: {},
  callOnStdin: {},
  output: {},
};

async function handleWriteSignal(e) {
  const { sig, id } = await e.request.json();
  log("signal", { id, sig });
  cache.sig[id] = sig;
  return new Response(`${sig}`, { status: 200 });
}

async function handleReadSignal(e) {
  const { clear, id } = await e.request.json();
  const curSig = cache.sig[id] ?? 0;
  if (clear) {
    cache.sig[id] = 0;
  }
  return new Response(`${curSig}`, { status: 200 });
}

async function handleWriteStdin(e) {
  const { data, id } = await e.request.json();
  log("write to stdin", { id, data });
  if (cache.stdin[id] == null) {
    cache.stdin[id] = data;
  } else {
    cache.stdin[id] += data;
  }
  const f = cache.callOnStdin[id];
  if (f != null) {
    f();
    cache.callOnStdin[id] = null;
  }
  return new Response(`${cache.stdin[id].length}`, { status: 200 });
}

// Wait up to milliseconds for new stdin.  Throws an error
// if not appears.
// NOTE: this will NOT get called more than once at the same time
// for the same id because the client is a single threaded synchronous
// WASM process.  That's why cache.callOnStdin[id] is a single function
// instead of a list of functions.
async function waitForStdin(id, milliseconds = 3000) {
  if (cache.stdin[id]) {
    // DONE: there is already input waiting.
    return;
  }
  // We make a promise that resolves when input arrives
  // and rejects if the amount of time elapses.  This code
  // feels a bit awkward, but works.
  await new Promise((resolve, reject) => {
    let resolved = false;
    let cancelled = false;
    let timer = 0;
    const f = () => {
      if (cancelled) return;
      clearTimeout(timer);
      resolved = true;
      resolve();
    };
    cache.callOnStdin[id] = f;
    timer = setTimeout(() => {
      if (!resolved) {
        cache.callOnStdin[id] = null;
        cancelled = true;
        reject("timeout");
      }
    }, milliseconds);
  });
}

async function handleReadStdin(e) {
  const { id, ms } = await e.request.json();
  log("read from stdin", { id });
  // wait until there is something in stdin
  try {
    await waitForStdin(id, ms ?? 3000);
  } catch (_err) {
    // Just ignore the error and send back "" below is fine.
  }
  const data = cache.stdin[id];
  cache.stdin[id] = "";
  return new Response(data, { status: 200 });
}

async function handleWriteOutput(e) {
  let { stream, data, id } = await e.request.json();
  log("write to output", { id, stream, data });
  if (!cache.output[id]) {
    cache.output[id] = stream;
  } else if (cache.output[id][0] != stream) {
    const start = new Date().valueOf();
    let d = 1;
    while (cache.output[id] && cache.output[id][0] != stream) {
      if (new Date().valueOf() - start > 3000) {
        // give up -- shouldn't happen since frontend should handle
        // all IO within a fraction of a second.
        return new Response("", { status: 200 });
      }
      await delay(d);
      d = Math.min(d * 1.3, 200);
    }
    if (!cache.output[id]) {
      cache.output[id] = stream;
    }
  }
  cache.output[id] += data;
  return new Response("", { status: 200 });
}

// Unlike handleReadStdin, this doesn't wait for stdin to be available,
// and instead reads what is already in the buffer.
async function handleReadOutput(e) {
  const { id } = await e.request.json();
  const data = cache.output[id];
  cache.output[id] = "";
  return new Response(data, { status: 200 });
}

self.addEventListener("fetch", (e) => {
  const { pathname } = new URL(e.request.url);
  if (!pathname.startsWith(PREFIX)) {
    return false;
  }
  switch (pathname.slice(PREFIX.length)) {
    case "sleep":
      e.respondWith(handleSleep(e));
      return;

    case "write-stdin":
      e.respondWith(handleWriteStdin(e));
      return;
    case "read-stdin":
      e.respondWith(handleReadStdin(e));
      return;

    case "write-output":
      e.respondWith(handleWriteOutput(e));
      return;
    case "read-output":
      e.respondWith(handleReadOutput(e));
      return;

    case "write-signal":
      e.respondWith(handleWriteSignal(e));
      return;
    case "read-signal":
      e.respondWith(handleReadSignal(e));
      return;
  }
});
