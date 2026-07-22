/*
TODO: refactor -- some of this code will go in a new python-wasm module?

extern int python_wasm_fork_exec(
             char *const exec_array[],
             char *const argv[],
             char *const envp[],
             const char *cwd,
             int p2cread, int p2cwrite,
             int c2pread, int c2pwrite,
             int errread, int errwrite,
             int errpipe_read, int errpipe_write,
             int close_fds, int restore_signals,
             int call_setsid, pid_t pgid_to_set,
             int call_setgid, gid_t gid,
             int call_setgroups, size_t groups_size, const gid_t *groups,
             int call_setuid, uid_t uid,
             int child_umask,
             const void *child_sigmask,
             int *py_fds_to_keep // null or a null terminated int[]
             );


*/

import debug from "debug";
import WASI from "wasi-js";
import { nativeToWasm } from "./errno";
import constants from "./constants";
import { join, resolve } from "path";

const log = debug("posix:fork-exec");

const WASM = Buffer.from("\0asm");

export default function fork_exec(context) {
  const { posix, recv, wasi, run, fs, child_process, getcwd, native_fs } =
    context;
  function isWasm(filename: string): boolean {
    const fd = fs.openSync(filename, "r");
    try {
      const b = Buffer.alloc(4);
      fs.readSync(fd, b, 0, 4, 0);
      return WASM.equals(b);
    } finally {
      fs.closeSync(fd);
    }
  }

  function runNative(argv: string[]): number {
    if (child_process == null) {
      console.log(
        "ERROR: Running native commands not yet implemented in this environment."
      );
      return 1;
    }
    try {
      child_process.execFileSync(argv[0], argv.slice(1), {
        stdio: "inherit",
      });
      return 0;
    } catch (err) {
      return err.status;
    }
  }

  function resolveVizFilenames(argv: string[]): string[] {
    const command = argv[0]?.split("/").pop();
    if (command != "vi" && command != "viz") {
      return argv;
    }
    let cwd = "/";
    try {
      cwd = getcwd?.() ?? cwd;
    } catch (_) {}
    return argv.map((arg, i) => {
      if (
        i == 0 ||
        arg == "--" ||
        arg.startsWith("/") ||
        arg.startsWith("-") ||
        arg.startsWith("+")
      ) {
        return arg;
      }
      return resolve(cwd, arg);
    });
  }

  function real_fd(virtual_fd: number): number {
    const data = wasi.FD_MAP.get(virtual_fd);
    if (data == null) {
      return -1;
    }
    return data.real;
  }

  // Completed synchronous children store an encoded wait status. Streaming
  // children store [done, wait status] in shared memory until waitpid reaps
  // them.
  function completedWasmProcesses(): Map<number, number | Int32Array> {
    if (!(context.state.completedWasmProcesses instanceof Map)) {
      context.state.completedWasmProcesses = new Map<
        number,
        number | Int32Array
      >();
    }
    return context.state.completedWasmProcesses;
  }

  function allocateWasmPid(): number {
    const processes = completedWasmProcesses();
    let pid = context.state.nextWasmPid ?? 0x40000000;
    while (processes.has(pid)) {
      pid += 1;
    }
    context.state.nextWasmPid = pid + 1;
    return pid;
  }

  function envObject(envp: string[]): { [key: string]: string } {
    if (envp.length == 0) {
      return { ...wasi.env };
    }
    const env: { [key: string]: string } = {};
    for (const entry of envp) {
      const i = entry.indexOf("=");
      if (i >= 0) {
        env[entry.slice(0, i)] = entry.slice(i + 1);
      }
    }
    return env;
  }

  function spoolCapturedOutput(readFd: number, writeFd: number): void {
    if (readFd < 0 || writeFd < 0) {
      return;
    }
    const readFile = wasi.FD_MAP.get(readFd);
    const writeFile = wasi.FD_MAP.get(writeFd);
    if (readFile == null || writeFile == null) {
      throw Error(
        `invalid WASI subprocess output descriptors ${readFd}/${writeFd}`
      );
    }
    if (native_fs == null) {
      throw Error("WASI subprocess output capture requires a native filesystem");
    }

    const spoolDir = native_fs.mkdtempSync(
      join("/tmp", "cowasm-wasi-subprocess-output-")
    );
    const spoolPath = join(spoolDir, "output");
    let readReal = -1;
    let writeReal = -1;
    try {
      writeReal = native_fs.openSync(spoolPath, "w+");
      readReal = native_fs.openSync(spoolPath, "r");
      native_fs.unlinkSync(spoolPath);
      native_fs.rmdirSync(spoolDir);
    } catch (err) {
      for (const fd of [readReal, writeReal]) {
        if (fd >= 0) {
          try {
            native_fs.closeSync(fd);
          } catch (_closeErr) {}
        }
      }
      try {
        native_fs.unlinkSync(spoolPath);
      } catch (_unlinkErr) {}
      try {
        native_fs.rmdirSync(spoolDir);
      } catch (_rmdirErr) {}
      throw err;
    }

    const oldReadReal = readFile.real;
    const oldWriteReal = writeFile.real;
    wasi.FD_MAP.set(readFd, {
      ...readFile,
      real: readReal,
      path: undefined,
      fakePath: undefined,
      filetype: undefined,
      offset: BigInt(0),
    });
    wasi.FD_MAP.set(writeFd, {
      ...writeFile,
      real: writeReal,
      path: undefined,
      fakePath: undefined,
      filetype: undefined,
      offset: BigInt(0),
    });

    for (const realFd of new Set([oldReadReal, oldWriteReal])) {
      const stillReferenced = Array.from(wasi.FD_MAP.values()).some(
        (file: any) => file.real == realFd
      );
      if (!stillReferenced) {
        try {
          native_fs.closeSync(realFd);
        } catch (_err) {}
      }
    }
  }

  function runWasiExecutableInWorker({
    executable,
    argv,
    envp,
    stdinFd,
    stdoutFd,
    stderrFd,
  }: {
    executable: string;
    argv: string[];
    envp: string[];
    stdinFd: number;
    stdoutFd: number;
    stderrFd: number;
  }): number | undefined {
    if (native_fs == null || posix.dup == null) {
      return undefined;
    }
    try {
      if (!native_fs.existsSync(executable)) {
        return undefined;
      }
    } catch (_err) {
      return undefined;
    }

    let workerThreads;
    let wasiModule: string;
    let wasiBindingsModule: string;
    try {
      // Keep the Node-only worker dependency out of the browser bundle. Raw
      // WASI subprocess streaming is available when the kernel has native
      // descriptors; other environments retain the synchronous fallback.
      const nodeRequire = eval("require");
      workerThreads = nodeRequire("worker_threads");
      wasiModule = nodeRequire.resolve("wasi-js");
      wasiBindingsModule = nodeRequire.resolve("wasi-js/dist/bindings/node");
    } catch (_err) {
      return undefined;
    }

    const parentFds = [
      stdinFd < 0 ? 0 : stdinFd,
      stdoutFd < 0 ? 1 : stdoutFd,
      stderrFd < 0 ? 2 : stderrFd,
    ];
    const childRealFds: number[] = [];
    try {
      for (const parentFd of parentFds) {
        const parentFile = wasi.FD_MAP.get(parentFd);
        if (parentFile == null) {
          throw Error(`invalid WASI subprocess descriptor ${parentFd}`);
        }
        childRealFds.push(posix.dup(parentFile.real));
      }
    } catch (err) {
      for (const fd of childRealFds) {
        try {
          native_fs.closeSync(fd);
        } catch (_closeErr) {}
      }
      throw err;
    }

    const completion = new Int32Array(new SharedArrayBuffer(8));
    const workerSource = String.raw`
const { workerData } = require("worker_threads");
const fs = require("fs");
const WASIModule = require(workerData.wasiModule);
const bindingsModule = require(workerData.wasiBindingsModule);
const WASI = WASIModule.default || WASIModule;
const nodeBindings = bindingsModule.default || bindingsModule;
const completion = new Int32Array(workerData.completion);
const sleepArray = new Int32Array(new SharedArrayBuffer(4));
let status = 1;
try {
  const bindings = {
    ...nodeBindings,
    exit: (code) => {
      throw { cowasmWasiProcessExit: true, code };
    },
    kill: (signal) => {
      throw { cowasmWasiProcessSignal: true, signal };
    },
  };
  const childWasi = new WASI({
    preopens: { "/": "/" },
    bindings,
    args: workerData.argv,
    env: workerData.env,
    sleep: (milliseconds) => {
      Atomics.wait(sleepArray, 0, 0, Math.max(1, milliseconds));
    },
  });
  for (let childFd = 0; childFd < 3; childFd++) {
    const file = childWasi.FD_MAP.get(childFd);
    childWasi.FD_MAP.set(childFd, {
      ...file,
      real: workerData.realFds[childFd],
    });
  }
  try {
    const binary = new Uint8Array(fs.readFileSync(workerData.executable));
    const module = new WebAssembly.Module(binary);
    const instance = new WebAssembly.Instance(module, childWasi.getImports(module));
    try {
      childWasi.start(instance);
      status = 0;
    } catch (err) {
      if (err && err.cowasmWasiProcessExit) {
        status = err.code || 0;
      } else if (err && err.cowasmWasiProcessSignal) {
        status = 128;
      } else {
        throw err;
      }
    }
  } finally {
    const realFds = new Set();
    for (const file of childWasi.FD_MAP.values()) {
      realFds.add(file.real);
    }
    for (const fd of realFds) {
      try { fs.closeSync(fd); } catch (_err) {}
    }
  }
} catch (err) {
  const detail = err && err.stack ? err.stack : String(err);
  try { fs.writeSync(workerData.realFds[2], detail + "\n"); } catch (_err) {}
  status = 1;
} finally {
  Atomics.store(completion, 1, (status & 0xff) << 8);
  Atomics.store(completion, 0, 1);
  Atomics.notify(completion, 0);
}
`;

    const pid = allocateWasmPid();
    try {
      const worker = new workerThreads.Worker(workerSource, {
        eval: true,
        trackUnmanagedFds: false,
        workerData: {
          executable,
          argv,
          env: envObject(envp),
          realFds: childRealFds,
          completion: completion.buffer,
          wasiModule,
          wasiBindingsModule,
        },
      });
      worker.unref();
      completedWasmProcesses().set(pid, completion);
      return pid;
    } catch (err) {
      for (const fd of childRealFds) {
        try {
          native_fs.closeSync(fd);
        } catch (_closeErr) {}
      }
      throw err;
    }
  }

  function runWasiExecutable({
    executable,
    argv,
    envp,
    stdinFd,
    stdoutFd,
    stderrFd,
  }: {
    executable: string;
    argv: string[];
    envp: string[];
    stdinFd: number;
    stdoutFd: number;
    stderrFd: number;
  }): number {
    if (posix.dup == null) {
      throw Error("WASI subprocesses require descriptor duplication support");
    }

    let exitCode = 0;
    const childBindings = {
      ...wasi.bindings,
      exit: (code: number) => {
        throw { cowasmWasiProcessExit: true, code };
      },
      kill: (signal: string) => {
        throw { cowasmWasiProcessSignal: true, signal };
      },
    };
    const childWasi = new WASI({
      preopens: { "/": "/" },
      bindings: childBindings,
      args: argv,
      env: envObject(envp),
      sleep: wasi.sleep,
    });

    const parentFds = [
      stdinFd < 0 ? 0 : stdinFd,
      stdoutFd < 0 ? 1 : stdoutFd,
      stderrFd < 0 ? 2 : stderrFd,
    ];
    for (let childFd = 0; childFd < parentFds.length; childFd++) {
      const parentFile = wasi.FD_MAP.get(parentFds[childFd]);
      if (parentFile == null) {
        throw Error(`invalid WASI subprocess descriptor ${parentFds[childFd]}`);
      }
      childWasi.FD_MAP.set(childFd, {
        ...parentFile,
        real: posix.dup(parentFile.real),
        rights: { ...parentFile.rights },
      });
    }

    try {
      const binary = new Uint8Array(fs.readFileSync(executable));
      const module = new WebAssembly.Module(binary);
      const instance = new WebAssembly.Instance(
        module,
        childWasi.getImports(module)
      );
      try {
        childWasi.start(instance);
      } catch (err) {
        if (err?.cowasmWasiProcessExit) {
          exitCode = err.code ?? 0;
        } else if (err?.cowasmWasiProcessSignal) {
          exitCode = 128;
        } else {
          throw err;
        }
      }
      return exitCode;
    } finally {
      // Every descriptor in this child table was opened by the child WASI
      // instance or duplicated above. Descriptors that the command closed are
      // removed from the table by wasi-js, so only live descriptors remain.
      const realFds = new Set<number>();
      for (const file of childWasi.FD_MAP.values()) {
        realFds.add(file.real);
      }
      for (const fd of realFds) {
        try {
          fs.closeSync(fd);
        } catch (_err) {}
      }
    }
  }

  // map from wasi number to real fd number for inheritable descriptors plus
  // descriptors explicitly requested by subprocess pass_fds
  function getInheritableDescriptorsMap(
    fdsToKeep: number[] = []
  ): { [wasi_fd: number]: number } {
    const map: { [wasi_fd: number]: number } = {};
    for (const wasi_fd of wasi.FD_MAP.keys()) {
      const data = wasi.FD_MAP.get(wasi_fd);
      try {
        if (posix.is_inheritable(data.real)) {
          map[wasi_fd] = data.real;
        }
      } catch (err) {
        log("getInheritableDescriptorsMap", data.real, err);
      }
    }
    for (const wasi_fd of fdsToKeep) {
      const real = real_fd(wasi_fd);
      if (real != -1) {
        map[wasi_fd] = real;
      }
    }
    return map;
  }

  return {
    // We have to implement this since fcntl -- which python library calls -- is too
    // much of a no-op.  This is needed for subprocess support only, of course.
    // This can ONLY work on actual fd in the node.js process itself, e.g., pipes.
    // When we implement this in the browser, we will also have fd's that correspond
    // to pipes, where this works.
    python_wasm_set_inheritable: (fd: number, inheritable: number): number => {
      if (posix.set_inheritable == null) {
        // no-op on platform where we aren't going to ever fork anyways.
        return 0;
      }
      const real = real_fd(fd);
      if (real == -1) {
        throw Error("invalid file descriptor");
      }
      try {
        // This will fail if real isn't a pipe or actual native file descriptor.
        // In that case, we treat as a no-op, since there is nothing we can possibly do.
        posix.set_inheritable(real, !!inheritable);
      } catch (_) {
        return 0;
      }
      return 0;
    },

    // Our custom implementation of the entire fork-exec process.  We can't use Python's
    // since node.js would need to get run in the forked process to do arbitrarily complicated
    // things, and node.js is not written in a way to support actual forking.  In practice,
    // doing that sort of works, but **RANDOMLY CRASHES** and will drive you insane.  So
    // we just did the hard work and wrote this.
    python_wasm_fork_exec: (
      exec_array_ptr,
      argv_ptr,
      envp_ptr,
      cwd,
      p2cread,
      p2cwrite,
      c2pread,
      c2pwrite,
      errread,
      errwrite,
      errpipe_read,
      errpipe_write,
      close_fds,
      restore_signals,
      call_setsid,
      pgid_to_set,
      call_setgid,
      gid,
      call_setgroups,
      groups_size,
      groups,
      call_setuid,
      uid,
      child_umask,
      child_sigmask,
      py_fds_to_keep
    ): number => {
      log("called fork_exec");
      log("ignoring these: ", {
        restore_signals,
        call_setsid,
        pgid_to_set,
        call_setgid,
        gid,
        call_setgroups,
        groups_size,
        groups,
        call_setuid,
        uid,
        child_umask,
        child_sigmask,
      });

      log("before change", {
        p2cread,
        p2cwrite,
        c2pread,
        c2pwrite,
        errread,
        errwrite,
        errpipe_read,
        errpipe_write,
      });

      const err_map: number[] = [];
      const n2w = nativeToWasm(posix);
      for (let native_errno = 0; native_errno < 100; native_errno++) {
        err_map[native_errno] = n2w[native_errno] ?? constants.ENOENT;
      }

      const fdsToKeep = recv.arrayOfI32(py_fds_to_keep);
      const realFdsToKeep = fdsToKeep
        .map(real_fd)
        .filter((fd) => fd != -1);

      // if envp is empty, then explicitly give WASI_FD_INFO below; otherwise,
      // we just include WASI_FD_INFO in envp.
      const WASI_FD_INFO = JSON.stringify(
        getInheritableDescriptorsMap(fdsToKeep)
      );
      const envp = recv.arrayOfStrings(envp_ptr);
      if (envp.length > 0) {
        envp.push(`WASI_FD_INFO=${WASI_FD_INFO}`);
      }

      const execArray = recv.arrayOfStrings(exec_array_ptr);
      const argv = recv.arrayOfStrings(argv_ptr);
      const opts = {
        exec_array: execArray,
        argv,
        envp,
        cwd: recv.string(cwd),
        p2cread: real_fd(p2cread),
        p2cwrite: real_fd(p2cwrite),
        c2pread: real_fd(c2pread),
        c2pwrite: real_fd(c2pwrite),
        errread: real_fd(errread),
        errwrite: real_fd(errwrite),
        errpipe_read: real_fd(errpipe_read),
        errpipe_write: real_fd(errpipe_write),
        close_fds,
        fds_to_keep: realFdsToKeep,
        err_map,
        WASI_FD_INFO,
      };
      log("opts", opts);

      log("descriptors map = ", getInheritableDescriptorsMap(fdsToKeep));

      try {
        // Native fork/exec cannot launch a raw WASI command. Run commands with
        // the WASM magic directly through a fresh wasi-js instance and retain
        // the completed status behind a synthetic pid for waitpid().
        const executable = execArray.find((path) => {
          try {
            return fs.existsSync(path) && isWasm(path);
          } catch (_err) {
            return false;
          }
        });
        if (executable != null) {
          // A worker-backed child can read and write real pipes while Python
          // communicates concurrently. In particular, stdin=PIPE requires
          // fork/exec to return before the parent can supply the child's input.
          if (p2cwrite >= 0 || c2pread >= 0 || errread >= 0) {
            const pid = runWasiExecutableInWorker({
              executable,
              argv,
              envp,
              stdinFd: p2cread,
              stdoutFd: c2pwrite,
              stderrFd: errwrite,
            });
            if (pid != null) {
              log("started streaming WASI subprocess", { pid, executable });
              return pid;
            }
          }
          // A synchronous child cannot consume piped input because the parent
          // only writes after fork/exec returns. If worker threads are absent,
          // preserve the native fallback and its execution-format diagnostic.
          if (p2cwrite < 0) {
            // The child runs synchronously, so Python cannot consume a capture
            // pipe until this call returns. Redirect captured output through
            // anonymous seekable files to avoid deadlocking when a raw WASI
            // command writes more than the host pipe buffer can hold.
            spoolCapturedOutput(c2pread, c2pwrite);
            spoolCapturedOutput(errread, errwrite);
            const status = runWasiExecutable({
              executable,
              argv,
              envp,
              stdinFd: p2cread,
              stdoutFd: c2pwrite,
              stderrFd: errwrite,
            });
            const pid = allocateWasmPid();
            completedWasmProcesses().set(pid, (status & 0xff) << 8);
            log("completed WASI subprocess", { pid, status, executable });
            return pid;
          }
        }
        const pid = posix.fork_exec(opts);
        log("got subprocess = ", pid);
        return pid;
      } catch (err) {
        log("error doing fork", err);
        return -1;
      }
    },

    // Kind of similar to above but blocking and **supports webassembly programs**
    // through some amazing "magic":
    // extern int cowasm_vforkexec(char **argv, const char *path);
    cowasm_vforkexec: (argvPtr: number, pathPtr: number = 0): number => {
      let argv = recv.arrayOfStrings(argvPtr);
      const path = pathPtr ? recv.string(pathPtr) : "";
      log("cowasm_vforkexec", argv);
      if (!argv[0]) {
        log("cowasm_vforkexec", "no argv[0]");
        throw Error("argv[0] must be defined");
      }
      try {
        if (!argv[0].includes("/")) {
          // search path
          log("cowasm_vforkexec", "go through search path to find", argv[0]);
          for (const dir of path.split(":")) {
            const pathToCmd = join(resolve(dir), argv[0]);
            try {
              const stat = fs.statSync(pathToCmd);
              if (stat.mode & fs.constants.S_IXUSR) {
                argv[0] = pathToCmd;
                break;
              }
            } catch (_err) {}
          }
          log("cowasm_vforkexec", "found", argv[0]);
        }
        if (!argv[0].includes("/") || !fs.existsSync(argv[0])) {
          log("cowasm_vforkexec", "could not find executable");
          console.error(`${argv[0]}: not found\n`);
          // couldn't find it
          return 127;
        }
        const stat = fs.statSync(argv[0]);
        if (!(stat.mode & fs.constants.S_IXUSR)) {
          log(
            "cowasm_vforkexec",
            "executable has wrong permissions (missing IXUSR)"
          );
          console.error(`${argv[0]}: Permission denied\n`);
          // not executable
          return 126;
        }

        const wasm = isWasm(argv[0]);
        log("isWasm = ", wasm);
        if (wasm) {
          argv = resolveVizFilenames(argv);
          log("running wasm executable", argv[0]);
          return run(argv);
        } else if (child_process != null) {
          log("running native executable", argv[0]);
          return runNative(argv);
        }
        log("can't run anything");
        console.error(`${argv[0]}: cannot execute binary file\n`);
      } catch (err) {
        console.trace(`${argv[0]}: ${err}`);
      }
      // anything that didn't work
      return 127;
    },
  };
}
