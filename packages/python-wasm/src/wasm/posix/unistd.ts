export default function unistd({ fs, os, process, recvString, wasi }) {
  return {
    chown: (pathPtr: number, uid: number, gid: number): -1 | 0 => {
      const path = recvString(pathPtr);
      fs.chownSync(path, uid, gid);
      return 0;
    },
    lchown: (pathPtr: number, uid: number, gid: number): -1 | 0 => {
      const path = recvString(pathPtr);
      fs.lchownSync(path, uid, gid);
      return 0;
    },

    // int fchown(int fd, uid_t owner, gid_t group);
    fchown: (fd: number, uid: number, gid: number): number => {
      const entry = wasi.FD_MAP.get(fd);
      if (!entry) {
        console.warn("bad file descriptor, fchown");
        return -1;
      }
      fs.fchownSync(entry.real, uid, gid);
      return 0;
    },

    getuid: () => process.getuid?.() ?? 0,
    getgid: () => process.getgid?.() ?? 0,
    geteuid: () => process.geteuid?.() ?? 0,
    getegid: () => process.getegid?.() ?? 0,
    getpid: () => process.pid ?? 1,

    nice: (incr: number) => {
      const p = os.getPriority?.();
      if (p != null) {
        os.setPriority?.(p + incr);
      }
    },
    //     int getpriority(int which, id_t who);
    getpriority: (which: number, who: number): number => {
      if (os.getPriority == null) {
        // environ with no info about processes (e.g., browser).
        return 0;
      }
      if (which != 0) {
        console.warn(
          "getpriority can only be implemented in node.js for *process id*"
        );
        return 0; // minimal info.
      }
      return os.getPriority?.(who);
    },

    //   int setpriority(int which, id_t who, int value);
    setpriority: (which: number, who: number, value: number): number => {
      if (os.setPriority == null) {
        // environ with no info about processes (e.g., browser).
        return 0;
      }
      if (which != 0) {
        console.warn(
          "setpriority can only be implemented in node.js for *process id*"
        );
        return -1;
      }
      return os.setPriority?.(who, value);
    },

    dup: () => {
      // Considered in 2022, but closed by node developers: https://github.com/libuv/libuv/issues/3448#issuecomment-1174786218
      // TODO: maybe revisit via the wasi layer when want to have a deeper understanding of whether this is possible
      // on top of that abstraction.
      throw Error(
        "NotImplemented -- it might not be reasonable to implement file descriptor dup"
      );
    },

    dup2: () => {
      throw Error(
        "NotImplemented -- it might not be reasonable to implement file descriptor dup2"
      );
    },

    dup3: () => {
      throw Error(
        "NotImplemented -- it might not be reasonable to implement file descriptor dup3"
      );
    },

    sync: () => {
      // nodejs doesn't expose sync, but it does expose fsync for a file descriptor, so we call it on
      // all the open file descriptors
      if (fs.fsyncSync == null) return;
      for (const [_, { real }] of wasi.FD_MAP) {
        fs.fsyncSync(real);
      }
    },

    // In nodejs these set*id function can't be done in a worker thread:
    // https://nodejs.org/api/process.html#processsetgidid
    // TODO: maybe we should implement these by sending a message to
    // the main thread requesting to do them?
    setuid: () => {
      throw Error("setuid is not supported");
    },
    seteuid: () => {
      throw Error("seteuid is not supported");
    },
    setgid: () => {
      throw Error("setgid is not supported");
    },
    setsid: () => {
      throw Error("setsid is not supported");
    },
    getsid: () => {
      throw Error("getsid is not supported");
    },
    setpgid: () => {
      throw Error("setpgid is not supported");
    },
    setegid: () => {
      throw Error("setegid is not supported");
    },
    setreuid: () => {
      throw Error("setreuid is not supported");
    },
    setregid: () => {
      throw Error("setregid is not supported");
    },
    setgroups: () => {
      throw Error("setgroups is not supported");
    },
  };
}
