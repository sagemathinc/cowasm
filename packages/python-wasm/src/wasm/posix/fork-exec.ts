/*
extern int python_wasm_fork_exec(
             char *const exec_array[],
             char *const argv[],
             char *const envp[],
             const char *cwd,
             int p2cread, int p2cwrite,
             int c2pread, int c2pwrite,
             int errread, int errwrite,
             int errpipe_read, int errpipe_write,
             int close_fds, int restore_signals,
             int call_setsid, pid_t pgid_to_set,
             int call_setgid, gid_t gid,
             int call_setgroups, size_t groups_size, const gid_t *groups,
             int call_setuid, uid_t uid,
             int child_umask,
             const void *child_sigmask,
             int *py_fds_to_keep // null or a null terminated int[]
             );


*/

import debug from "debug";
import { nativeToWasm } from './errno.js';
import constants from './constants.js';

const log = debug("posix:fork-exec");

export default function fork_exec({ posix, recv, wasi }) {
  function real_fd(virtual_fd: number): number {
    const data = wasi.FD_MAP.get(virtual_fd);
    if (data == null) {
      return -1;
    }
    return data.real;
  }

  // map from wasi number to real fd number, for each inheritable file descriptor
  function getInheritableDescriptorsMap(): { [wasi_fd: number]: number } {
    const map: { [wasi_fd: number]: number } = {};
    for (const wasi_fd of wasi.FD_MAP.keys()) {
      const data = wasi.FD_MAP.get(wasi_fd);
      try {
        if (posix.is_inheritable(data.real)) {
          map[wasi_fd] = data.real;
        }
      } catch (err) {
        log("getInheritableDescriptorsMap", data.real, err);
      }
    }
    return map;
  }

  return {
    // We have to implement this since fcntl -- which python library calls -- is too
    // much of a no-op.  This is needed for subprocess support only, of course.
    // This can ONLY work on actual fd in the node.js process itself, e.g., pipes.
    // When we implement this in the browser, we will also have fd's that correspond
    // to pipes, where this works.
    python_wasm_set_inheritable: (fd: number, inheritable: number): number => {
      if (posix.set_inheritable == null) {
        // no-op on platform where we aren't going to ever fork anyways.
        return 0;
      }
      const real = real_fd(fd);
      if (real == -1) {
        throw Error("invalid file descriptor");
      }
      try {
        // This will fail if real isn't a pipe or actual native file descriptor.
        // In that case, we treat as a no-op, since there is nothing we can possibly do.
        posix.set_inheritable(real, !!inheritable);
      } catch (_) {
        return 0;
      }
      return 0;
    },

    // Our custom implementation of the entire fork-exec process.  We can't use Python's
    // since node.js would need to get run in the forked process to do arbitrarily complicated
    // things, and node.js is not written in a way to support actual forking.  In practice,
    // doing that sort of works, but **RANDOMLY CRASHES** and will drive you insane.  So
    // we just did the hard work and wrote this.
    python_wasm_fork_exec: (
      exec_array_ptr,
      argv_ptr,
      envp_ptr,
      cwd,
      p2cread,
      p2cwrite,
      c2pread,
      c2pwrite,
      errread,
      errwrite,
      errpipe_read,
      errpipe_write,
      close_fds,
      restore_signals,
      call_setsid,
      pgid_to_set,
      call_setgid,
      gid,
      call_setgroups,
      groups_size,
      groups,
      call_setuid,
      uid,
      child_umask,
      child_sigmask,
      py_fds_to_keep
    ): number => {
      log("called fork_exec");
      log("ignoring these: ", {
        restore_signals,
        call_setsid,
        pgid_to_set,
        call_setgid,
        gid,
        call_setgroups,
        groups_size,
        groups,
        call_setuid,
        uid,
        child_umask,
        child_sigmask,
      });

      log("before change", {
        p2cread,
        p2cwrite,
        c2pread,
        c2pwrite,
        errread,
        errwrite,
        errpipe_read,
        errpipe_write,
      });

      const err_map: number[] = [];
      const n2w = nativeToWasm(posix);
      for (let native_errno = 0; native_errno < 100; native_errno++) {
        err_map[native_errno] = n2w[native_errno] ?? constants.ENOENT;
      }

      // if envp is empty, then explicitly give WASI_FD_INFO below; otherwise,
      // we just include WASI_FD_INFO in envp.
      const WASI_FD_INFO = JSON.stringify(getInheritableDescriptorsMap());
      const envp = recv.arrayOfStrings(envp_ptr);
      if (envp.length > 0) {
        envp.push(`WASI_FD_INFO=${WASI_FD_INFO}`);
      }

      const opts = {
        exec_array: recv.arrayOfStrings(exec_array_ptr),
        argv: recv.arrayOfStrings(argv_ptr),
        envp,
        cwd: recv.string(cwd),
        p2cread: real_fd(p2cread),
        p2cwrite: real_fd(p2cwrite),
        c2pread: real_fd(c2pread),
        c2pwrite: real_fd(c2pwrite),
        errread: real_fd(errread),
        errwrite: real_fd(errwrite),
        errpipe_read: real_fd(errpipe_read),
        errpipe_write: real_fd(errpipe_write),
        close_fds,
        fds_to_keep: recv.arrayOfI32(py_fds_to_keep).map(real_fd),
        err_map,
        WASI_FD_INFO,
      };
      log("opts", opts);

      log("descriptors map = ", getInheritableDescriptorsMap());

      try {
        const pid = posix.fork_exec(opts);
        log("got subprocess = ", pid);
        return pid;
      } catch (err) {
        log("error doing fork", err);
        return -1;
      }
    },
  };
}
