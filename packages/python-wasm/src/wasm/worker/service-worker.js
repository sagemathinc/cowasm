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

const log = (...args) => console.log("service-worker.js", ...args);

const PREFIX = "/python-wasm-sw/";

self.addEventListener("install", (e) => {
  log("Install v2: e=", e);
});

self.addEventListener("activate", (e) => {
  log("Activate v2: e=", e);
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

let sig = 0;
async function handleWriteSignal(e) {
  const body = await e.request.json();
  sig = body?.sig ?? 0;
  log("signal", sig);
  return new Response(`${sig}`, { status: 200 });
}

async function handleReadSignal(e) {
  const body = await e.request.json();
  const clear = body?.clear ?? true;
  const curSig = sig;
  if (clear) {
    sig = 0;
  }
  return new Response(`${curSig}`, { status: 200 });
}

let stdout = "";
async function handleWriteStdin(e) {
  const body = await e.request.json();
  const data = body?.data ?? "";
  log("write to stdin", data);
  stdout += data;
  return new Response(`${stdout.length}`, { status: 200 });
}

async function handleReadStdin(e) {
  log("read from stdin");
  while (!stdout) {
    await delay(100);
  }
  const data = stdout;
  stdout = "";
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
