/*
extern int python_wasm_fork_exec(char *const exec_array[],
             char *const argv[],
             char *const envp[],
             const char *cwd,
             int p2cread, int p2cwrite,
             int c2pread, int c2pwrite,
             int errread, int errwrite,
             int errpipe_read, int errpipe_write);

*/

import debug from "debug";

const log = debug("posix:fork-exec");

export default function fork_exec({  }) {
  return {
    python_wasm_fork_exec: (...args): number => {
      log("fork_exec", ...args);
      return -1;
    },
  };
}
