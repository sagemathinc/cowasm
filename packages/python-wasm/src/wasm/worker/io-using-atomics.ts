import type { IOHandler } from "./types";
import debug from "debug";
const log = debug("wasm:worker:io-using-atomics");

export default function ioHandler(opts): IOHandler {
  log("creating ioHandler");
  if (opts.stdinLengthBuffer == null) {
    throw Error("must define stdinLengthBuffer");
  }
  if (opts.stdinBuffer == null) {
    throw Error("must define stdinBuffer");
  }

  const stdinBuffer = Buffer.from(opts.stdinBuffer);
  const stdinLength = new Int32Array(opts.stdinLengthBuffer);
  const { signalBuffer } = opts;
  if (signalBuffer == null) {
    throw Error("must define signalBuffer");
  }
  const signalState = new Int32Array(signalBuffer);

  const sleepArray = new Int32Array(new SharedArrayBuffer(4));

  const handler = {
    sleep: (milliseconds: number) => {
      log("sleep starting, milliseconds=", milliseconds);
      // wait for sleepArray[0] to change from 0, which
      // will never happen.  The only hitch is we need to periodically
      // check for signals.

      while (milliseconds > 0) {
        const t = Math.min(milliseconds, 500);
        Atomics.wait(sleepArray, 0, 0, t);
        milliseconds -= t;
        if (Atomics.load(signalState, 0)) {
          // there's a signal waiting
          // TODO: there could be signals that maybe don't interrupt sleep?
          return;
        }
      }
    },

    getStdin: (): Buffer => {
      // wait to change to a positive value, i.e., some input to arrive
      while (stdinLength[0] == 0) {
        // wait with a timeout of 1s for it to change.
        log("getStdin: waiting for some new stdin");
        Atomics.wait(stdinLength, 0, 0, 1000);
        if (Atomics.load(signalState, 0)) {
          // check for any signals
          // TODO: there could be signals that maybe don't interrupt input?
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
        // clear signal state so we can get a new signal
        Atomics.store(signalState, 0, 0);
        // tell C program about the signal we found.
        return signal;
      }
      return 0;
    },
  };

  return handler;
}
