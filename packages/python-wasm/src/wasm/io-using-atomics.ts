import type { IOProvider } from "./types";

export default class IOProviderUsingAtomics implements IOProvider {
  
  protected signal(sig: number = 2) {
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

  protected sleep(milliseconds: number) {
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
    return;
  }

  protected async waitForStdin(): Promise<void> {
    // while this.waitingForStdin is true, stdinLock[0]
    // should be -1 unless something is very wrong.
    if (this.waitingForStdin && this.stdinLock[0] == -1) return;
    try {
      this.waitingForStdin = true;
      Atomics.store(this.stdinLock, 0, -1);
      Atomics.notify(this.stdinLock, 0);

      this.log?.("waitForStdin");
      const data = await this.getStdin();
      this.log?.("got data", JSON.stringify(data));

      data.copy(Buffer.from(this.stdinSharedBuffer));
      Atomics.store(this.stdinLock, 0, data.length);
      Atomics.notify(this.stdinLock, 0);
    } finally {
      this.waitingForStdin = false;
    }
  }

}
