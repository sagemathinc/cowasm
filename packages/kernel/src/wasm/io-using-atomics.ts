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
  stdinLengthBuffer: SharedArrayBuffer;
  stdoutBuffer: SharedArrayBuffer;
  stdoutLengthBuffer: SharedArrayBuffer;
  signalBuffer: SharedArrayBuffer;
}

export default class IOProviderUsingAtomics implements IOProvider {
  private stdinLength: Int32Array;
  private stdinUint8Array: Uint8Array;

  private stdoutLength: Int32Array;
  private stdoutUint8Array: Uint8Array;

  private signalInt32Array: Int32Array;
  private buffers: Buffers;

  constructor() {
    log("IOProviderUsingAtomics");
    const stdinLengthBuffer = new SharedArrayBuffer(4);
    this.stdinLength = new Int32Array(stdinLengthBuffer);
    // TODO: size?! -- implementation right now will start dropping data at this size, I think.
    const stdinBuffer = new SharedArrayBuffer(10000);
    this.stdinUint8Array = Buffer.from(stdinBuffer);

    const stdoutLengthBuffer = new SharedArrayBuffer(4);
    this.stdoutLength = new Int32Array(stdoutLengthBuffer);
    const stdoutBuffer = new SharedArrayBuffer(10000);
    this.stdoutUint8Array = Buffer.from(stdoutBuffer);

    const signalBuffer = new SharedArrayBuffer(4);
    this.signalInt32Array = new Int32Array(signalBuffer);
    this.buffers = {
      stdinBuffer,
      stdinLengthBuffer,
      stdoutBuffer,
      stdoutLengthBuffer,
      signalBuffer,
    };
  }

  writeToStdin(data: Buffer): void {
    log("writeToStdin", data);
    // place the new data in the stdinBuffer, so that the worker can receive
    // it when it next checks for stdin.
    data.copy(this.stdinUint8Array, this.stdinLength[0]);
    log(
      "setting writeToStdin input buffer size to ",
      data.length + this.stdinLength[0]
    );
    Atomics.store(this.stdinLength, 0, data.length + this.stdinLength[0]);
    Atomics.notify(this.stdinLength, 0);
  }

  readStdout(): Buffer {
    const n = this.stdoutLength[0];
    if (n == 0) {
      return Buffer.alloc(0);
    }
    const data = new Buffer(
      this.stdoutUint8Array.subarray(0, this.stdoutLength[0])
    );
    Atomics.store(this.stdoutLength, 0, 0);
    Atomics.notify(this.stdoutLength, 0);
    return data;
  }

  getExtraOptions(): Buffers {
    return this.buffers;
  }

  signal(sig: number = SIGINT): void {
    log("signal", sig);
    // tell worker about this signal.
    Atomics.store(this.signalInt32Array, 0, sig);
    Atomics.notify(this.signalInt32Array, 0);
  }
}
