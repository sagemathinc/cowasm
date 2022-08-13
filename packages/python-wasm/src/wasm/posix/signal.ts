/*

A key fact is that zig defines sigset_t to be "unsigned char", instead of a much
more useful larger struct. Thus we only have 8 bits, so can't really represent
all the signals.  So instead we just use the pointer and a higher level Javascript
Set data structure.  Since any nontrivial signal functionality has to be at the
Javascript level anyways, this is probably just fine.

They say this in the zig sources, and just worrying about the pointer makes things
agnostic.

// TODO: This is just a placeholder for now. Keep this in sync with musl.
typedef unsigned char sigset_t;

NOTE: below we implement more than just what's needed for Python.  This may be helpful
for other libraries.
*/

const signal_t: { [setPtr: number]: Set<number> } = {};
function getSignalSet(setPtr: number): Set<number> {
  if (signal_t[setPtr] == null) {
    signal_t[setPtr] = new Set();
  }
  return signal_t[setPtr];
}

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

    // int sigemptyset(sigset_t *set);
    sigemptyset: (setPtr: number): number => {
      getSignalSet(setPtr).clear();
      return 0;
    },

    // int sigfillset(sigset_t *set);

    // int sigaddset(sigset_t *set, int signum);
    sigaddset: (setPtr: number, signum: number): number => {
      getSignalSet(setPtr).add(signum);
      return 0;
    },

    // int sigdelset(sigset_t *set, int signum);
    sigdelset: (setPtr: number, signum: number): number => {
      getSignalSet(setPtr).delete(signum);
      return 0;
    },

    // int sigismember(const sigset_t *set, int signum);
    sigismember: (setPtr: number, signum: number): number => {
      if (getSignalSet(setPtr).has(signum)) {
        return 1;
      } else {
        return 0;
      }
    },
  };
}
