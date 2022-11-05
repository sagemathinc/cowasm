/*
Buffered output.

I wrote this, but then just realized this is an IMPOSSIBLE approach
for WASM because WASM has total blocking control, so timeouts
aren't possible... but a timeout is needed in order to do buffered
output, since otherwise you will never send the last few characters
until new output is sent.   I'm going to commit this, then maybe
delete it and rewrite to use a different approach.
*/

import debug from "debug";
const log = debug("wasm:buffered-output");

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

class BufferedOutput {
  private sendOutput: (data: Buffer) => void;
  private maxWaitMs: number;
  private lastSend: number = 0;
  private buffer: Buffer;
  private length: number = 0;

  constructor(
    sendOutput: (data: Buffer) => void,
    maxWaitMs: number = 100,
    size: number = 100
  ) {
    this.sendOutput = sendOutput;
    this.maxWaitMs = maxWaitMs;
    this.buffer = Buffer.alloc(size);
    this.send = this.send.bind(this);
    this.recv = this.recv.bind(this);
  }

  async send(force: boolean = false) {
    log("send: force=", force);
    if (this.length == 0) return;
    const now = new Date().valueOf();
    if (
      force ||
      this.length >= this.buffer.length ||
      now - this.lastSend > this.maxWaitMs
    ) {
      log("sending");
      this.sendOutput(this.buffer.subarray(0, this.length));
      this.lastSend = now;
      this.length = 0;
    } else {
      log("delaying...", this.maxWaitMs + 10);
      await delay(this.maxWaitMs - (now - this.lastSend) + 1);
      this.send(true);
    }
  }

  recv(data: Buffer) {
    if (data.length + this.length >= this.buffer.length) {
      // it will fill or exceed buffer, so just empty buffer
      // and send everything now.  This isn't optimal, but it is
      // easy to write.
      this.send(true);
      this.sendOutput(data);
    } else {
      const bytes = data.copy(this.buffer, this.length);
      this.length += bytes;
      this.send();
    }
  }
}

export default function bufferedOutput(
  sendOutput: (data: Buffer) => void,
  maxWaitMs: number = 100,
  size: number = 100
) {
  const b = new BufferedOutput(sendOutput, maxWaitMs, size);
  return b.recv;
}
