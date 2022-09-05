/*
NOTES:

- This is not in typescript and can't use require without using a webpack plugin
  or complicating the configuration, as explained here

     https://stackoverflow.com/questions/64549183/how-to-load-a-service-worker-using-webpack-5

  We choose to keep this low level due to our usability requirements.

- To debug in chrome, look at chrome://inspect/#service-workers

- Requires https, except on localhost with chrome or firefox + special config.

REFERENCES:

- This blog post was helpful: https://jasonformat.com/javascript-sleep/
- This library: https://github.com/alexmojaki/sync-message

*/

const log = (...args) => {
  // for debugging, uncomment this.
  // console.log("service-worker.js - ", ...args);
};

// This MUST match what's in io-using-service-worker.ts and ../io-using-service-worker.ts
const PREFIX = "/python-wasm-sw/";

// Version is only used for some logging right now.
const VERSION = 3;

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
  lastUsed: {},
  callOnStdin: {},
};

// Ensure the cache only holds data about active sessions to avoid
// wasting space. Data only needs to live for a few seconds.  This
// might be totally not needed, since cache is purely in RAM (not
// persisted like Cache is), and probably is deleted as soon as there
// are no open pages.
function touch(id) {
  const now = new Date().valueOf();
  cache.lastUsed[id] = now;
  for (const i in cache.lastUsed) {
    if (now - cache.lastUsed[i] >= 1000 * 60) {
      delete cache.lastUsed[i];
      delete cache.sig[i];
      delete cache.stdin[i];
      // Do *not* delete cache.callOnStdin[i], since that might need to be
      // waiting for hours (e.g. a terminal sitting there), and removing something
      // from it would make the eventual IO never get detected.
    }
  }
}

async function handleWriteSignal(e) {
  const { sig, id } = await e.request.json();
  log("signal", id, sig);
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
  touch(id);
  log("write to stdin", id, data);
  if (cache.stdin[id] == null) {
    cache.stdin[id] = data;
  } else {
    cache.stdin[id] += data;
  }
  const v = cache.callOnStdin[id];
  if (v != null) {
    for (const f of v) {
      f();
    }
    cache.callOnStdin[id] = [];
  }
  return new Response(`${cache.stdin[id].length}`, { status: 200 });
}

async function handleReadStdin(e) {
  const { id } = await e.request.json();
  log("read from stdin", id);
  if (!cache.stdin[id]) {
    // wait until there is something in stdin
    await new Promise((resolve) => {
      if (cache.callOnStdin[id] == null) {
        cache.callOnStdin[id] = [resolve];
      } else {
        cache.callOnStdin[id].push(resolve);
      }
    });
  }
  const data = cache.stdin[id];
  cache.stdin[id] = "";
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
    case "write-signal":
      e.respondWith(handleWriteSignal(e));
      return;
    case "read-signal":
      e.respondWith(handleReadSignal(e));
      return;
  }
});