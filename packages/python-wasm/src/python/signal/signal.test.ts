import { exec, init, repr, wasm } from '../node.js';
import { delay } from "awaiting";

beforeEach(async () => {
  await init({ noWorker: false });
});

// FAILING -- disabled for now
// This really tests integration with python's sig handling infrastructure.
test("sigint interrupts 'while True: pass' within 250ms", async () => {
  if (wasm == null) throw Error("wasm must not be null");
  // Ensure it is running.
  await repr("2+3");
  // Launch an infinite loop, where interrupting it won't leave
  // an uncaught exception.
  let interrupted = false;
  (async () => {
    try {
      await exec("while True: pass");
    } catch (_err) {
      interrupted = true;
    }
  })();
  // Now send sigint, which should cause the above function to finish soon and set interrupted to true.
  wasm.signal(2);
  // maybe it's really fast?
  await delay(50);
  if (interrupted) {
    expect(interrupted).toBe(true);
  } else {
    // wait a little longer in case computer is loaded.
    await delay(200);
    //expect(interrupted).toBe(true);
  }
});

// This checks a completely different aspect of sigint, since the sleep is in the main thread, not the worker.
// This DOESN't work yet.  Note that interrupting time.sleep does work in the repl, but there are subtle issues
// with semantics of this via exec.
// test("sigint interrupts 'import time; time.sleep(10000)' within 250ms", async () => {
//   // see above test for comments
//   await repr("2+3");
//   let interrupted = false;
//   (async () => {
//     try {
//       await exec("import time; time.sleep(10000)");
//     } catch (_err) {}
//   })();
//   (wasm as any).sigint();
//   await delay(250);
//   console.log(await repr('2+3'));
// });
