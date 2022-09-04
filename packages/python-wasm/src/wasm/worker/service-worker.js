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

const log = console.log;

self.addEventListener("install", (e) => {
  log("Install v2: e=", e);
});

self.addEventListener("activate", (e) => {
  log("Activate v2: e=", e);
});

// async function handleFetch(e) {
//   log("fetch: e=", e);
//   log("state = ", state);
//   const { url } = e.request;
//   const { pathname } = new URL(url);
//   /*
//   The url schema is:

//          /python-wasm/[uuid]/[send|receive]/[stdin|signal]
//          /python-wasm/sleep

//   */

//   if (pathname.endsWith("sleep")) {
//     await delay(1000);
//     e.respondWith(new Response(null, { status: 304 }));
//     return;
//   }

//   const i = pathname.lastIndexOf(SCOPE);
//   if (i == -1) {
//     e.respondWith(
//       new Response(`url (="${url}") must start with ${SCOPE}`, {
//         status: 404,
//       })
//     );
//     return;
//   }
//   const [, , id, func, target] = pathname.slice(i).split("/");

//   if (func == "send") {
//     send(e, id, target);
//   } else if (func == "receive") {
//     receive(e, id, target, 250);
//   } else {
//     e.respondWith(
//       new Response(`func(="${func}") must be "send" or "receive"`, {
//         status: 404,
//       })
//     );
//   }
//   return; // don't do anything after this
// }

// //const state = {[id:string] : {signal:number; stdin:string}} = {};
// const state = {};
// function send(e, id, target) {
//   console.log(state);
//   if (state[id] == null) {
//     state[id] = { signal: "0", stdin: "" };
//   }
//   const { body } = e.request;
//   if (target == "signal") {
//     state[id].signal = body;
//   } else if (target == "stdin") {
//     state[id].stdin += body;
//   } else {
//     e.respondWith(
//       new Response(`target(="${target}") must be "signal" or "stdin"`, {
//         status: 404,
//       })
//     );
//     return;
//   }
//   e.respondWith(new Response("OK", { status: 200 }));
// }



// async function receive(
//   e,
//   id /*: string, */,
//   target /*: "stdin|signal", */,
//   milliseconds /* : number */
// ) {
//   let cur = state[id]?.[target];
//   if (target == "signal") {
//     e.respondWith(new Response(cur ?? "0", { status: 200 }));
//     return;
//   } else if (target == "stdin") {
//     const start = new Date().valueOf();
//     while (!cur && new Date().valueOf() - start < milliseconds) {
//       // TODO: it would be way better to have this be event driven by a send happening,
//       // and I'm sure I could implement that!  This will be fine for a first version though.
//       await delay(250);
//       cur = state[id]?.[target];
//       if (cur) {
//         // reset it, since we read everything available.
//         state[id][target] = "";
//       }
//     }
//     e.respondWith(new Response(cur ?? "", { status: 200 }));
//   } else {
//     e.respondWith(
//       new Response(`target(="${target}") must be "signal" or "stdin"`, {
//         status: 404,
//       })
//     );
//   }
// }

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sleep(t) {
  t = t || 100;
  log("sleep", t);
  await delay(t);
  return new Response(null, { status: 304 });
}

self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.pathname === `/python-wasm-sw/sleep`) {
    const t = Math.round(new URLSearchParams(u.search).get("t"));
    e.respondWith(sleep(t));
  }
});
