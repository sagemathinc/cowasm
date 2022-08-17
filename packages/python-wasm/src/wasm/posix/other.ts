import { notImplemented } from "./util";

export default function other({ callFunction, posix, recvString, sendString }) {
  let ctermidPtr = 0;
  return {
    login_tty: (fd: number): number => {
      if (posix.login_tty == null) {
        notImplemented("login_tty");
      }
      posix.login_tty(fd);
      return 0;
    },

    // int statvfs(const char *restrict path, struct statvfs *restrict buf);
    statvfs: (pathPtr: string, bufPtr) => {
      if (posix.statvfs == null) {
        notImplemented("statvfs");
      }
      const path = recvString(pathPtr);
      const x = posix.statvfs(path);
      console.log(x);
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
    },

    //       int fstatvfs(int fd, struct statvfs *buf);
    fstatvfs: (_fd: number) => {
      // also weird
      notImplemented("fstatvfs");
    },

    ctermid: (ptr?: number): number => {
      if (posix.ctermid == null) {
        notImplemented("ctermid");
      }
      if (ptr) {
        const s = posix.ctermid();
        sendString(s, { ptr, len: s.length + 1 });
        return ptr;
      }
      if (ctermidPtr) {
        return ctermidPtr;
      }
      const s = posix.ctermid();
      ctermidPtr = sendString(s);
      return ctermidPtr;
    },
  };
}
