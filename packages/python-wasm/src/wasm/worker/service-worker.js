// Debug in chrome by looking at chrome://inspect/#service-workers

// I couldn't get typescript to work with this.

//import debug from "debug";
//const log = debug("wasm:service-worker");
const log = console.log;

const SERVICE_WORKER_SCOPE = "/python-wasm";

self.addEventListener("install", (e) => {
  log("Install v2: e=", e);
});

self.addEventListener("activate", (e) => {
  log("Activate v2: e=", e);
});

function handleFetch(e) {
  log("fetch: e=", e);
  log("state = ", state);
  const { url } = e.request;
  const { pathname } = new URL(url);
  /*
  The url schema is:
         .../python-wasm/[uuid]/[send|receive]/[stdin|signal]/[milliseconds]

  where the [milliseconds] are only specified on receive.
  */

  const i = pathname.lastIndexOf(SERVICE_WORKER_SCOPE);
  if (i == -1) {
    e.respondWith(
      new Response(`url (="${url}") must start with ${SERVICE_WORKER_SCOPE}`, {
        status: 404,
      })
    );
    return;
  }
  const [, , id, func, target, milliseconds] = pathname.slice(i).split("/");

  if (func == "send") {
    send(e, id, target);
    return;
  } else if (func == "receive") {
    receive(e, id, target, parseInt(milliseconds ?? "0"));
    return;
  } else {
    e.respondWith(
      new Response(`func(="${func}") must be "send" or "receive"`, {
        status: 404,
      })
    );
    return;
  }
}

//const state = {[id:string] : {signal:number; stdin:string}} = {};
const state = {};
function send(e, id, target) {
  console.log(state);
  if (state[id] == null) {
    state[id] = { signal: "0", stdin: "" };
  }
  const { body } = e.request;
  if (target == "signal") {
    state[id].signal = body;
  } else if (target == "stdin") {
    state[id].stdin += body;
  } else {
    e.respondWith(
      new Response(`target(="${target}") must be "signal" or "stdin"`, {
        status: 404,
      })
    );
    return;
  }
  e.respondWith(new Response("OK", { status: 200 }));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function receive(
  e,
  id /*: string, */,
  target /*: "stdin|signal", */,
  milliseconds /* : number */
) {
  let cur = state[id]?.[target];
  if (target == "signal") {
    e.respondWith(new Response(cur ?? "0", { status: 200 }));
    return;
  } else if (target == "stdin") {
    const start = new Date().valueOf();
    while (!cur && new Date().valueOf() - start < milliseconds) {
      // TODO: it would be way better to have this be event driven by a send happening,
      // and I'm sure I could implement that!  This will be fine for a first version though.
      await delay(250);
      cur = state[id]?.[target];
      if (cur) {
        // reset it, since we read everything available.
        state[id][target] = "";
      }
    }
    e.respondWith(new Response(cur ?? "", { status: 200 }));
  } else {
    e.respondWith(
      new Response(`target(="${target}") must be "signal" or "stdin"`, {
        status: 404,
      })
    );
  }
}

self.addEventListener("fetch", handleFetch);
