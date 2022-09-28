/*


NOTES:
  - emscripten/src/library_syscall.js is useful inspiration in some cases!
*/

import forkExec from './fork-exec.js';
import netdb from './netdb.js';
import netif from './netif.js';
import other from './other.js';
import sched from './sched.js';
import signal from './signal.js';
import socket from './socket.js';
import spawn from './spawn.js';
import stdlib from './stdlib.js';
import stat from './stat.js';
import time from './time.js';
import unistd from './unistd.js';
import wait from './wait.js';
import WASI from "wasi-js";
import { initConstants } from './constants.js';
import SendToWasm from '../worker/send-to-wasm.js';
import RecvFromWasm from '../worker/recv-from-wasm.js';
import constants from './constants.js';
import debug from "debug";

const logNotImplemented = debug("posix:not-implemented");
const logCall = debug("posix:call");
const logReturn = debug("posix:return");

// For some reason this code
//    import os; print(os.popen('ls').read())
// hangs when run in **linux only** under python-wasm, but not python-wasm-debug,
// except if I set any random env variable here... and then it doesn't hang.
// This is weird.
process.env.__STUPID_HACK__ = "";

interface Context {
  fs: FileSystem;
  send: SendToWasm;
  recv: RecvFromWasm;
  wasi: WASI;
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
  getcwd: () => string;
}

export default function posix(context: Context) {
  const P = {
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
    ...time(context),
    ...unistd(context),
    ...wait(context),
  };
  const Q: any = {};

  let nativeErrnoToSymbol: { [code: number]: string } = {};
  if (context.posix.constants != null) {
    for (const symbol in context.posix.constants) {
      nativeErrnoToSymbol[context.posix.constants[symbol]] = symbol;
    }
  }
  function setErrnoFromNative(nativeErrno: number) {
    // The error code comes from native posix, so we translate it to WASI first
    const symbol = nativeErrnoToSymbol[nativeErrno];
    if (symbol != null) {
      const wasiErrno = constants[symbol];
      if (wasiErrno != null) {
        context.callFunction("setErrno", wasiErrno);
        return;
      }
    }
    logNotImplemented(
      "Unable to map nativeErrno (please update code)",
      nativeErrno
    );
  }

  // It's critical to ensure the directories of the host env is the same as
  // the WASM env, if meaningful or possible.  This only matters right now
  // under node.js, but is really critical there.  Thus we wrap all posix calls
  // int his below.
  let syncdir;
  if (context.posix.chdir != null) {
    syncdir = () => {
      context.posix.chdir?.(context.getcwd());
    };
  } else {
    syncdir = () => {};
  }

  for (const name in P) {
    Q[name] = (...args) => {
      syncdir();
      try {
        logCall(name, args);
        const ret = P[name](...args);
        logReturn(name, ret);
        return ret;
      } catch (err) {
        if (err.wasiErrno != null) {
          context.callFunction("setErrno", err.wasiErrno);
        } else if (err.code != null) {
          setErrnoFromNative(parseInt(err.code));
        } else {
          // err.code not yet set (TODO), so we log and try heuristic.
          // On error, for now -1 is returned, and errno should get set to some sort of error indicator
          // TODO: how should we set errno?
          // @ts-ignore -- this is just temporary while we sort out setting errno...
          if (err.name == "NotImplementedError") {
            // ENOSYS means "Function not implemented (POSIX.1-2001)."
            context.callFunction("setErrno", constants.ENOSYS);
          } else {
            logNotImplemented(
              "Posix library raised exception without error code",
              err
            );
          }
        }
        return err.ret ?? -1;
      }
    };
  }
  Q.init = () => {
    initConstants(context);
  };
  return Q;
}
