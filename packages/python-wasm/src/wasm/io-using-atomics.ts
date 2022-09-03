/*
Synchronous blocking IO using Atomics and SharedArrayBuffers.

This requires cross-origin isolation, so the two headers have to be set by the
server as follows.  This is VERY restrictive, but if you can do this, it's optimal:

  "Cross-Origin-Opener-Policy": "same-origin"
  "Cross-Origin-Embedder-Policy": "require-corp"
*/

import type { IOProvider } from "./types";
import { SIGINT } from "./constants";
import debug from "debug";
const log = debug("wasm:io-provider");

interface Buffers {
  stdinBuffer: SharedArrayBuffer;
  signalBuffer: SharedArrayBuffer;
  locks: {
    spinLockBuffer: SharedArrayBuffer;
    stdinLengthBuffer: SharedArrayBuffer;
  };
}

export default class IOProviderUsingAtomics implements IOProvider {
  private spinLock: Int32Array;
  private stdinLength: Int32Array;
  private signalInt32Array: Int32Array;
  private stdinUint8Array: Uint8Array;
  private sleepTimer: any;
  private buffers: Buffers;

  constructor() {
    log("IOProviderUsingAtomics");
    const spinLockBuffer = new SharedArrayBuffer(4);
    this.spinLock = new Int32Array(spinLockBuffer);
    const stdinLengthBuffer = new SharedArrayBuffer(4);
    this.stdinLength = new Int32Array(stdinLengthBuffer);
    const signalBuffer = new SharedArrayBuffer(4);
    this.signalInt32Array = new Int32Array(signalBuffer);
    const stdinBuffer = new SharedArrayBuffer(10000); // TODO: size?! -- implementation right now will start dropping data at this size, I think.
    this.stdinUint8Array = Buffer.from(stdinBuffer);
    this.buffers = {
      stdinBuffer,
      signalBuffer,
      locks: { spinLockBuffer, stdinLengthBuffer },
    };
  }

  writeToStdin(data: Buffer): void {
    log("writeToStdin", data);
    // place the new data in the stdinBuffer, so that the worker can receive
    // it when it next checks for stdin.
    data.copy(this.stdinUint8Array, this.stdinLength[0]);
    log("setting writeToStdin input buffer size to ", data.length + this.stdinLength[0]);
    Atomics.store(this.stdinLength, 0, data.length + this.stdinLength[0]);
    Atomics.notify(this.stdinLength, 0);
  }

  getExtraOptions(): Buffers {
    return this.buffers;
  }

  signal(sig: number = 2): void {
    log("signal", sig);
    if (sig != 2) {
      throw Error("only signal 2 is supported right now");
    }
    // tell other side about this signal.
    Atomics.store(this.signalInt32Array, 0, SIGINT);
    Atomics.notify(this.signalInt32Array, 0);

    if (Atomics.load(this.spinLock, 0) == 1) {
      // Blocked on the sleep timer spin lock.
      clearTimeout(this.sleepTimer);
      // manually unblock
      Atomics.store(this.spinLock, 0, 0);
      Atomics.notify(this.spinLock, 0);
    }
  }

  sleep(milliseconds: number): void {
    log("sleep", milliseconds);
    /*
    We implement sleep using atomics here.
    */
    Atomics.store(this.spinLock, 0, 1);
    Atomics.notify(this.spinLock, 0);
    this.sleepTimer = setTimeout(() => {
      Atomics.store(this.spinLock, 0, 0);
      Atomics.notify(this.spinLock, 0);
    }, milliseconds);
  }
}
