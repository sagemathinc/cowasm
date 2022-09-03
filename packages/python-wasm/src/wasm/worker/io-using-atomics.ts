import type { IOHandler } from "./types";
import debug from "debug";
const log = debug("wasm:worker:io-using-atomics");

export default function ioHandler(parent, opts): IOHandler {
  log("creating ioHandler");
  const { spinLockBuffer, stdinLengthBuffer } = opts.locks ?? {};
  if (spinLockBuffer == null) {
    throw Error("must define spinLockBuffer");
  }
  if (stdinLengthBuffer == null) {
    throw Error("must define stdinLengthBuffer");
  }
  if (opts.stdinBuffer == null) {
    throw Error("must define stdinBuffer");
  }

  const spinLock = new Int32Array(spinLockBuffer);
  const stdinBuffer = Buffer.from(opts.stdinBuffer);
  const stdinLength = new Int32Array(stdinLengthBuffer);
  const { signalBuffer } = opts;
  if (signalBuffer == null) {
    throw Error("must define signalBuffer");
  }
  const signalState = new Int32Array(signalBuffer);

  const handler = {
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
      // wait to change to a positive value, i.e., some input to arrive
      while (stdinLength[0] == 0) {
        // wait with a timeout of 1s for it to change.
        log("getStdin: waiting for some new stdin");
        Atomics.wait(stdinLength, 0, 0, 500);
        if (Atomics.load(signalState, 0)) {
          return Buffer.from("");
        }
      }
      // Now there is stdin waiting for us:  how much?
      const len = stdinLength[0];
      log("getStdin: have stdin, processing ", len, " bytes");
      const data = Buffer.alloc(len);
      stdinBuffer.copy(data, 0, 0, len);
      // Reset the buffer:
      Atomics.store(stdinLength, 0, 0);
      Atomics.notify(stdinLength, 0);
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

  return handler;
}
