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
    getPriority?: () => number;
    setPriority?: (number) => void;
  };
}

export default function posix(context: Context) {
  return { ...stat(context), ...unistd(context) };
}
