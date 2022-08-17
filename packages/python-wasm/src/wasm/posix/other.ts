import { notImplemented } from "./util";

export default function other({ posix }) {
  return {
    login_tty: (fd: number): number => {
      if (posix.login_tty == null) {
        notImplemented("login_tty");
      }
      posix.login_tty(fd);
      return 0;
    },

    statvfs: (_path: string) => {
      // this is VERY weird, since it gets stubbed if I don't put it here,
      // but somehow the real function is available to cpython.  This must
      // involve some subtle issue with the wasi module.
      notImplemented("statvfs");
    },
    fstatvfs: (_fd: number) => {
      // also weird
      notImplemented("fstatvfs");
    },
  };
}
