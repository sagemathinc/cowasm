import { notImplemented } from "./util";
//import debug from "debug";
//const log = debug("posix:other");

export default function other({ callFunction, posix, recv, send }) {
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
  // cache the pointers for speed and to reduce memory leaks
  const user_from_uid_cache: { [uid: number]: number } = {};

  const lib = {
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
      const path = recv.string(pathPtr);
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
    getpwnam_r: () => {
      notImplemented("getpwnam_r");
    },
    getpwuid: () => {
      notImplemented("getpwnam_r");
    },
    getpwuid_r: () => {
      notImplemented("getpwnam_r");
    },

    openpty: () => {
      // TOOD: plan to do this inspired by https://github.com/microsoft/node-pty, either
      // using that or just a little inspired by it to add to posix-node.
      notImplemented("openpty");
    },

    msync: () => {
      // This is part of mmap.
      notImplemented("msync");
    },

    madvise: () => {
      notImplemented("madvise");
    },

    mremap: () => {
      notImplemented("mremap");
    },

    // The curses cpython module wants this:
    // FILE *tmpfile(void);
    /* ~/test/tmpfile$ more a.c
    #include<stdio.h>
    int main() {
       FILE* f = tmpfile();
       printf("f = %p\n", f);
    }
    ~/test/tmpfile$ zig cc -target wasm32-wasi ./a.c
    ./a.c:3:14: warning: 'tmpfile' is deprecated: tmpfile is not defined on WASI [-Wdeprecated-declarations]
    */
    tmpfile: () => {
      notImplemented("tmpfile");
    },

    // curses also wants this:
    // int tcflush(int fildes, int action);
    tcflush: () => {
      notImplemented("tcflush");
    },

    // struct passwd *getpwnam(const char *login);
    getpwnam: () => {
      console.log("STUB: getpwnam");
      // return 0 indicates failure
      return 0;
    },

    // int getrlimit(int resource, struct rlimit *rlp);
    getrlimit: () => {
      notImplemented("getrlimit");
    },

    //  int setrlimit(int resource, const struct rlimit *rlp);
    setrlimit: () => {
      notImplemented("setrlimit");
    },

    // numpy wants this thing that can't exist in wasm:
    // int backtrace(void** array, int size);
    // Commenting this out and instead patching numpy to not try to use this, since we
    // have to do that anyways to get it to build with clang15.
    //     backtrace: () => {
    //       notImplemented("backgrace");
    //     },

    // These are for coreutils, and we come up with a WebAssembly version,
    // which is the documented fallback.
    //     char * user_from_uid(uid_t uid, int nouser);
    //     char * group_from_gid(gid_t gid, int nogroup);
    // TODO: for speed this would be better at the C level.
    user_from_uid: (uid: number, nouser: number = 0): number => {
      if (nouser) {
        return 0;
      }
      if (user_from_uid_cache[uid]) return user_from_uid_cache[uid];
      const ptr = send.string(`${uid}`);
      user_from_uid_cache[uid] = ptr;
      return ptr;
    },
    group_from_gid: (gid: number, nogroup: number = 0): number => {
      return lib.user_from_uid(gid, nogroup);
    },
  };

  return lib;
}
