/*
I do intend to implement all the spawn system calls using node.js at some point, so that python-wasm on nodejs is
able to create and use subprocesses, at least when in an insecure mode.   In the browser, it could also create
other webassembly workers for a restricted collection of "commands".  However, for now, these shall all throw
an error.
*/

import { notImplemented } from "./util";

import { getSignalSet, setSignalSet } from "./signal";

export default function spawn({ callFunction, posix, recv, send }) {
  const fileActions: { [ptr: number]: any[] } = {};

  const attrs: { [ptr: number]: any } = {};
  function getAttr(ptr: number) {
    if (attrs[ptr] == null) {
      attrs[ptr] = {};
    }
    const attr = attrs[ptr];
    if (attr != null) {
      return attr;
    } else {
      throw Error("bug"); // impossible
    }
  }

  return {
    posix_spawnattr_setschedparam: (
      attrPtr: number,
      schedparamPtr: number
    ): number => {
      getAttr(attrPtr).schedparam = {
        sched_priority: callFunction(
          "get_posix_spawnattr_schedparam_sched_priority",
          schedparamPtr
        ),
      };
      return 0;
    },

    posix_spawnattr_getschedparam: (
      attrPtr: number,
      schedparamPtr: number
    ): number => {
      const sched_priority = getAttr(attrPtr).schedparam ?? 0;
      callFunction(
        "set_posix_spawnattr_schedparam_sched_priority",
        schedparamPtr,
        sched_priority
      );
      return 0;
    },

    posix_spawnattr_setschedpolicy: (attrPtr: number, schedpolicy: number) => {
      getAttr(attrPtr).schedpolicy = schedpolicy;
      return 0;
    },

    posix_spawnattr_getschedpolicy: (
      attrPtr: number,
      schedpolicyPtr: number
    ) => {
      send.i32(schedpolicyPtr, getAttr(attrPtr).schedpolicy ?? 0);
      return 0;
    },

    posix_spawnattr_init: (attrPtr: number): number => {
      attrs[attrPtr] = {};
      return 0;
    },

    posix_spawnattr_destroy: (attrPtr: number): number => {
      delete attrs[attrPtr];
      return 0;
    },

    posix_spawnattr_setflags: (attrPtr: number, flags: number): number => {
      getAttr(attrPtr).flags = flags;
      return 0;
    },

    posix_spawnattr_getflags: (attrPtr: number, flagsPtr: number): number => {
      send.i32(flagsPtr, getAttr(attrPtr).flags ?? 0);
      return 0;
    },

    posix_spawnattr_setpgroup: (attrPtr: number, pgrp: number): number => {
      getAttr(attrPtr).pgrp = pgrp;
      return 0;
    },

    posix_spawnattr_getpgroup: (attrPtr: number, pgrpPtr: number): number => {
      send.i32(pgrpPtr, getAttr(attrPtr).pgrp ?? 0);
      return 0;
    },

    posix_spawnattr_setsigmask: (attrPtr: number, maskPtr: number): number => {
      getAttr(attrPtr).maskPtr = maskPtr;
      return 0;
    },

    posix_spawnattr_getsigmask: (attrPtr: number, maskPtr: number): number => {
      const cur = getAttr(attrPtr).maskPtr;
      setSignalSet(maskPtr, getSignalSet(cur));
      return 0;
    },

    posix_spawnattr_setsigdefault: (
      attrPtr: number,
      sigdefaultPtr: number
    ): number => {
      getAttr(attrPtr).sigdefaultPtr = sigdefaultPtr;
      return 0;
    },

    posix_spawnattr_getsigdefault: (
      attrPtr: number,
      sigdefaultPtr: number
    ): number => {
      const cur = getAttr(attrPtr).sigdefaultPtr;
      setSignalSet(sigdefaultPtr, getSignalSet(cur));
      return 0;
    },

    posix_spawn: (
      pidPtr,
      pathPtr,
      fileActionsPtr,
      attrPtr,
      argvPtr,
      envpPtr
    ): number => {
      if (posix.posix_spawn == null) {
        notImplemented("posix_spawn");
      }
      const path = recv.string(pathPtr);
      const argv = recv.arrayOfStrings(argvPtr);
      const envp = recv.arrayOfStrings(envpPtr);
      const pid = posix.posix_spawn(
        path,
        fileActions[fileActionsPtr],
        getAttr(attrPtr),
        argv,
        envp
      );
      send.i32(pidPtr, pid);
      return 0;
    },

    posix_spawnp: (
      pidPtr,
      pathPtr,
      fileActionsPtr,
      attrPtr,
      argvPtr,
      envpPtr
    ): number => {
      if (posix.posix_spawnp == null) {
        notImplemented("posix_spawnp");
      }
      const path = recv.string(pathPtr);
      const argv = recv.arrayOfStrings(argvPtr);
      const envp = recv.arrayOfStrings(envpPtr);
      const pid = posix.posix_spawnp(
        path,
        fileActions[fileActionsPtr],
        getAttr(attrPtr),
        argv,
        envp
      );
      send.i32(pidPtr, pid);
      return 0;
    },

    posix_spawn_file_actions_init: (fileActionsPtr: number): number => {
      fileActions[fileActionsPtr] = [];
      return 0;
    },

    posix_spawn_file_actions_destroy: (fileActionsPtr: number): number => {
      delete fileActions[fileActionsPtr];
      return 0;
    },

    posix_spawn_file_actions_addclose: (
      fileActionsPtr: number,
      fd: number
    ): number => {
      if (fileActions[fileActionsPtr] == null) {
        fileActions[fileActionsPtr] = [];
      }
      fileActions[fileActionsPtr].push(["addclose", fd]);
      return 0;
    },

    posix_spawn_file_actions_addopen: (
      fileActionsPtr: number,
      fd: number,
      pathPtr: number,
      oflag: number,
      mode: number
    ): number => {
      if (fileActions[fileActionsPtr] == null) {
        fileActions[fileActionsPtr] = [];
      }
      const path = recv.string(pathPtr);
      fileActions[fileActionsPtr].push(["addopen", fd, path, oflag, mode]);
      return 0;
    },

    posix_spawn_file_actions_adddup2: (
      fileActionsPtr: number,
      fd: number,
      new_fd: number
    ): number => {
      if (fileActions[fileActionsPtr] == null) {
        fileActions[fileActionsPtr] = [];
      }
      fileActions[fileActionsPtr].push(["adddup2", fd, new_fd]);
      return 0;
    },
  };
}
