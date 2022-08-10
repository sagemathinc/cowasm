import signal from "./signal";
import stdlib from "./stdlib";
import stat from "./stat";
import unistd from "./unistd";
import WASI from "@wapython/wasi";

interface Context {
  fs: FileSystem;
  recvString: (ptr: number) => string;
  wasi: WASI;
  process: {
    getpid?: () => number;
    getuid?: () => number;
    pid?: number;
  };
  os: {
    getPriority?: (pid?: number) => number;
    setPriority?: (pid: number, priority?: number) => void;
  };
  child_process: {
    spawnSync?: (command: string) => number;
  };
}

export default function posix(context: Context) {
  const P = {
    ...signal(context),
    ...stat(context),
    ...stdlib(context),
    ...unistd(context),
  };
  const Q: any = {};
  for (const name in P) {
    Q[name] = (...args) => {
      try {
        return P[name](...args);
      } catch (err) {
        // On error, for now -1 is returned, and errno should get set to some sort of error indicator
        // TODO: how should we set errno?
        console.warn(err);
        return -1;
      }
    };
  }
  return Q;
}
