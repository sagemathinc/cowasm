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
import { nativeToWasm } from "./errno";
import constants from "./constants";

const log = debug("posix:fork-exec");

export default function fork_exec({ posix, recv, wasi }) {
  return {
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

      function real_fd(virtual_fd: number): number {
        const data = wasi.FD_MAP.get(virtual_fd);
        if (data == null) {
          return -1;
        }
        return data.real;
      }

      const err_map: number[] = [];
      const n2w = nativeToWasm(posix);
      for (let native_errno = 0; native_errno < 100; native_errno++) {
        err_map[native_errno] = n2w[native_errno] ?? constants.ENOENT;
      }

      const opts = {
        exec_array: recv.arrayOfStrings(exec_array_ptr),
        argv: recv.arrayOfStrings(argv_ptr),
        envp: recv.arrayOfStrings(envp_ptr),
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
      };
      log("opts", opts);

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
