import { IOHandlerClass, Stream } from "./types";
import debug from "debug";
const log = debug("wasm:worker:io-using-atomics");

export default class IOHandler implements IOHandlerClass {
  private stdinBuffer: Buffer;
  private stdinLength: Int32Array;

  private outputBuffer: Buffer;
  private outputLength: Int32Array;

  private signalState: Int32Array;
  private sleepArray: Int32Array;

  constructor(opts) {
    log("creating ioHandler");
    if (opts.stdinLengthBuffer == null) {
      throw Error("must define stdinLengthBuffer");
    }
    if (opts.stdinBuffer == null) {
      throw Error("must define stdinBuffer");
    }
    if (opts.outputLengthBuffer == null) {
      throw Error("must define outputLengthBuffer");
    }
    if (opts.outputBuffer == null) {
      throw Error("must define outputBuffer");
    }
    if (opts.signalBuffer == null) {
      throw Error("must define signalBuffer");
    }

    this.stdinBuffer = Buffer.from(opts.stdinBuffer);
    this.stdinLength = new Int32Array(opts.stdinLengthBuffer);
    this.outputBuffer = Buffer.from(opts.outputBuffer);
    this.outputLength = new Int32Array(opts.outputLengthBuffer);
    this.signalState = new Int32Array(opts.signalBuffer);
    this.sleepArray = new Int32Array(new SharedArrayBuffer(4));
  }

  sleep(milliseconds: number) {
    log("sleep starting, milliseconds=", milliseconds);
    // wait for sleepArray[0] to change from 0, which
    // will never happen.  The only hitch is we need to periodically
    // check for signals.

    while (milliseconds > 0) {
      const t = Math.min(milliseconds, 500);
      Atomics.wait(this.sleepArray, 0, 0, t);
      milliseconds -= t;
      if (Atomics.load(this.signalState, 0)) {
        // there's a signal waiting
        // TODO: there could be signals that maybe don't interrupt sleep?
        return;
      }
    }
  }

  // NOTE: we support a milliseconds timeout, but we don't actually use it
  // anywhere (at least when I wrote this).
  getStdin(milliseconds?: number): Buffer {
    // wait to change to a positive value, i.e., some input to arrive
    const start = milliseconds != null ? new Date().valueOf() : 0;
    while (this.stdinLength[0] == 0) {
      // wait with a timeout of 1s for it to change.
      log("getStdin: waiting for some new stdin");
      Atomics.wait(this.stdinLength, 0, 0, milliseconds ?? 1000);
      if (Atomics.load(this.signalState, 0)) {
        // check for any signals
        // TODO: there could be signals that maybe don't interrupt input?
        return Buffer.from("");
      }
      if (
        milliseconds != null &&
        this.stdinLength[0] == 0 &&
        new Date().valueOf() - start > milliseconds
      ) {
        return Buffer.from("");
      }
    }
    // Now there is stdin waiting for us:  how much?
    const len = this.stdinLength[0];
    log("getStdin: have stdin, processing ", len, " bytes");
    const data = Buffer.alloc(len);
    this.stdinBuffer.copy(data, 0, 0, len);
    // Reset the buffer:
    Atomics.store(this.stdinLength, 0, 0);
    Atomics.notify(this.stdinLength, 0);
    return data;
  }

  sendOutput(stream: Stream, data: Buffer): void {
    if (log.enabled) {
      log(
        "sendOutput",
        stream,
        data,
        { len: this.outputLength[0] },
        new TextDecoder().decode(data)
      );
    }
    // place the new data in the outputBuffer, so that the main thread can receive it.
    // The format is:
    //   ....    [1|2]the actual data
    // where 1 = stdout and 2 = stderr.  Putting both stdout and stderr in the same
    // buffer means one less buffer to deal with, *and* is a very simple way to avoid
    // any issues with mixing up the ordering of output.
    while (data.length > 0) {
      this.outputBuffer[this.outputLength[0]] = Stream.STDOUT;
      const copied = data.copy(this.outputBuffer, this.outputLength[0] + 1);
      data = data.subarray(copied);
      const n = copied + this.outputLength[0] + 1;
      log("setting output buffer size to ", n);
      Atomics.store(this.outputLength, 0, n);
      Atomics.notify(this.outputLength, 0);
      if (data.length > 0) {
        // we have more to write but failed to write it all above (hence buffer full), so
        // we first wait for it to all get read out of the buffer before doing anything further.
        Atomics.wait(this.outputLength, 0, 0, 500);
      }
    }
  }

  // TODO: in general there could be more than one signal at once... of course, right now we only support sigint = 2.
  getSignalState(): number {
    const signal = Atomics.load(this.signalState, 0);
    if (signal) {
      log("signalState", this.signalState[0]);
      // clear signal state so we can get a new signal
      Atomics.store(this.signalState, 0, 0);
      // tell C program about the signal we found.
      return signal;
    }
    return 0;
  }
}
