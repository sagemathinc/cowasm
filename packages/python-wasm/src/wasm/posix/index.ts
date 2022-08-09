import stat from "./stat";
import WASI from "@wapython/wasi";

interface Context {
  fs: FileSystem;
  recvString: (ptr: number) => string;
  wasi: WASI;
}

export default function posix(context: Context) {
  return stat(context);
}
