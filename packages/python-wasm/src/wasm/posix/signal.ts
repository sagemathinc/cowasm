/*
NOTES:
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

import constant from "./constants";

const signal_t: { [setPtr: number]: Set<number> } = {};
function getSignalSet(setPtr: number): Set<number> {
  if (signal_t[setPtr] == null) {
    signal_t[setPtr] = new Set();
  }
  return signal_t[setPtr];
}
// The global signal mask for this process.
const signalMask = new Set<number>();
function setSignalSetToMask(setPtr: number): void {
  const set = getSignalSet(setPtr);
  set.clear();
  for (const x of signalMask) {
    set.add(x);
  }
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
    sigfillset: (setPtr: number): number => {
      const set = getSignalSet(setPtr);
      for (let sig = 1; sig <= 31; sig++) {
        set.add(sig);
      }
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

    // int sigprocmask(int how, const sigset_t *set, sigset_t *oldset);
    // "sigprocmask() is used to fetch and/or change the signal mask of
    // the calling thread.  The signal mask is the set of signals whose
    // delivery is currently blocked for the caller."
    sigprocmask: (how: number, setPtr: number, oldsetPtr: number): number => {
      try {
        if (!setPtr) return 0;
        const set = getSignalSet(setPtr);
        switch (how) {
          case constant("SIG_BLOCK"):
            for (const s of set) {
              signalMask.add(s);
            }
            return 0;
          case constant("SIG_UNBLOCK"):
            for (const s of set) {
              signalMask.delete(s);
            }
            return 0;
          case constant("SIG_SETMASK"):
            signalMask.clear();
            for (const s of set) {
              signalMask.add(s);
            }
            return 0;
          default:
            throw Error(`sigprocmask - invalid how=${how}`);
        }
      } finally {
        if (oldsetPtr) {
          setSignalSetToMask(oldsetPtr);
        }
      }
    },
  };
}
