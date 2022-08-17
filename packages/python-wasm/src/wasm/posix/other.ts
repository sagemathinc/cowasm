import { notImplemented } from "./util";

export default function other({ callFunction, posix, recvString, send }) {
  function sendStatvfs(bufPtr, x) {
    callFunction(
      "set_statvfs",
      bufPtr,
      x.f_bsize,
      x.f_frsize,
      BigInt(x.f_blocks),
      BigInt(x.f_bfree),
      BigInt(x.f_bavail),
      BigInt(x.f_files),
      BigInt(x.f_ffree),
      BigInt(x.f_favail),
      x.f_fsid,
      x.f_flag,
      x.f_namemax
    );
  }

  let ctermidPtr = 0;
  return {
    login_tty: (fd: number): number => {
      if (posix.login_tty == null) {
        notImplemented("login_tty");
      }
      posix.login_tty(fd);
      return 0;
    },

    // TODO: worry about virtual filesystem that WASI provides,
    // versus this just being the straight real one?!
    // int statvfs(const char *restrict path, struct statvfs *restrict buf);
    statvfs: (pathPtr: string, bufPtr: number): number => {
      if (posix.statvfs == null) {
        notImplemented("statvfs");
      }
      const path = recvString(pathPtr);
      sendStatvfs(bufPtr, posix.statvfs(path));
      return 0;
    },

    //       int fstatvfs(int fd, struct statvfs *buf);
    fstatvfs: (fd: number, bufPtr: number): number => {
      if (posix.fstatvfs == null) {
        notImplemented("statvfs");
      }
      sendStatvfs(bufPtr, posix.fstatvfs(fd));
      return 0;
    },

    ctermid: (ptr?: number): number => {
      if (posix.ctermid == null) {
        notImplemented("ctermid");
      }
      if (ptr) {
        const s = posix.ctermid();
        send.string(s, { ptr, len: s.length + 1 });
        return ptr;
      }
      if (ctermidPtr) {
        return ctermidPtr;
      }
      const s = posix.ctermid();
      ctermidPtr = send.string(s);
      return ctermidPtr;
    },

    // password stuff -- low priority!
    getpwnam_r: (): void => {
      notImplemented("getpwnam_r");
    },
    getpwuid: (): void => {
      notImplemented("getpwnam_r");
    },
    getpwuid_r: (): void => {
      notImplemented("getpwnam_r");
    },
  };
}
