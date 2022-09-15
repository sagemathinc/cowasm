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
             int call_setuid, uid_t uid, int child_umask,
             const void *child_sigmask,
             int *py_fds_to_keep // null or a null terminated int[]
             );


*/

import debug from "debug";

const log = debug("posix:fork-exec");

export default function fork_exec({ posix, recv }) {
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
      ...args
    ): number => {
      log("fork_exec", ...args);
      try {
        return posix.fork_exec({
          exec_array: recv.arrayOfStrings(exec_array_ptr),
          argv: recv.arrayOfStrings(argv_ptr),
          envp: recv.arrayOfStrings(envp_ptr),
          cwd: recv.string(cwd),
          p2cread,
          p2cwrite,
          c2pread,
          c2pwrite,
          errread,
          errwrite,
          errpipe_read,
          errpipe_write,
        });
      } catch (err) {
        console.warn(err);
        return -1;
      }
    },
  };
}
