import { notImplemented } from "./util";

export default function wait({ posix, send }) {
  return {
    wait: (wstatusPtr: number): number => {
      if (posix.wait == null) {
        notImplemented("wait");
      }
      // TODO -- need to translate options to native host; parse status and encode in _wstatusPtr somehow.
      const { ret, wstatus } = posix.wait();
      send.i32(wstatusPtr, wstatus);
      return ret;
    },

    waitid: (): number => {
      // waitid is linux only
      notImplemented("waitid");
      return -1;
    },

    //  pid_t waitpid(pid_t pid, int *wstatus, int options);
    // waitpid(pid: number, options : number) => {status: Status, ret:number}

    waitpid: (pid: number, wstatusPtr: number, options: number): number => {
      if (posix.waitpid == null) {
        notImplemented("waitpid");
      }
      // TODO -- need to translate options to native host; parse status and encode in _wstatusPtr somehow.
      const { ret, wstatus } = posix.waitpid(pid, options);
      send.i32(wstatusPtr, wstatus);
      return ret;
    },
  };
}
