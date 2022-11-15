import { notImplemented } from "./util";

export default function other(context) {
  const { callFunction, posix, recv, send, wasi } = context;

  context.state.user_from_uid_cache = {};

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

  function real_fd(virtual_fd: number): number {
    const data = wasi.FD_MAP.get(virtual_fd);
    if (data == null) {
      return -1;
    }
    return data.real;
  }

  const lib = {
    syslog: () => {
      notImplemented("syslog");
    },
    login_tty: (fd: number): number => {
      if (posix.login_tty == null) {
        notImplemented("login_tty");
      }
      posix.login_tty(real_fd(fd));
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
        notImplemented("fstatvfs");
      }
      sendStatvfs(bufPtr, posix.fstatvfs(real_fd(fd)));
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
      if (context.state.ctermidPtr) {
        return context.state.ctermidPtr;
      }
      const s = posix.ctermid();
      return (context.state.ctermidPtr = send.string(s));
    },

    // password stuff
    // int getpwnam_r(const char *name, struct passwd *pwd, char *buffer, size_t bufsize, struct passwd **result);
    getpwnam_r: (
      _namePtr: number,
      _passwdPtr: number,
      _bufferPtr: number,
      _bufsize: number,
      result_ptr_ptr: number
    ): number => {
      // this means "not found".
      send.pointer(result_ptr_ptr, 0);
      return 0;
    },

    // struct passwd *getpwuid(uid_t uid);
    getpwuid: () => {
      // not found
      return 0;
    },

    // int getpwuid_r(uid_t uid, struct passwd *pwd, char *buffer,
    // size_t bufsize, struct passwd **result);
    getpwuid_r: (
      _uid: number,
      _passwdPtr: number,
      _bufferPtr: number,
      _bufsize: number,
      result_ptr_ptr: number
    ): number => {
      send.pointer(result_ptr_ptr, 0);
      return 0;
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

    openlog: () => {
      notImplemented("openlog");
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
      // cache the pointers for speed and to reduce memory leaks
      if (context.state.user_from_uid_cache[uid]) {
        return context.state.user_from_uid_cache[uid];
      }
      return (context.state.user_from_uid_cache[uid] = send.string(`${uid}`));
    },
    group_from_gid: (gid: number, nogroup: number = 0): number => {
      return lib.user_from_uid(gid, nogroup);
    },

    // TODO -- see how this is used in code, or maybe make it
    // do something like "#define getrusage(A,B) memset(B,0,sizeof(*B))"
    // to make everything 0, as a stub.
    //  int getrusage(int who, struct rusage *r_usage);
    getrusage: (_who: number, _r_usage_ptr: number): number => {
      notImplemented("getrusage");
      return 0;
    },

    // C++ stuff we don't support:
    _Znwm: () => {
      // operator new
      notImplemented("_Znwm");
    },
    _ZdlPv: () => {
      // operator delete
      notImplemented("_ZdlPv");
    },
    __cxa_throw: () => {
      notImplemented("__cxa_throw");
    },
    // exception
    __cxa_allocate_exception: () => {
      notImplemented("__cxa_allocate_exception");
    },
    _ZNSt20bad_array_new_lengthC1Ev: () => {
      notImplemented("_ZNSt20bad_array_new_lengthC1Ev");
    },
    _ZNSt20bad_array_new_lengthD1Ev: () => {
      notImplemented("_ZNSt20bad_array_new_lengthD1Ev");
    },
    _ZTISt20bad_array_new_length: () => {
      notImplemented("_ZTISt20bad_array_new_length");
    },
  };

  return lib;
}
