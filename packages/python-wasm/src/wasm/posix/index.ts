/*


NOTES:
  - emscripten/src/library_syscall.js is useful inspiration in some cases!
*/

import netdb from "./netdb";
import other from "./other";
import sched from "./sched";
import signal from "./signal";
import spawn from "./spawn";
import stdlib from "./stdlib";
import stat from "./stat";
import time from "./time";
import unistd from "./unistd";
import wait from "./wait";
import WASI from "@wapython/wasi";
import { initConstants } from "./constants";
import SendToWasm from "../worker/send-to-wasm";
import RecvFromWasm from "../worker/recv-from-wasm";
import constants from "./constants";
import debug from "debug";

const logNotImplemented = debug("posix:not-implemented");
const logCall = debug("posix:call");
const logReturn = debug("posix:return");

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
  };
  free: (ptr: number) => void;
  callFunction: (name: string, ...args) => number | undefined;
}

export default function posix(context: Context) {
  const P = {
    ...netdb(context),
    ...other(context),
    ...sched(context),
    ...signal(context),
    ...stat(context),
    ...stdlib(context),
    ...unistd(context),
    ...time(context),
    ...wait(context),
    ...spawn(context),
  };
  const Q: any = {};
  for (const name in P) {
    Q[name] = (...args) => {
      try {
        logCall(name, args);
        const ret = P[name](...args);
        logReturn(ret);
        return ret;
      } catch (err) {
        // On error, for now -1 is returned, and errno should get set to some sort of error indicator
        // TODO: how should we set errno?
        // @ts-ignore -- this is just temporary while we sort out setting errno...
        logNotImplemented(err);
        if (err.name == "NotImplementedError") {
          // ENOSYS means "Function not implemented (POSIX.1-2001)."
          context.callFunction("setErrno", constants.ENOSYS);
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
