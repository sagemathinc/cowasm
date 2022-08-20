import { notImplemented } from "./util";
import constants from "./constants";

export default function unistd({
  fs,
  os,
  process,
  recv,
  send,
  wasi,
  posix,
  memory,
}) {
  let login: number | undefined = undefined;

  // TODO: this doesn't throw an error yet if the target filesystem isn't native.
  function toNativeFd(fd: number): number {
    // OBVIOUSLY -- these  functions won't work if the target
    // is in a wasi memfs, since the host posix libc knows nothing about that.
    // We do translate file descriptors at least.
    // Do we need to check and throw an error if target path isn't native?
    // Of course, that will happen anyways since the syscall will immediately
    // reject the invalid file descriptor anyways.
    const x = wasi.FD_MAP.get(fd);
    if (x == null) {
      throw Error("invalid file descriptor");
    }
    return x.real;
  }

  const unistd = {
    chown: (pathPtr: number, uid: number, gid: number): -1 | 0 => {
      const path = recv.string(pathPtr);
      fs.chownSync(path, uid, gid);
      return 0;
    },
    lchown: (pathPtr: number, uid: number, gid: number): -1 | 0 => {
      const path = recv.string(pathPtr);
      fs.lchownSync(path, uid, gid);
      return 0;
    },

    // int fchown(int fd, uid_t owner, gid_t group);
    fchown: (fd: number, uid: number, gid: number): number => {
      fs.fchownSync(toNativeFd(fd), uid, gid);
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
        notImplemented("setpgid");
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
      // on top of that abstraction, and of course emscripten does this (?)
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
        notImplemented("seteuid");
      }
      posix.seteuid(uid);
      return 0;
    },
    setegid: (gid: number) => {
      if (posix.setegid == null) {
        notImplemented("setegid");
      }
      posix.setegid(gid);
      return 0;
    },
    setgid: (gid: number) => {
      if (process.setgid == null) {
        notImplemented("setgid");
      }
      process.setgid(gid);
      return 0;
    },
    setsid: (sid) => {
      if (posix.setsid == null) {
        notImplemented("setsid");
      }
      return posix.setsid(sid);
    },
    // TODO!
    getsid: () => {
      notImplemented("getsid");
    },

    setreuid: (uid) => {
      if (posix.setreuid == null) {
        notImplemented("setreuid");
      }
      posix.setreuid(uid);
      return 0;
    },
    setregid: (gid) => {
      if (posix.setregid == null) {
        notImplemented("setregid");
      }
      posix.setregid(gid);
      return 0;
    },
    getppid: () => {
      if (posix.getppid == null) {
        // in browser -- only one process id:
        return unistd.getpid();
      }
      return posix.getppid();
    },
    setgroups: () => {
      notImplemented("setgroups");
    },

    setpgrp: () => {
      notImplemented("setpgrp");
    },

    tcgetpgrp: () => {
      notImplemented("tcgetpgrp");
    },

    tcsetpgrp: () => {
      notImplemented("tcsetpgrp");
    },

    fork: () => {
      if (posix.fork == null) {
        notImplemented("fork");
      }
      return posix.fork();
    },

    fork1: () => {
      notImplemented("fork1");
    },

    forkpty: () => {
      notImplemented("forkpty");
    },

    getlogin: (): number => {
      if (login != null) return login;
      // returns the username of the signed in user; if not available, e.g.,
      // in a browser, returns "user".
      const username = os.userInfo?.()?.username ?? "user";
      login = send.string(username);
      if (login == null) throw Error("bug");
      return login;
    },

    // int gethostname(char *name, size_t len);
    gethostname: (namePtr: number, len: number): number => {
      if (os.hostname == null) {
        throw Error("gethostname not supported on this platform");
      }
      const name = os.hostname();
      send.string(name, { ptr: namePtr, len });
      return 0;
    },

    // int sethostname(const char *name, size_t len);
    sethostname: (namePtr: number, len: number): number => {
      if (posix.sethostname == null) {
        throw Error("sethostname not supported on this platform");
      }
      const name = recv.string(namePtr, len);
      posix.sethostname(name);
      return 0;
    },

    // char *ttyname(int fd);
    // int ttyname_r(int fd, char *buf, size_t buflen);
    ttyname_r: (fd: number, ptr: number, len: number): number => {
      if (posix.ttyname == null) {
        throw Error("ttyname_r is not supported on this platform");
      }
      send.string(posix.ttyname(fd), { ptr, len });
      return 0;
    },

    alarm: (seconds: number): number => {
      if (posix.alarm == null) {
        throw Error("alarm is not supported on this platform");
      }
      return posix.alarm(seconds);
    },

    // The following 4 are actually only available on a Linux host, though wasi-musl defines them,
    // so cpython-wasm thinks they exist.
    getresuid: (ruidPtr: number, euidPtr: number, suidPtr: number): number => {
      if (posix.getresuid == null) {
        notImplemented("getresuid");
      }
      const { ruid, euid, suid } = posix.getresuid();
      const view = new DataView(memory.buffer);
      view.setUint32(ruidPtr, ruid, true);
      view.setUint32(euidPtr, euid, true);
      view.setUint32(suidPtr, suid, true);
      return 0;
    },

    getresgid: (rgidPtr: number, egidPtr: number, sgidPtr: number): number => {
      if (posix.getresgid == null) {
        notImplemented("getresgid");
      }
      const { rgid, egid, sgid } = posix.getresgid();
      const view = new DataView(memory.buffer);
      view.setUint32(rgidPtr, rgid, true);
      view.setUint32(egidPtr, egid, true);
      view.setUint32(sgidPtr, sgid, true);
      return 0;
    },

    setresuid: (ruid: number, euid: number, suid: number): number => {
      if (posix.setresuid == null) {
        notImplemented("setresuid");
      }
      posix.setresuid(ruid, euid, suid);
      return 0;
    },

    setresgid: (rgid: number, egid: number, sgid: number): number => {
      if (posix.setresgid == null) {
        notImplemented("setresgid");
      }
      posix.setresgid(rgid, egid, sgid);
      return 0;
    },

    // int execve(const char *pathname, char *const argv[], char *const envp[]);
    // TODO: I think this can't be done by a worker thread, so we may have
    // to change implementation so ask the main thread to do this (?).
    execve: (pathnamePtr: number, argvPtr: number, envpPtr: number): number => {
      if (posix._execve == null) {
        notImplemented("execve");
      }
      const pathname = recv.string(pathnamePtr);
      const argv = recv.arrayOfStrings(argvPtr);
      const envp = recv.arrayOfStrings(envpPtr);
      posix._execve(pathname, argv, envp);
      return 0; // this won't happen because execve takes over
    },

    execv: (pathnamePtr: number, argvPtr: number): number => {
      if (posix.execv == null) {
        notImplemented("execve");
      }
      const pathname = recv.string(pathnamePtr);
      const argv = recv.arrayOfStrings(argvPtr);
      posix.execv(pathname, argv);
      return 0; // this won't happen because execve takes over
    },

    // execlp is so far only by libedit to launch vim to edit
    // the history.  So it's safe to just disable.  Python doesn't
    // use this at all.
    execlp: () => {
      notImplemented("execlp");
    },

    /*
    I don't have automated testing for this, since it quits node.
    However, here is what works on Linux. There is no fexecve on macos.
    >>> import os; a = os.open("/bin/ls",os.O_RDONLY | os.O_CREAT)
    >>> os.execve(a,['-l','/'],{})
    bin   dev  home  media  opt   root  sbin  sys  usr
    boot  etc  lib   mnt    proc  run   srv   tmp  var
    */
    fexecve: (fd: number, argvPtr: number, envpPtr: number): number => {
      if (posix._fexecve == null) {
        notImplemented("fexecve");
      }
      const argv = recv.arrayOfStrings(argvPtr);
      const envp = recv.arrayOfStrings(envpPtr);

      posix._fexecve(toNativeFd(fd), argv, envp);
      return 0; // this won't happen because execve takes over
    },

    //  int pipe(int pipefd[2]);
    pipe: (pipefdPtr: number): number => {
      if (posix.pipe == null) {
        notImplemented("pipe");
      }
      const { readfd, writefd } = posix.pipe();
      // readfd and writefd are genuine native file descriptors.
      const wasi_readfd = wasi.getUnusedFileDescriptor();
      wasi.FD_MAP.set(wasi_readfd, {
        real: readfd,
        rights: wasi.FD_MAP.get(0).rights, // just use rights for stdin
      });
      const wasi_writefd = wasi.getUnusedFileDescriptor();
      wasi.FD_MAP.set(wasi_writefd, {
        real: writefd,
        rights: wasi.FD_MAP.get(1).rights, // just use rights for stdout
      });

      send.i32(pipefdPtr, wasi_readfd);
      send.i32(pipefdPtr + 4, wasi_writefd);
      return 0;
    },

    pipe2: (pipefdPtr: number, flags: number): number => {
      if (posix.pipe2 == null) {
        notImplemented("pipe2");
      }
      let nativeFlags = 0;
      if (flags & constants.O_NONBLOCK) {
        nativeFlags += posix.constants?.O_NONBLOCK ?? 0;
      }
      // NOTE: wasi defined O_CLOEXEC to be 0, which is super annoying.
      // We thus never set it, since otherwise it would always get set.
      /* if (flags & constants.O_CLOEXEC) {
        nativeFlags += posix.constants?.O_CLOEXEC ?? 0;
      }*/
      const { readfd, writefd } = posix.pipe2(nativeFlags);
      // TODO: we almost certainly need to abstract these through our WASI
      // fd object!
      send.i32(pipefdPtr, readfd);
      send.i32(pipefdPtr + 4, writefd);
      return 0;
    },

    lockf: (fd: number, cmd: number, size: number): number => {
      const { lockf } = posix;
      if (lockf == null) {
        notImplemented("lockf");
      }

      let cmdNative: number | undefined = undefined;
      for (const x of ["F_ULOCK", "F_LOCK", "F_TLOCK", "F_TEST"]) {
        if (cmd == constants[x]) {
          cmdNative = posix.constants[x];
          break;
        }
      }
      if (cmdNative == null) {
        throw Error(`invalid cmd ${cmd}`);
      }
      lockf(toNativeFd(fd), cmdNative, BigInt(size));
      return 0;
    },

    pause: (): number => {
      const { pause } = posix;
      if (pause == null) {
        // this could be implemented in case of worker
        notImplemented("pause");
      }
      return pause();
    },

    // initgroups in node, so easier...
    // int initgroups(const char *user, gid_t group);
    initgroups: (userPtr: number, group: number): number => {
      const { initgroups } = process;
      if (initgroups == null) {
        notImplemented("initgroups");
      }
      const user = recv.string(userPtr);
      initgroups(user, group);
      return 0;
    },

    // int getgrouplist(const char *user, gid_t group, gid_t *groups, int *ngroups);
    getgrouplist: (
      userPtr: number,
      group: number,
      groupPtr: number,
      ngroupsPtr: number
    ): number => {
      const { getgrouplist } = posix;
      const user = recv.string(userPtr);
      const ngroups = recv.i32(ngroupsPtr);
      let v;
      if (getgrouplist == null) {
        v = [group];
      } else {
        v = getgrouplist(user, group);
      }
      const k = Math.min(v.length, ngroups);
      for (let i = 0; i < k; i++) {
        send.u32(groupPtr + 4 * i, v[i]);
      }
      send.i32(ngroupsPtr, v.length);
      if (k < v.length) {
        return -1;
      }
      return 0;
    },
  };

  return unistd;
}
