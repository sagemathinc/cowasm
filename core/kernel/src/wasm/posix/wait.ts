import { notImplemented } from "./util";
import constants from "./constants";

export default function wait(context) {
  const { posix, send } = context;

  function completedWasmProcesses():
    | Map<number, number | Int32Array>
    | undefined {
    const processes = context.state.completedWasmProcesses;
    return processes instanceof Map ? processes : undefined;
  }

  function takeCompletedWasmProcess(pid: number) {
    const processes = completedWasmProcesses();
    if (processes == null) return undefined;
    if (pid == -1) {
      for (const [completedPid, process] of processes.entries()) {
        const wstatus =
          typeof process == "number"
            ? process
            : Atomics.load(process, 0) == 1
              ? Atomics.load(process, 1)
              : undefined;
        if (wstatus != null) {
          processes.delete(completedPid);
          return { ret: completedPid, wstatus };
        }
      }
      return undefined;
    }
    const process = processes.get(pid);
    if (process == null) return undefined;
    const wstatus =
      typeof process == "number"
        ? process
        : Atomics.load(process, 0) == 1
          ? Atomics.load(process, 1)
          : undefined;
    if (wstatus == null) return undefined;
    processes.delete(pid);
    return { ret: pid, wstatus };
  }

  function runningWasmProcess(pid: number): Int32Array | undefined {
    const processes = completedWasmProcesses();
    if (processes == null) return undefined;
    if (pid == -1) {
      for (const process of processes.values()) {
        if (typeof process != "number" && Atomics.load(process, 0) == 0) {
          return process;
        }
      }
      return undefined;
    }
    const process = processes.get(pid);
    return typeof process == "number" ? undefined : process;
  }

  function waitForWasmProcess(pid: number, options: number): boolean {
    const process = runningWasmProcess(pid);
    if (process == null || options & constants.WNOHANG) {
      return false;
    }
    Atomics.wait(process, 0, 0);
    return true;
  }

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
      let completed = takeCompletedWasmProcess(-1);
      if (completed == null && waitForWasmProcess(-1, 0)) {
        completed = takeCompletedWasmProcess(-1);
      }
      if (completed != null) {
        send.i32(wstatusPtr, completed.wstatus);
        return completed.ret;
      }
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
      let completed = takeCompletedWasmProcess(pid);
      const wasmProcess = runningWasmProcess(pid);
      if (completed == null && waitForWasmProcess(pid, options)) {
        completed = takeCompletedWasmProcess(pid);
      }
      if (completed != null) {
        send.i32(wstatusPtr, completed.wstatus);
        return completed.ret;
      }
      if (wasmProcess != null && options & constants.WNOHANG) {
        return 0;
      }
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
      let completed = takeCompletedWasmProcess(-1);
      const wasmProcess = runningWasmProcess(-1);
      if (completed == null && waitForWasmProcess(-1, options)) {
        completed = takeCompletedWasmProcess(-1);
      }
      if (completed != null) {
        send.i32(wstatusPtr, completed.wstatus);
        return completed.ret;
      }
      if (wasmProcess != null && options & constants.WNOHANG) {
        return 0;
      }
      const { ret, wstatus } = posix.wait3(nativeOptions(options));
      send.i32(wstatusPtr, wasm_wstatus(wstatus));
      return ret;
    },
  };
  return obj;
}
