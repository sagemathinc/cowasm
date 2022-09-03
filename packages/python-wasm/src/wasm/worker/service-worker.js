//import debug from "debug";
//const log = debug("wasm:service-worker");
const log = console.log;

self.addEventListener("install", (e) => {
  log("Install event:", e);
});

self.addEventListener("activate", (e) => {
  log("Activate event:", e);
});
