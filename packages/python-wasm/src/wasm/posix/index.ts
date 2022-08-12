/*


NOTES:
  - emscripten/src/library_syscall.js is useful inspiration in some cases!
*/

import signal from "./signal";
import spawn from "./spawn";
import stdlib from "./stdlib";
import stat from "./stat";
import time from "./time";
import unistd from "./unistd";
import wait from "./wait";
import WASI from "@wapython/wasi";

//import debug from "debug";
//const log = debug("posix");

interface Context {
  fs: FileSystem;
  recvString: (ptr: number) => string;
  sendString: (s: string) => number; // returns a malloc'd pointer!
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
}

export default function posix(context: Context) {
  const P = {
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
        return P[name](...args);
      } catch (err) {
        // On error, for now -1 is returned, and errno should get set to some sort of error indicator
        // TODO: how should we set errno?
        // @ts-ignore -- this is just temporary while we sort out setting errno...
        context.fs.writeFileSync(2, `\n${err}\n`);
        return -1;
      }
    };
  }
  return Q;
}
