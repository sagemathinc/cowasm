// Debug in chrome by looking at chrome://inspect/#service-workers

//import debug from "debug";
//const log = debug("wasm:service-worker");
const log = console.log;

self.addEventListener("install", (e) => {
  log("Install3: e=", e);
});

self.addEventListener("activate", (e) => {
  log("Activate: e=", e);
});

self.addEventListener("fetch", (e) => {
  log("fetch: e=", e);
  const res = new Response("X");
  e.respondWith(res);
});
