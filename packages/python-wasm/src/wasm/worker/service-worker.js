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
  console.log("service-worker.js - ", ...args);
};

const PREFIX = "/python-wasm-sw/";

self.addEventListener("install", (e) => {
  log("Install v3: e=", e);
});

self.addEventListener("activate", (e) => {
  log("Activate v3: e=", e);
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
};

// Ensure the cache only holds data about active sessions to avoid
// wasting space. Data only needs to live for a few seconds.
function touch(id: string) {
  const now = new Date().valueOf();
  cache.lastUsed[id] = now;
  for (const i in cache.lastUsed) {
    if (now - cache.lastUsed[i] >= 30000) {
      delete cache.lastUsed[i];
      delete cache.sig[i];
      delete cache.stdin[i];
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
  return new Response(`${cache.stdin[id].length}`, { status: 200 });
}

async function handleReadStdin(e) {
  const { id } = await e.request.json();
  log("read from stdin", id);
  while (!cache.stdin[id]) {
    await delay(25);
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
