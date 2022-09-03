import type { IOProvider } from "./types";
import { SIGINT } from "./constants";
import debug from "debug";
const log = debug("io-provider");

interface Buffers {
  stdinBuffer: SharedArrayBuffer;
  signalBuffer: SharedArrayBuffer;
  locks: {
    spinLockBuffer: SharedArrayBuffer;
    stdinLockBuffer: SharedArrayBuffer;
  };
}

interface Options {
  getStdinAsync: () => Promise<Buffer>;
}

export default class IOProviderUsingXMLHttpRequest implements IOProvider {
  private spinLock: Int32Array;
  private stdinLock: Int32Array;
  private signalInt32Array: Int32Array;
  private stdinSharedBuffer: SharedArrayBuffer;
  private sleepTimer: any;
  private waitingForStdin: boolean = false;
  private buffers: Buffers;
  private getStdinAsync: () => Promise<Buffer>;

  constructor(options: Options) {
    log("IOProviderUsingXMLHttpRequest");
    this.getStdinAsync = options.getStdinAsync;
    const spinLockBuffer = new SharedArrayBuffer(4);
    this.spinLock = new Int32Array(spinLockBuffer);
    const stdinLockBuffer = new SharedArrayBuffer(4);
    this.stdinLock = new Int32Array(stdinLockBuffer);
    const signalBuffer = new SharedArrayBuffer(4);
    this.signalInt32Array = new Int32Array(signalBuffer);
    this.stdinSharedBuffer = new SharedArrayBuffer(10000); // TODO: size?!
    this.buffers = {
      stdinBuffer: this.stdinSharedBuffer,
      signalBuffer,
      locks: { spinLockBuffer, stdinLockBuffer },
    };
  }

  getExtraOptions(): Buffers {
    return this.buffers;
  }

  signal(sig: number = 2): void {
    log("signal", sig);
    if (sig != 2) {
      throw Error("only signal 2 is supported right now");
    }
    if (Atomics.load(this.stdinLock, 0) == -1) {
      // TODO: blocked on stdin lock -- not sure how to deal with this yet.
      // Python normally would discard the input buffer and deal
      // with signals.  For some reason our readline isn't dealing
      // with signals.  Maybe it has to be made aware somehow.
      // For now, best we can do is nothing.
      return;
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
    We implement sleep using atomics. There is an alternative trick
    using XMLHttpRequest explained here
           https://jasonformat.com/javascript-sleep/
    that we should also investigate in cases when maybe we don't
    want to use atomics.  See also
       https://stackoverflow.com/questions/10590213/synchronously-wait-for-message-in-web-worker
    */
    Atomics.store(this.spinLock, 0, 1);
    Atomics.notify(this.spinLock, 0);
    this.sleepTimer = setTimeout(() => {
      Atomics.store(this.spinLock, 0, 0);
      Atomics.notify(this.spinLock, 0);
    }, milliseconds);
  }

  private async _getStdin(): Promise<void> {
    log("getStdin: waiting...");
    try {
      this.waitingForStdin = true;
      Atomics.store(this.stdinLock, 0, -1);
      Atomics.notify(this.stdinLock, 0);

      const data = await this.getStdinAsync();
      log("got data", data);

      data.copy(Buffer.from(this.stdinSharedBuffer));
      Atomics.store(this.stdinLock, 0, data.length);
      Atomics.notify(this.stdinLock, 0);
    } catch (err) {
      // not much to do -- no way to report problem.
      log("failed to get data", err);
    } finally {
      this.waitingForStdin = false;
    }
  }

  getStdin(): void {
    // while this.waitingForStdin is true, stdinLock[0]
    // should be -1 unless something is very wrong.
    if (this.waitingForStdin && this.stdinLock[0] == -1) {
      log("getStdin: already waiting");
      return;
    }
    this._getStdin();
  }

  //   isWaitingForStdin(): boolean {
  //     return this.waitingForStdin;
  //   }
}
