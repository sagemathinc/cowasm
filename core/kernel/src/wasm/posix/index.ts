/*

NOTES:
  - emscripten/src/library_syscall.js is useful inspiration in some cases!
*/

import forkExec from "./fork-exec";
import epoll from "./epoll";
import netdb from "./netdb";
import netif from "./netif";
import other from "./other";
import sched from "./sched";
import signal from "./signal";
import socket from "./socket";
import spawn from "./spawn";
import stdlib from "./stdlib";
import stdio from "./stdio";
import stat from "./stat";
import termios from "./termios";
import time from "./time";
import unistd from "./unistd";
import wait from "./wait";
import WASI from "wasi-js";
import { initConstants } from "./constants";
import SendToWasm from "../worker/send-to-wasm";
import RecvFromWasm from "../worker/recv-from-wasm";
import constants from "./constants";
import debug from "debug";

const logNotImplemented = debug("posix:not-implemented");
const logCall = debug("posix:call");
const logReturn = debug("posix:return");
const logError = debug("posix:error");

// For some reason this code
//    import os; print(os.popen('ls').read())
// hangs when run in **linux only** under python-wasm, but not python-wasm-debug,
// except if I set any random env variable here... and then it doesn't hang.
// This is weird.
process.env.__STUPID_HACK__ = "";

export interface Context {
  // IMPORTANT: All of the functionality that implements this and has persistent state,
  // *must* store its state in this state object in such a way that the state object can
  // be swapped out between calls.  There's lot of code that does this by always referring
  // to context.state and not capturing state itself directly.  Messing this up
  // can lead to segfaults when running webassembly subprocesses.  You *can* initialize
  // this state once at the top of the implementation though, since it is deep copied
  // before exec, rather than reset (in posix-context.ts).
  state: { [name: string]: any };
  fs: FileSystem;
  send: SendToWasm;
  recv: RecvFromWasm;
  wasi: WASI;
  run: (args: string[]) => number;
  process: {
    getpid?: () => number;
    getuid?: () => number;
    pid?: number;
    cwd?: () => string;
  };
  os: {
    loadavg?: () => [number, number, number];
    getPriority?: (pid?: number) => number;
    setPriority?: (pid: number, priority?: number) => void;
    platform?: () => // we care about darwin/linux/win32 for our runtime.
    "darwin" | "linux" | "win32" | "aix" | "freebsd" | "openbsd" | "sunos";
  };
  child_process: {
    spawnSync?: (command: string) => number;
  };
  native_fs?: FileSystem;
  // The WASM memory (so we can make sense of pointers efficiently).
  memory: WebAssembly.Memory;
  // Optional module that gets installed on Mac/Linux, but obviously not windows
  // for which posix doesn't make sense.
  posix: {
    getpgid?: () => number;
    constants?: { [code: string]: number };
    chdir?: (string) => void;
    // TODO...
  };
  free: (ptr: number) => void;
  callFunction: (name: string, ...args) => number | undefined;
  callWithString: (
    func: string | { name: string; dll: string } | Function,
    str?: string | string[],
    ...args
  ) => number | undefined;
  getcwd: () => string;
  sleep?: (milliseconds: number) => void;
  noStdio: boolean;
}

// It might in theory be  better if we used typescript to say exactly which functions
// are defined. That said, it's not like the WASM side cares about typescript.
export type PosixEnv = { [name: string]: Function };

export default function posix(context: Context): PosixEnv {
  const P = {
    ...epoll(context),
    ...forkExec(context),
    ...netdb(context),
    ...netif(context),
    ...other(context),
    ...sched(context),
    ...signal(context),
    ...socket(context),
    ...spawn(context),
    ...stat(context),
    ...stdlib(context),
    ...stdio(context),
    ...time(context),
    ...termios(context),
    ...unistd(context),
    ...wait(context),
  };
  const Q: any = {};

  let nativeErrnoToSymbol: { [code: number]: string } = {};
  function initNativeErrnoToSymbol(): void {
    nativeErrnoToSymbol = {};
    if (context.posix.constants != null) {
      for (const symbol in context.posix.constants) {
        // The native constants object also contains address families, socket
        // flags, terminal flags, and many other values that overlap errno
        // numerically.  Only build this reverse lookup from constants that are
        // also errno symbols in the initialized WASM runtime.
        if (symbol.startsWith("E") && constants[symbol] != null) {
          nativeErrnoToSymbol[context.posix.constants[symbol]] = symbol;
        }
      }
    }
  }
  initNativeErrnoToSymbol();
  function setErrnoFromNative(
    nativeError: number | string,
    name: string,
    args
  ): void {
    // Native Node addons set Error.code through napi_throw_error, whose code
    // argument is always a string.  Accept their decimal errno strings as the
    // native numbers they represent while preserving symbolic Node codes such
    // as ENOENT.
    if (
      typeof nativeError == "string" &&
      /^-?\d+$/.test(nativeError.trim())
    ) {
      nativeError = Number(nativeError);
    }
    if (
      typeof nativeError == "number" &&
      (nativeError == 0 || isNaN(nativeError))
    ) {
      // TODO: could put a log or something in that name raised error with no code.
      context.callFunction("setErrno", nativeError);
      return;
    }
    // Node filesystem errors already use symbols such as ENOENT, while native
    // posix bindings report platform-specific numeric errno values.
    const symbol =
      typeof nativeError == "string"
        ? nativeError
        : nativeErrnoToSymbol[nativeError];
    if (symbol != null) {
      const wasiErrno = constants[symbol];
      if (wasiErrno != null) {
        if (logError.enabled) {
          logError({ name, nativeError, wasiErrno, symbol, args });
        }
        context.callFunction("setErrno", wasiErrno);
        return;
      }
    }

    const mesg =
      symbol != null
        ? `WARNING in posix '${name}': Unable to map native error ${nativeError}: add ${symbol} to WASM posix constants in @cowasm/kernel`
        : `WARNING in posix '${name}': Unable to map native error ${nativeError}: add its symbol to the posix-node package`;
    console.warn(mesg);
    logNotImplemented(mesg);
  }

  // It's critical to ensure the directories of the host env is the same as
  // the WASM env, if meaningful or possible.  This only matters right now
  // under node.js, but is really critical there.  Thus we wrap *all* posix calls
  // in this syncdir below.
  //    TODO: optimize.  This seems dangerously expensive.
  let syncdir: () => string | undefined;
  if (context.posix.chdir != null) {
    syncdir = () => {
      let hostCwd: string | undefined;
      // TODO: it is expected that this may fail, e.g., if we are using a sandbox filesystem
      // deal with this in a better way.
      try {
        hostCwd = context.process.cwd?.();
        context.posix.chdir?.(context.getcwd());
      } catch (_err) {}
      return hostCwd;
    };
  } else {
    syncdir = () => undefined;
  }

  for (const name in P) {
    Q[name] = (...args) => {
      const hostCwd = syncdir();
      try {
        logCall(name, args);
        const ret = P[name](...args);
        logReturn(name, ret);
        return ret;
      } catch (err) {
        if (err?.cowasmProcessExit) {
          throw err;
        }
        logError(name, err);
        if (err.wasiErrno != null) {
          context.callFunction("setErrno", err.wasiErrno);
        } else if (err.code != null) {
          setErrnoFromNative(err.code, name, args);
        } else {
          // err.code not yet set (TODO), so we log and try heuristic.
          // On error, for now -1 is returned, and errno should get set to some sort of error indicator
          // TODO: how should we set errno?
          // @ts-ignore -- this is just temporary while we sort out setting errno...
          if (err.name == "NotImplementedError") {
            // ENOSYS means "Function not implemented (POSIX.1-2001)."
            context.callFunction("setErrno", constants.ENOSYS);
          } else {
            console.trace(
              `WARNING: Posix library call to ${name} raised exception without error code.  The raised error is '${err}'`
            );
            logNotImplemented(
              `Posix call to ${name} raised exception without error code`,
              err
            );
          }
        }
        return err.ret ?? -1;
      } finally {
        // Native relative-path calls need the WASM cwd, but chdir is global to
        // the Node process (and all of its worker threads). Never leave the
        // embedding application in the guest directory after the call.
        if (hostCwd != null) {
          try {
            context.posix.chdir?.(hostCwd);
          } catch (_err) {}
        }
      }
    };
  }
  Q.init = () => {
    initConstants(context);
    initNativeErrnoToSymbol();
  };
  return Q;
}
