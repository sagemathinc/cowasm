
import { notImplemented } from "./util";

export default function wait({ posix }) {
  return {
    wait: (): number => {
      notImplemented("wait");
      return -1;
    },

    waitid: (): number => {
      notImplemented("waitid");
      return -1;
    },

    //  pid_t waitpid(pid_t pid, int *wstatus, int options);
    // waitpid(pid: number, options : number) => {status: Status, ret:number}

    waitpid: (pid: number, _wstatusPtr: number, options: number): number => {
      if (posix.waitpid == null) {
        notImplemented("waitpid");
      }
      // TODO -- need to translate options to native host; parse status and encode in _wstatusPtr somehow.
      return posix.waitpid(pid, options);
    },
  };
}
