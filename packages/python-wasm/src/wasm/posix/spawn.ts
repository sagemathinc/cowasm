/*
I do intend to implement all the spawn system calls using node.js at some point, so that python-wasm on nodejs is
able to create and use subprocesses, at least when in an insecure mode.   In the browser, it could also create
other webassembly workers for a restricted collection of "commands".  However, for now, these shall all throw
an error.
*/

import { notImplemented } from "./util";

export default function spawn({ posix, recv, send }) {
  const names =
    "posix_spawnattr_setschedparam posix_spawnattr_setschedpolicy posix_spawnattr_setsigdefault";
  const spawn: any = {};
  for (const name of names.split(" ")) {
    spawn[name] = () => {
      console.warn(
        `\n******\ncalling non-implemented stub function ${name}\n******\n`
      );
      notImplemented(name);
    };
  }
  /*
    int posix_spawn(pid_t *restrict pid, const char *restrict path,
         const posix_spawn_file_actions_t *file_actions,
         const posix_spawnattr_t *restrict attrp,
         char *const argv[restrict], char *const envp[restrict]);
  */
  spawn.posix_spawn = (
    pidPtr,
    pathPtr,
    _fileActionsPtr,
    _attrpPtr,
    argvPtr,
    envpPtr
  ): number => {
    if (posix.posix_spawn == null) {
      notImplemented("posix_spawn");
    }
    const path = recv.string(pathPtr);
    const argv = recv.arrayOfStrings(argvPtr);
    const envp = recv.arrayOfStrings(envpPtr);
    // TODO: second and third args!
    const pid = posix.posix_spawn(path, null, null, argv, envp);
    send.i32(pidPtr, pid);
    return 0;
  };

  spawn.posix_spawnp = (
    pidPtr,
    pathPtr,
    _fileActionsPtr,
    _attrpPtr,
    argvPtr,
    envpPtr
  ): number => {
    if (posix.posix_spawnp == null) {
      notImplemented("posix_spawnp");
    }
    const path = recv.string(pathPtr);
    const argv = recv.arrayOfStrings(argvPtr);
    const envp = recv.arrayOfStrings(envpPtr);
    // TODO: second and third args!
    const pid = posix.posix_spawnp(path, null, null, argv, envp);
    send.i32(pidPtr, pid);
    return 0;
  };

  type Actions = any;
  const fileActions: { [ptr: number]: Actions[] } = {};
  spawn.posix_spawn_file_actions_init = (fileActionsPtr: number): number => {
    fileActions[fileActionsPtr] = [];
    return 0;
  };
  spawn.posix_spawn_file_actions_destroy = (fileActionsPtr: number): number => {
    delete fileActions[fileActionsPtr];
    return 0;
  };

  spawn.posix_spawn_file_actions_addclose = (
    fileActionsPtr: number,
    fd: number
  ): number => {
    if (fileActions[fileActionsPtr] == null) {
      fileActions[fileActionsPtr] = [];
    }
    fileActions[fileActionsPtr].push(["addclose", fd]);
    return 0;
  };

  spawn.posix_spawn_file_actions_addopen = (
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
  };

  spawn.posix_spawn_file_actions_adddup2 = (
    fileActionsPtr: number,
    fd: number,
    new_fd: number
  ) => {
    if (fileActions[fileActionsPtr] == null) {
      fileActions[fileActionsPtr] = [];
    }
    fileActions[fileActionsPtr].push(["adddup2", fd, new_fd]);
    return 0;
  };

  return spawn;
}
