export default function unistd({
  fs,
  os,
  process,
  recvString,
  sendString,
  wasi,
  posix,
  memory,
}) {
  let login: number | undefined = undefined;

  const unistd = {
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

    // int getgroups(int gidsetsize, gid_t grouplist[]);
    // in WASI, "typedef unsigned gid_t"
    getgroups: (gidsetsize, grouplistPtr): number => {
      const groups = process.getgroups?.();
      if (groups == null) {
        return 0; // no groups
      }
      if (gidsetsize == 0) {
        // yep, we end up computing getgroups twice, since the
        // posix api is a bit awkward...
        return groups.length;
      }
      const count = Math.min(groups.length, gidsetsize);
      if (count == 0) {
        return 0;
      }
      const view = new DataView(memory.buffer);
      for (let i = 0; i < count; i++) {
        view.setUint32(grouplistPtr + 4 * i, groups[i], true);
      }
      return count;
    },

    getpid: () => process.pid ?? 1,

    getpgid: (pid: number): number => {
      return posix.getpgid?.(pid) ?? 1;
    },

    // int setpgid(pid_t pid, pid_t pgid);
    setpgid: (pid: number, pgid: number): number => {
      if (posix.setpgid == null) {
        throw Error("setpgid is not supported on this platform");
      }
      posix.setpgid(pid, pgid);
      return 0; // success
    },

    getpgrp: (): number => {
      return posix.getpgrp?.() ?? 1;
    },

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
    // the main thread requesting to do them?  For now, you'll get
    // an error unless you run in a mode without a worker thread.
    setuid: () => {
      throw Error("setuid is not supported");
    },
    seteuid: (uid: number) => {
      if (posix.seteuid == null) {
        throw Error("seteuid is not supported on this platform");
      }
      posix.seteuid(uid);
      return 0;
    },
    setegid: (gid: number) => {
      if (posix.setegid == null) {
        throw Error("setegid is not supported on this platform");
      }
      posix.setegid(gid);
      return 0;
    },
    setgid: (gid: number) => {
      if (process.setgid == null) {
        throw Error("setgid is not supported");
      }
      process.setgid(gid);
      return 0;
    },
    setsid: (sid) => {
      if (posix.setsid == null) {
        throw Error("setsid is not supported on this platform");
      }
      return posix.setsid(sid);
    },
    getsid: () => {
      throw Error("getsid is not supported");
    },
    setreuid: (uid) => {
      if (posix.setreuid == null) {
        throw Error("setreuid is not supported on this platform");
      }
      posix.setreuid(uid);
      return 0;
    },
    setregid: (gid) => {
      if (posix.setregid == null) {
        throw Error("setregid is not supported on this platform");
      }
      posix.setregid(gid);
      return 0;
    },
    getppid: () => {
      if (posix.getppid == null) {
        // in browser right now there is only one process id:
        return unistd.getpid();
      }
      return posix.getppid();
    },
    setgroups: () => {
      throw Error("setgroups is not supported");
    },
    setpgrp: () => {
      throw Error("setpgrp is not supported");
    },
    tcgetpgrp: () => {
      throw Error("tcgetpgrp is not supported");
    },
    tcsetpgrp: () => {
      throw Error("tcsetpgrp is not supported");
    },
    fork: () => {
      throw Error("fork is not supported");
    },
    fork1: () => {
      throw Error("fork1 is not supported");
    },
    forkpty: () => {
      throw Error("forkpty is not supported");
    },
    getlogin: (): number => {
      if (login != null) return login;
      // returns the username of the signed in user; if not available, e.g.,
      // in a browser, returns "user".
      const username = os.userInfo?.()?.username ?? "user";
      login = sendString(username);
      if (login == null) throw Error("bug");
      return login;
    },

    // int gethostname(char *name, size_t len);
    gethostname: (namePtr: number, len: number): number => {
      if (os.hostname == null) {
        throw Error("gethostname not supported on this platform");
      }
      const name = os.hostname();
      sendString(name, { ptr: namePtr, len });
      return 0;
    },

    // int sethostname(const char *name, size_t len);
    sethostname: (namePtr: number, len: number): number => {
      if (posix.sethostname == null) {
        throw Error("sethostname not supported on this platform");
      }
      const name = recvString(namePtr, len);
      posix.sethostname(name);
      return 0;
    },

    // char *ttyname(int fd);
    // int ttyname_r(int fd, char *buf, size_t buflen);
    ttyname_r: (fd: number, ptr: number, len: number): number => {
      if (posix.ttyname == null) {
        throw Error("ttyname_r is not supported on this platform");
      }
      sendString(posix.ttyname(fd), { ptr, len });
      return 0;
    },

    alarm: (seconds: number): number => {
      if (posix.alarm == null) {
        throw Error("alarm is not supported on this platform");
      }
      return posix.alarm(seconds);
    },
  };

  return unistd;
}
