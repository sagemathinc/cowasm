export default function signal({ process }) {
  return {
    // int kill(pid_t pid, int sig);
    kill: (pid: number, signal: number): number => {
      if (process.kill == null) return 0;
      process.kill(pid, signal);
      return 0;
    },

    // int killpg(int pgrp, int sig);
    killpg: (pid: number, signal: number): number => {
      if (process.kill == null) return 0;
      process.kill(-pid, signal);
      return 0;
    },
  };
}
