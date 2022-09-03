import type { IOHandler } from "./types";
import debug from "debug";
const log = debug("wasm:worker:io-using-atomics");

export default function ioHandler(parent, opts): IOHandler {
  const { spinLockBuffer, stdinLockBuffer } = opts.locks ?? {};
  if (spinLockBuffer == null) {
    throw Error("must define spinLockBuffer");
  }
  if (stdinLockBuffer == null) {
    throw Error("must define stdinLockBuffer");
  }
  if (opts.stdinBuffer == null) {
    throw Error("must define stdinBuffer");
  }

  const spinLock = new Int32Array(spinLockBuffer);
  const stdinBuffer = opts.stdinBuffer;
  const stdinLock = new Int32Array(stdinLockBuffer);
  const { signalBuffer } = opts;
  if (signalBuffer == null) {
    throw Error("must define signalBuffer");
  }
  const signalState = new Int32Array(signalBuffer);

  return {
    sleep: (milliseconds: number) => {
      log("sleep starting, milliseconds=", milliseconds);
      // We ask main thread to do the lock:
      parent.postMessage({ event: "sleep", milliseconds });
      // We wait a moment for that message to be processed:
      while (spinLock[0] != 1) {
        // wait for it to change from what it is now.
        Atomics.wait(spinLock, 0, spinLock[0], 100);
      }
      // now the lock is set, we wait for it to get unset:
      Atomics.wait(spinLock, 0, 1, milliseconds);
      log("sleep done, milliseconds=", milliseconds);
    },

    getStdin: (): Buffer => {
      parent.postMessage({ event: "getStdin" });
      // wait to change to -1
      while (stdinLock[0] != -1) {
        // wait with a timeout of 1s
        Atomics.wait(stdinLock, 0, stdinLock[0], 1000);
        if (stdinLock[0] != -1) {
          // if it didn't change to -1, maybe the message was
          // somehow missed or discarded due to already waiting
          // or something else.  Shouldn't happen, but I've observed
          // deadlock here before in a browser.  So we send message
          // again to frontend asking it to make the change.
          parent.postMessage({ event: "getStdin" });
        }
      }
      // wait to change from -1
      Atomics.wait(stdinLock, 0, -1);
      // how much was read
      const bytes = stdinLock[0];
      const data = Buffer.from(stdinBuffer.slice(0, bytes)); // not a copy
      return data;
    },

    getSignalState: (): number => {
      const signal = Atomics.load(signalState, 0);
      if (signal) {
        log("signalState", signalState[0]);
        Atomics.store(signalState, 0, 0);
        return signal;
      }
      return 0;
    },
  };
}
