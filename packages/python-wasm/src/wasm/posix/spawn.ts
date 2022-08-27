/*
I do intend to implement all the spawn system calls using node.js at some point, so that python-wasm on nodejs is
able to create and use subprocesses, at least when in an insecure mode.   In the browser, it could also create
other webassembly workers for a restricted collection of "commands".  However, for now, these shall all throw
an error.
*/

import { notImplemented } from "./util";

export default function spawn({}) {
  const names =
    "posix_spawn posix_spawn_file_actions_addclose posix_spawn_file_actions_adddup2 posix_spawn_file_actions_addopen posix_spawn_file_actions_destroy posix_spawn_file_actions_init posix_spawnattr_destroy posix_spawnattr_init posix_spawnattr_setflags posix_spawnattr_setpgroup posix_spawnattr_setschedparam posix_spawnattr_setschedpolicy posix_spawnattr_setsigdefault posix_spawnattr_setsigmask posix_spawnp";
  const spawn: any = {};
  for (const name of names.split(" ")) {
    spawn[name] = () => {
      console.warn(
        `\n******\ncalling non-implemented stub function ${name}\n******\n`
      );
      notImplemented(name);
    };
  }
  return spawn;
}
