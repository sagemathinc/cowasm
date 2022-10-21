import { notImplemented } from "./util";
import constants from "./constants";

export default function wait({ posix, send}) {
  function nativeOptions(options: number): number {
    let native_options = 0;
    for (const option of ["WNOHANG", "WUNTRACED"]) {
      if (options & constants[option]) {
        native_options |= posix.constants[option];
      }
    }
    return native_options;
  }

  function wasm_wstatus(wstatus: number): number {
    // TODO -- need to parse status and encode in wstatusPtr correctly.  I don't
    // know that wstatus native is the same as wstatus in WASI!!?!
    return wstatus;
  }

  const obj = {
    wait: (wstatusPtr: number): number => {
      if (posix.wait == null) {
        notImplemented("wait");
      }
      const { ret, wstatus } = posix.wait();
      send.i32(wstatusPtr, wasm_wstatus(wstatus));
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
      // TODO -- need to parse status and encode in wstatusPtr correctly.  I don't
      // know that wstatus native is the same as wstatus in WASI!!?!
      const { ret, wstatus } = posix.waitpid(pid, nativeOptions(options));
      send.i32(wstatusPtr, wasm_wstatus(wstatus));
      return ret;
    },

    // pid_t wait3(int *stat_loc, int options, struct rusage *rusage);
    wait3: (wstatusPtr: number, options: number, rusagePtr: number): number => {
      if (posix.wait3 == null) {
        notImplemented("wait3");
      }
      if (rusagePtr != 0) {
        console.warn("wait3 not implemented for non-NULL *rusage");
        notImplemented("wait3");
      }
      const { ret, wstatus } = posix.wait3(nativeOptions(options));
      send.i32(wstatusPtr, wasm_wstatus(wstatus));
      return ret;
    },
  };
  return obj;
}
