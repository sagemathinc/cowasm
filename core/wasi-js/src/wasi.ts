/* MIT licensed.  See README.md for copyright and history information.

For API docs about what these functions below are supposed to be, see

https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md

and a TODO is copy/paste most of that as comments below.
*/



import debug from "debug";
const log = debug("wasi");
const logOpen = debug("wasi:open"); // just log opening files, which is useful

// See the comment in packages/cpython/src/pyconfig.h
// In particular, until we patch cpython itself, it's really
// only safe to set this to 256.  TODO: we plan to patch
// everything in cpython that falls back to 256 to instead
// use the value 32768.
const SC_OPEN_MAX = 32768;

import type {
  WASIBindings,
  WASIArgs,
  WASIEnv,
  WASIPreopenedDirs,
  WASIConfig,
  File,
} from "./types";

import { WASIError } from "./types";

import toBuffer from "typedarray-to-buffer";

import {
  WASI_ESUCCESS,
  WASI_EBADF,
  WASI_EINVAL,
  WASI_ENOSYS,
  WASI_EPERM,
  //WASI_ENOTCAPABLE,
  WASI_FILETYPE_UNKNOWN,
  WASI_FILETYPE_BLOCK_DEVICE,
  WASI_FILETYPE_CHARACTER_DEVICE,
  WASI_FILETYPE_DIRECTORY,
  WASI_FILETYPE_REGULAR_FILE,
  WASI_FILETYPE_SOCKET_STREAM,
  WASI_FILETYPE_SYMBOLIC_LINK,
  WASI_FILETYPE,
  WASI_FDFLAG_APPEND,
  WASI_FDFLAG_DSYNC,
  WASI_FDFLAG_NONBLOCK,
  WASI_FDFLAG_RSYNC,
  WASI_FDFLAG_SYNC,
  WASI_RIGHT_FD_DATASYNC,
  WASI_RIGHT_FD_READ,
  WASI_RIGHT_FD_SEEK,
  WASI_RIGHT_FD_FDSTAT_SET_FLAGS,
  WASI_RIGHT_FD_SYNC,
  WASI_RIGHT_FD_TELL,
  WASI_RIGHT_FD_WRITE,
  WASI_RIGHT_FD_ADVISE,
  WASI_RIGHT_FD_ALLOCATE,
  WASI_RIGHT_PATH_CREATE_DIRECTORY,
  WASI_RIGHT_PATH_CREATE_FILE,
  WASI_RIGHT_PATH_LINK_SOURCE,
  WASI_RIGHT_PATH_LINK_TARGET,
  WASI_RIGHT_PATH_OPEN,
  WASI_RIGHT_FD_READDIR,
  WASI_RIGHT_PATH_READLINK,
  WASI_RIGHT_PATH_RENAME_SOURCE,
  WASI_RIGHT_PATH_RENAME_TARGET,
  WASI_RIGHT_PATH_FILESTAT_GET,
  WASI_RIGHT_PATH_FILESTAT_SET_SIZE,
  WASI_RIGHT_PATH_FILESTAT_SET_TIMES,
  WASI_RIGHT_FD_FILESTAT_GET,
  WASI_RIGHT_FD_FILESTAT_SET_SIZE,
  WASI_RIGHT_FD_FILESTAT_SET_TIMES,
  WASI_RIGHT_PATH_SYMLINK,
  WASI_RIGHT_PATH_REMOVE_DIRECTORY,
  WASI_RIGHT_POLL_FD_READWRITE,
  WASI_RIGHT_PATH_UNLINK_FILE,
  RIGHTS_BLOCK_DEVICE_BASE,
  RIGHTS_BLOCK_DEVICE_INHERITING,
  RIGHTS_CHARACTER_DEVICE_BASE,
  RIGHTS_CHARACTER_DEVICE_INHERITING,
  RIGHTS_REGULAR_FILE_BASE,
  RIGHTS_REGULAR_FILE_INHERITING,
  RIGHTS_DIRECTORY_BASE,
  RIGHTS_DIRECTORY_INHERITING,
  RIGHTS_SOCKET_BASE,
  RIGHTS_SOCKET_INHERITING,
  RIGHTS_TTY_BASE,
  RIGHTS_TTY_INHERITING,
  WASI_CLOCK_MONOTONIC,
  WASI_CLOCK_PROCESS_CPUTIME_ID,
  WASI_CLOCK_REALTIME,
  WASI_CLOCK_THREAD_CPUTIME_ID,
  WASI_EVENTTYPE_CLOCK,
  WASI_EVENTTYPE_FD_READ,
  WASI_EVENTTYPE_FD_WRITE,
  WASI_FILESTAT_SET_ATIM,
  WASI_FILESTAT_SET_ATIM_NOW,
  WASI_FILESTAT_SET_MTIM,
  WASI_FILESTAT_SET_MTIM_NOW,
  WASI_O_CREAT,
  WASI_O_DIRECTORY,
  WASI_O_EXCL,
  WASI_O_TRUNC,
  WASI_PREOPENTYPE_DIR,
  WASI_STDIN_FILENO,
  WASI_STDOUT_FILENO,
  WASI_STDERR_FILENO,
  ERROR_MAP,
  SIGNAL_MAP,
  WASI_WHENCE_CUR,
  WASI_WHENCE_END,
  WASI_WHENCE_SET,
} from "./constants";

const STDIN_DEFAULT_RIGHTS =
  WASI_RIGHT_FD_DATASYNC |
  WASI_RIGHT_FD_READ |
  WASI_RIGHT_FD_SYNC |
  WASI_RIGHT_FD_ADVISE |
  WASI_RIGHT_FD_FILESTAT_GET |
  WASI_RIGHT_POLL_FD_READWRITE;
const STDOUT_DEFAULT_RIGHTS =
  WASI_RIGHT_FD_DATASYNC |
  WASI_RIGHT_FD_WRITE |
  WASI_RIGHT_FD_SYNC |
  WASI_RIGHT_FD_ADVISE |
  WASI_RIGHT_FD_FILESTAT_GET |
  WASI_RIGHT_POLL_FD_READWRITE;
const STDERR_DEFAULT_RIGHTS = STDOUT_DEFAULT_RIGHTS;

// I don't know what this *should* be, but I'm
// adding things as they are expected/implemented.
export const SOCKET_DEFAULT_RIGHTS =
  WASI_RIGHT_FD_DATASYNC |
  WASI_RIGHT_FD_READ |
  WASI_RIGHT_FD_WRITE |
  WASI_RIGHT_FD_ADVISE |
  WASI_RIGHT_FD_FILESTAT_GET |
  WASI_RIGHT_POLL_FD_READWRITE |
  WASI_RIGHT_FD_FDSTAT_SET_FLAGS;

const msToNs = (ms: number) => {
  const msInt = Math.trunc(ms);
  const decimal = BigInt(Math.round((ms - msInt) * 1000000));
  const ns = BigInt(msInt) * BigInt(1000000);
  return ns + decimal;
};

const nsToMs = (ns: number | bigint) => {
  if (typeof ns === "number") {
    ns = Math.trunc(ns);
  }
  const nsInt = BigInt(ns);
  return Number(nsInt / BigInt(1000000));
};

const wrap =
  <T extends Function>(f: T) =>
  (...args: any[]) => {
    try {
      return f(...args);
    } catch (err) {
      // log("WASI error", err);
      // console.trace(err);
      let e: any = err;

      // This is to support unionfs, e.g., in fd_write if a pipe
      // breaks, then unionfs raises "Error: EBADF: bad file descriptor, write",
      // but the relevant error is "prev: Error: EPIPE: broken pipe, write", which it saves.
      while (e.prev != null) {
        e = e.prev;
      }
      // If it's an error from the fs
      if (e?.code && typeof e?.code === "string") {
        return ERROR_MAP[e.code] || WASI_EINVAL;
      }
      // If it's a WASI error, we return it directly
      if (e instanceof WASIError) {
        return e.errno;
      }
      // Otherwise we let the error bubble up
      throw e;
    }
  };

const stat = (wasi: WASI, fd: number): File => {
  const entry = wasi.FD_MAP.get(fd);
  // console.log("stat", { fd, entry, FD_MAP: wasi.FD_MAP });
  // log("stat", { fd, entry, FD_MAP: wasi.FD_MAP });
  if (!entry) {
    throw new WASIError(WASI_EBADF);
  }
  if (entry.filetype === undefined) {
    const stats = wasi.fstatSync(entry.real);
    const { filetype, rightsBase, rightsInheriting } = translateFileAttributes(
      wasi,
      fd,
      stats
    );
    entry.filetype = filetype as WASI_FILETYPE;
    if (!entry.rights) {
      entry.rights = {
        base: rightsBase,
        inheriting: rightsInheriting,
      };
    }
  }
  return entry;
};

const translateFileAttributes = (
  wasi: WASI,
  fd: number | undefined,
  stats: any
) => {
  switch (true) {
    case stats.isBlockDevice():
      return {
        filetype: WASI_FILETYPE_BLOCK_DEVICE,
        rightsBase: RIGHTS_BLOCK_DEVICE_BASE,
        rightsInheriting: RIGHTS_BLOCK_DEVICE_INHERITING,
      };
    case stats.isCharacterDevice(): {
      const filetype = WASI_FILETYPE_CHARACTER_DEVICE;
      if (fd !== undefined && wasi.bindings.isTTY(fd)) {
        return {
          filetype,
          rightsBase: RIGHTS_TTY_BASE,
          rightsInheriting: RIGHTS_TTY_INHERITING,
        };
      }
      return {
        filetype,
        rightsBase: RIGHTS_CHARACTER_DEVICE_BASE,
        rightsInheriting: RIGHTS_CHARACTER_DEVICE_INHERITING,
      };
    }
    case stats.isDirectory():
      return {
        filetype: WASI_FILETYPE_DIRECTORY,
        rightsBase: RIGHTS_DIRECTORY_BASE,
        rightsInheriting: RIGHTS_DIRECTORY_INHERITING,
      };
    case stats.isFIFO():
      return {
        filetype: WASI_FILETYPE_SOCKET_STREAM,
        rightsBase: RIGHTS_SOCKET_BASE,
        rightsInheriting: RIGHTS_SOCKET_INHERITING,
      };
    case stats.isFile():
      return {
        filetype: WASI_FILETYPE_REGULAR_FILE,
        rightsBase: RIGHTS_REGULAR_FILE_BASE,
        rightsInheriting: RIGHTS_REGULAR_FILE_INHERITING,
      };
    case stats.isSocket():
      return {
        filetype: WASI_FILETYPE_SOCKET_STREAM,
        rightsBase: RIGHTS_SOCKET_BASE,
        rightsInheriting: RIGHTS_SOCKET_INHERITING,
      };
    case stats.isSymbolicLink():
      return {
        filetype: WASI_FILETYPE_SYMBOLIC_LINK,
        rightsBase: BigInt(0),
        rightsInheriting: BigInt(0),
      };
    default:
      return {
        filetype: WASI_FILETYPE_UNKNOWN,
        rightsBase: BigInt(0),
        rightsInheriting: BigInt(0),
      };
  }
};

type Exports = {
  [key: string]: any;
};

// const logToFile = (...args) => {
//   require("fs").appendFileSync(
//     "/tmp/wasi.log",
//     args.map((x) => `${x}`).join(" ") + "\n"
//   );
// };

let warnedAboutSleep = false;

// The js side of the wasi state.
interface State {
  env: WASIEnv;
  FD_MAP: Map<number, File>;
  bindings: WASIBindings;
}

export default class WASI {
  memory: WebAssembly.Memory;
  view: DataView;
  FD_MAP: Map<number, File>;
  wasiImport: Exports;
  bindings: WASIBindings;
  // This sleep is in milliseconds; it's NOT the libc sleep!
  sleep?: (milliseconds: number) => void;
  lastStdin: number = 0;
  getStdin?: (milliseconds?: number) => Buffer; // timeout milliseconds is never used
  stdinBuffer?: Buffer;
  sendStdout?: (Buffer) => void;
  sendStderr?: (Buffer) => void;
  env: WASIEnv = {};

  getState(): State {
    return { env: this.env, FD_MAP: this.FD_MAP, bindings: this.bindings };
  }

  setState(state: State) {
    this.env = state.env;
    this.FD_MAP = state.FD_MAP;
    this.bindings = state.bindings;
  }

  fstatSync(real_fd: number) {
    if (real_fd <= 2) {
      try {
        return this.bindings.fs.fstatSync(real_fd);
      } catch (_) {
        // In special case of stdin/stdout/stderr in some environments
        // (e.g., windows under electron) some of the actual file descriptors
        // aren't defined in the node process.  We thus fake it, since we
        // are virtualizing these in our code anyways.
        const now = new Date();
        return {
          dev: 0,
          mode: 8592,
          nlink: 1,
          uid: 0,
          gid: 0,
          rdev: 0,
          blksize: 65536,
          ino: 0,
          size: 0,
          blocks: 0,
          atimeMs: now.valueOf(),
          mtimeMs: now.valueOf(),
          ctimeMs: now.valueOf(),
          birthtimeMs: 0,
          atime: new Date(),
          mtime: new Date(),
          ctime: new Date(),
          birthtime: new Date(0),
        };
      }
    }
    // general case
    return this.bindings.fs.fstatSync(real_fd);
  }

  constructor(wasiConfig: WASIConfig) {
    this.sleep = wasiConfig.sleep;
    this.getStdin = wasiConfig.getStdin;
    this.sendStdout = wasiConfig.sendStdout;
    this.sendStderr = wasiConfig.sendStderr;
    // Destructure our wasiConfig
    let preopens: WASIPreopenedDirs = {};
    if (wasiConfig.preopens) {
      preopens = wasiConfig.preopens;
    }

    if (wasiConfig && wasiConfig.env) {
      this.env = wasiConfig.env;
    }
    let args: WASIArgs = [];
    if (wasiConfig && wasiConfig.args) {
      args = wasiConfig.args;
    }
    // @ts-ignore
    this.memory = undefined;

    // @ts-ignore
    this.view = undefined;
    this.bindings = wasiConfig.bindings;
    const fs = this.bindings.fs;
    this.FD_MAP = new Map([
      [
        WASI_STDIN_FILENO,
        {
          real: 0,
          filetype: WASI_FILETYPE_CHARACTER_DEVICE,
          // offset: BigInt(0),
          rights: {
            base: STDIN_DEFAULT_RIGHTS,
            inheriting: BigInt(0),
          },
          path: "/dev/stdin",
        },
      ],
      [
        WASI_STDOUT_FILENO,
        {
          real: 1,
          filetype: WASI_FILETYPE_CHARACTER_DEVICE,
          // offset: BigInt(0),
          rights: {
            base: STDOUT_DEFAULT_RIGHTS,
            inheriting: BigInt(0),
          },
          path: "/dev/stdout",
        },
      ],
      [
        WASI_STDERR_FILENO,
        {
          real: 2,
          filetype: WASI_FILETYPE_CHARACTER_DEVICE,
          // offset: BigInt(0),
          rights: {
            base: STDERR_DEFAULT_RIGHTS,
            inheriting: BigInt(0),
          },
          path: "/dev/stderr",
        },
      ],
    ]);

    const path = this.bindings.path;

    for (const [k, v] of Object.entries(preopens)) {
      const real = fs.openSync(v, fs.constants.O_RDONLY);
      const newfd = this.getUnusedFileDescriptor();
      this.FD_MAP.set(newfd, {
        real,
        filetype: WASI_FILETYPE_DIRECTORY,
        // offset: BigInt(0),
        rights: {
          base: RIGHTS_DIRECTORY_BASE,
          inheriting: RIGHTS_DIRECTORY_INHERITING,
        },
        fakePath: k,
        path: v,
      });
    }

    const getiovs = (iovs: number, iovsLen: number) => {
      // iovs* -> [iov, iov, ...]
      // __wasi_ciovec_t {
      //   void* buf,
      //   size_t buf_len,
      // }

      this.refreshMemory();

      const buffers = Array.from({ length: iovsLen }, (_, i) => {
        const ptr = iovs + i * 8;
        const buf = this.view.getUint32(ptr, true);
        let bufLen = this.view.getUint32(ptr + 4, true);
        // the mmap stuff in wasi tries to make this overwrite all
        // allocated memory, so we cap it or things crash.
        // TODO: maybe we need to allocate more memory?  I don't know!!
        if (bufLen > this.memory.buffer.byteLength - buf) {
//           console.log({
//             buf,
//             bufLen,
//             total_memory: this.memory.buffer.byteLength,
//           });
          log("getiovs: warning -- truncating buffer to fit in memory");
          bufLen = Math.min(
            bufLen,
            Math.max(0, this.memory.buffer.byteLength - buf)
          );
        }
        try {
          const buffer = new Uint8Array(this.memory.buffer, buf, bufLen);
          return toBuffer(buffer);
        } catch (err) {
          // don't hide this
          console.warn("WASI.getiovs -- invalid buffer", err);
          // but at least make it so we don't totally kill WASM, so we
          // get a traceback in the calling program (say python).
          // TODO: Right now this sort of thing happens with aggressive use of mmap,
          // but I plan to replace how mmap works with something that is viable.
          throw new WASIError(WASI_EINVAL);
        }
      });

      return buffers;
    };

    const CHECK_FD = (fd: number, rights: bigint) => {
      // log("CHECK_FD", { fd, rights });
      const stats = stat(this, fd);
      // log("CHECK_FD", { stats });
      if (rights !== BigInt(0) && (stats.rights.base & rights) === BigInt(0)) {
        throw new WASIError(WASI_EPERM);
      }
      return stats;
    };
    const CPUTIME_START = this.bindings.hrtime();

    const now = (clockId?: number) => {
      switch (clockId) {
        case WASI_CLOCK_MONOTONIC:
          return this.bindings.hrtime();
        case WASI_CLOCK_REALTIME:
          return msToNs(Date.now());
        case WASI_CLOCK_PROCESS_CPUTIME_ID:
        case WASI_CLOCK_THREAD_CPUTIME_ID: // TODO -- this assumes 1 thread
          return this.bindings.hrtime() - CPUTIME_START;
        default:
          return null;
      }
    };

    this.wasiImport = {
      args_get: (argv: number, argvBuf: number) => {
        this.refreshMemory();
        let coffset = argv;
        let offset = argvBuf;
        args.forEach((a) => {
          this.view.setUint32(coffset, offset, true);
          coffset += 4;
          offset += Buffer.from(this.memory.buffer).write(`${a}\0`, offset);
        });
        return WASI_ESUCCESS;
      },

      args_sizes_get: (argc: number, argvBufSize: number) => {
        this.refreshMemory();
        this.view.setUint32(argc, args.length, true);
        const size = args.reduce((acc, a) => acc + Buffer.byteLength(a) + 1, 0);
        this.view.setUint32(argvBufSize, size, true);
        return WASI_ESUCCESS;
      },

      environ_get: (environ: number, environBuf: number) => {
        this.refreshMemory();
        let coffset = environ;
        let offset = environBuf;
        Object.entries(this.env).forEach(([key, value]) => {
          this.view.setUint32(coffset, offset, true);
          coffset += 4;
          offset += Buffer.from(this.memory.buffer).write(
            `${key}=${value}\0`,
            offset
          );
        });
        return WASI_ESUCCESS;
      },

      environ_sizes_get: (environCount: number, environBufSize: number) => {
        this.refreshMemory();
        const envProcessed = Object.entries(this.env).map(
          ([key, value]) => `${key}=${value}\0`
        );
        const size = envProcessed.reduce(
          (acc, e) => acc + Buffer.byteLength(e),
          0
        );
        this.view.setUint32(environCount, envProcessed.length, true);
        this.view.setUint32(environBufSize, size, true);
        return WASI_ESUCCESS;
      },

      clock_res_get: (clockId: number, resolution: number) => {
        let res;
        switch (clockId) {
          case WASI_CLOCK_MONOTONIC:
          case WASI_CLOCK_PROCESS_CPUTIME_ID:
          case WASI_CLOCK_THREAD_CPUTIME_ID: {
            res = BigInt(1);
            break;
          }
          case WASI_CLOCK_REALTIME: {
            res = BigInt(1000);
            break;
          }
        }
        if (!res) {
          throw Error("invalid clockId");
        }
        this.view.setBigUint64(resolution, res);
        return WASI_ESUCCESS;
      },

      clock_time_get: (clockId: number, _precision: number, time: number) => {
        this.refreshMemory();
        const n = now(clockId);
        if (n === null) {
          return WASI_EINVAL;
        }
        this.view.setBigUint64(time, BigInt(n), true);
        return WASI_ESUCCESS;
      },

      fd_advise: wrap(
        (fd: number, _offset: number, _len: number, _advice: number) => {
          CHECK_FD(fd, WASI_RIGHT_FD_ADVISE);
          return WASI_ENOSYS;
        }
      ),

      fd_allocate: wrap((fd: number, _offset: number, _len: number) => {
        CHECK_FD(fd, WASI_RIGHT_FD_ALLOCATE);
        return WASI_ENOSYS;
      }),

      fd_close: wrap((fd: number) => {
        const stats = CHECK_FD(fd, BigInt(0));
        fs.closeSync(stats.real);
        this.FD_MAP.delete(fd);
        return WASI_ESUCCESS;
      }),

      fd_datasync: wrap((fd: number) => {
        const stats = CHECK_FD(fd, WASI_RIGHT_FD_DATASYNC);
        fs.fdatasyncSync(stats.real);
        return WASI_ESUCCESS;
      }),

      fd_fdstat_get: wrap((fd: number, bufPtr: number) => {
        const stats = CHECK_FD(fd, BigInt(0));
        // console.log("fd_fdstat_get", fd, stats);
        this.refreshMemory();
        if (stats.filetype == null) {
          throw Error("stats.filetype must be set");
        }
        this.view.setUint8(bufPtr, stats.filetype); // FILETYPE u8
        this.view.setUint16(bufPtr + 2, 0, true); // FDFLAG u16
        this.view.setUint16(bufPtr + 4, 0, true); // FDFLAG u16
        this.view.setBigUint64(bufPtr + 8, BigInt(stats.rights.base), true); // u64
        this.view.setBigUint64(
          bufPtr + 8 + 8,
          BigInt(stats.rights.inheriting),
          true
        ); // u64
        return WASI_ESUCCESS;
      }),

      /*
      fd_fdstat_set_flags

      Docs From upstream:
      Adjust the flags associated with a file descriptor.
      Note: This is similar to `fcntl(fd, F_SETFL, flags)` in POSIX.

      This could be supported via posix-node in general (when available)
      for sockets and stdin/stdout/stderr and genuine files (but not
      for memfs, obviously).  It's typically used by C programs for
      locking files, but most importantly for us, for setting whether
      reading from a fd is nonblocking (very important for stdin)
      or should time out after a certain amount of time (e.g., very
      important for a network socket).

      For now we implement this in a very small number of cases
      and return "Function not implemented" otherwise.
      */
      fd_fdstat_set_flags: wrap((fd: number, flags: number) => {
        // Are we allowed to set flags.  This more means: "is it implemented?".
        // Right now we only set this flag for sockets (that's done in the
        // external kernel module in src/wasm/posix/socket.ts).
        CHECK_FD(fd, WASI_RIGHT_FD_FDSTAT_SET_FLAGS);
        if (this.wasiImport.sock_fcntlSetFlags(fd, flags) == 0) {
          return WASI_ESUCCESS;
        }
        return WASI_ENOSYS;
      }),

      fd_fdstat_set_rights: wrap(
        (fd: number, fsRightsBase: bigint, fsRightsInheriting: bigint) => {
          const stats = CHECK_FD(fd, BigInt(0));
          const nrb = stats.rights.base | fsRightsBase;
          if (nrb > stats.rights.base) {
            return WASI_EPERM;
          }
          const nri = stats.rights.inheriting | fsRightsInheriting;
          if (nri > stats.rights.inheriting) {
            return WASI_EPERM;
          }
          stats.rights.base = fsRightsBase;
          stats.rights.inheriting = fsRightsInheriting;
          return WASI_ESUCCESS;
        }
      ),

      fd_filestat_get: wrap((fd: number, bufPtr: number) => {
        const stats = CHECK_FD(fd, WASI_RIGHT_FD_FILESTAT_GET);
        const rstats = this.fstatSync(stats.real);
        this.refreshMemory();
        this.view.setBigUint64(bufPtr, BigInt(rstats.dev), true);
        bufPtr += 8;
        this.view.setBigUint64(bufPtr, BigInt(rstats.ino), true);
        bufPtr += 8;
        if (stats.filetype == null) {
          throw Error("stats.filetype must be set");
        }
        this.view.setUint8(bufPtr, stats.filetype);
        bufPtr += 8;
        this.view.setBigUint64(bufPtr, BigInt(rstats.nlink), true);
        bufPtr += 8;
        this.view.setBigUint64(bufPtr, BigInt(rstats.size), true);
        bufPtr += 8;
        this.view.setBigUint64(bufPtr, msToNs(rstats.atimeMs), true);
        bufPtr += 8;
        this.view.setBigUint64(bufPtr, msToNs(rstats.mtimeMs), true);
        bufPtr += 8;
        this.view.setBigUint64(bufPtr, msToNs(rstats.ctimeMs), true);
        return WASI_ESUCCESS;
      }),

      fd_filestat_set_size: wrap((fd: number, stSize: number) => {
        const stats = CHECK_FD(fd, WASI_RIGHT_FD_FILESTAT_SET_SIZE);
        fs.ftruncateSync(stats.real, Number(stSize));
        return WASI_ESUCCESS;
      }),

      fd_filestat_set_times: wrap(
        (fd: number, stAtim: number, stMtim: number, fstflags: number) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_FD_FILESTAT_SET_TIMES);
          const rstats = this.fstatSync(stats.real);
          let atim = rstats.atime;
          let mtim = rstats.mtime;
          const n = nsToMs(now(WASI_CLOCK_REALTIME)!);
          const atimflags = WASI_FILESTAT_SET_ATIM | WASI_FILESTAT_SET_ATIM_NOW;
          if ((fstflags & atimflags) === atimflags) {
            return WASI_EINVAL;
          }
          const mtimflags = WASI_FILESTAT_SET_MTIM | WASI_FILESTAT_SET_MTIM_NOW;
          if ((fstflags & mtimflags) === mtimflags) {
            return WASI_EINVAL;
          }
          if ((fstflags & WASI_FILESTAT_SET_ATIM) === WASI_FILESTAT_SET_ATIM) {
            atim = nsToMs(stAtim);
          } else if (
            (fstflags & WASI_FILESTAT_SET_ATIM_NOW) ===
            WASI_FILESTAT_SET_ATIM_NOW
          ) {
            atim = n;
          }
          if ((fstflags & WASI_FILESTAT_SET_MTIM) === WASI_FILESTAT_SET_MTIM) {
            mtim = nsToMs(stMtim);
          } else if (
            (fstflags & WASI_FILESTAT_SET_MTIM_NOW) ===
            WASI_FILESTAT_SET_MTIM_NOW
          ) {
            mtim = n;
          }
          fs.futimesSync(stats.real, new Date(atim), new Date(mtim));
          return WASI_ESUCCESS;
        }
      ),

      fd_prestat_get: wrap((fd: number, bufPtr: number) => {
        const stats = CHECK_FD(fd, BigInt(0));
        // log("fd_prestat_get", { fd, stats });
        this.refreshMemory();
        this.view.setUint8(bufPtr, WASI_PREOPENTYPE_DIR);
        this.view.setUint32(
          bufPtr + 4,
          // TODO: this is definitely completely wrong unless preopens=/.
          // NOTE: when both paths are blank, we return "".  This is used by
          // cPython on sockets.   It used to raise an error here.
          Buffer.byteLength(stats.fakePath ?? stats.path ?? ""),
          true
        );
        return WASI_ESUCCESS;
      }),

      fd_prestat_dir_name: wrap(
        (fd: number, pathPtr: number, pathLen: number) => {
          const stats = CHECK_FD(fd, BigInt(0));
          this.refreshMemory();
          // NOTE: when both paths are blank, we return "".  This is used by
          // cPython on sockets.  It used to raise an error here.
          Buffer.from(this.memory.buffer).write(
            stats.fakePath ?? stats.path ?? "" /* TODO: wrong in general!? */,
            pathPtr,
            pathLen,
            "utf8"
          );
          return WASI_ESUCCESS;
        }
      ),

      fd_pwrite: wrap(
        (
          fd: number,
          iovs: number,
          iovsLen: number,
          offset: number,
          nwritten: number
        ) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_FD_WRITE | WASI_RIGHT_FD_SEEK);
          let written = 0;
          getiovs(iovs, iovsLen).forEach((iov) => {
            let w = 0;
            while (w < iov.byteLength) {
              w += fs.writeSync(
                stats.real,
                iov,
                w,
                iov.byteLength - w,
                Number(offset) + written + w
              );
            }
            written += w;
          });
          this.view.setUint32(nwritten, written, true);
          return WASI_ESUCCESS;
        }
      ),

      fd_write: wrap(
        (fd: number, iovs: number, iovsLen: number, nwritten: number) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_FD_WRITE);
          const IS_STDOUT = fd == WASI_STDOUT_FILENO;
          const IS_STDERR = fd == WASI_STDERR_FILENO;
          let written = 0;
          getiovs(iovs, iovsLen).forEach((iov) => {
            //console.log("fd_write", `"${new TextDecoder().decode(iov)}"`);
            if (iov.byteLength == 0) return;
            //             log(
            //               `writing to fd=${fd}: `,
            //               JSON.stringify(new TextDecoder().decode(iov)),
            //               JSON.stringify(iov)
            //             );
            if (IS_STDOUT && this.sendStdout != null) {
              this.sendStdout(iov);
              written += iov.byteLength;
            } else if (IS_STDERR && this.sendStderr != null) {
              this.sendStderr(iov);
              written += iov.byteLength;
            } else {
              // useful to be absolutely sure if wasi is writing something:
              // log(`write "${new TextDecoder().decode(iov)}" to ${fd})`);
              let w = 0;
              while (w < iov.byteLength) {
                // log(`write ${iov.byteLength} bytes to fd=${stats.real}`);
                const i = fs.writeSync(
                  stats.real,
                  iov,
                  w,
                  iov.byteLength - w,
                  stats.offset ? Number(stats.offset) : null
                );
                // log(`just wrote i=${i} bytes`);
                if (stats.offset) stats.offset += BigInt(i);
                w += i;
              }
              //console.log("fd_write", fd, "  wrote ", w);
              written += w;
            }
          });
          this.view.setUint32(nwritten, written, true);
          return WASI_ESUCCESS;
        }
      ),

      fd_pread: wrap(
        (
          fd: number,
          iovs: number,
          iovsLen: number,
          offset: number,
          nread: number
        ) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_FD_READ | WASI_RIGHT_FD_SEEK);
          let read = 0;
          outer: for (const iov of getiovs(iovs, iovsLen)) {
            let r = 0;
            while (r < iov.byteLength) {
              const length = iov.byteLength - r;
              const rr = fs.readSync(
                stats.real,
                iov,
                r,
                iov.byteLength - r,
                Number(offset) + read + r
              );
              r += rr;
              read += rr;
              // If we don't read anything, or we receive less than requested
              if (rr === 0 || rr < length) {
                break outer;
              }
            }
            read += r;
          }
          this.view.setUint32(nread, read, true);
          return WASI_ESUCCESS;
        }
      ),

      fd_read: wrap(
        (fd: number, iovs: number, iovsLen: number, nread: number) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_FD_READ);
          const IS_STDIN = fd == WASI_STDIN_FILENO;
          let read = 0;
          //           logToFile(
          //             `fd_read: ${IS_STDIN}, ${JSON.stringify(stats, (_, value) =>
          //               typeof value === "bigint" ? value.toString() : value
          //             )}, ${this.stdinBuffer?.length} ${this.stdinBuffer?.toString()}`
          //           );
          // console.log("fd_read", fd, stats, IS_STDIN, this.getStdin != null);
          outer: for (const iov of getiovs(iovs, iovsLen)) {
            let r = 0;
            while (r < iov.byteLength) {
              let length = iov.byteLength - r;
              let position =
                IS_STDIN || stats.offset === undefined
                  ? null
                  : Number(stats.offset);
              let rr = 0;
              if (IS_STDIN) {
                if (this.getStdin != null) {
                  if (this.stdinBuffer == null) {
                    this.stdinBuffer = this.getStdin();
                  }
                  if (this.stdinBuffer != null) {
                    // just got stdin after waiting for it in poll_oneoff
                    // TODO: Do we need to limit length or iov will overflow?
                    //       Or will the below just work fine?  It might.
                    // Second remark -- we do not do anything special here to try to
                    // handle seeing EOF (ctrl+d) in the stream.  No matter what I try,
                    // doing something here (e.g., returning 0 bytes read) doesn't
                    // properly work with libedit.   So we leave it alone and let
                    // our slightly patched libedit handle control+d.
                    // In particular note to self -- **handling of control+d is done in libedit!**
                    rr = this.stdinBuffer.copy(iov);
                    if (rr == this.stdinBuffer.length) {
                      this.stdinBuffer = undefined;
                    } else {
                      this.stdinBuffer = this.stdinBuffer.slice(rr);
                    }
                    if (rr > 0) {
                      // we read from stdin.
                      this.lastStdin = new Date().valueOf();
                    }
                  }
                } else {
                  // WARNING: might have to do something that burns 100% cpu... :-(
                  // though this is useful for debugging situations.
                  if (this.sleep == null && !warnedAboutSleep) {
                    warnedAboutSleep = true;
                    console.log(
                      "(cpu waiting for stdin: please define a way to sleep!) "
                    );
                  }
                  //while (rr == 0) {
                  try {
                    rr = fs.readSync(
                      stats.real, // fd
                      iov, // buffer
                      r, // offset
                      length, // length
                      position // position
                    );
                  } catch (_err) {}
                  if (rr == 0) {
                    this.shortPause();
                  } else {
                    this.lastStdin = new Date().valueOf();
                  }
                  //}
                }
              } else {
                rr = fs.readSync(
                  stats.real, // fd
                  iov, // buffer
                  r, // offset
                  length, // length
                  position // position
                );
              }
              // TODO: I'm not sure which type of files should have an offset yet.
              // E.g., obviously a regular file should and obviously stdin (a character
              // device) and a pipe (which has type WASI_FILETYPE_SOCKET_STREAM) does not.
              if (stats.filetype == WASI_FILETYPE_REGULAR_FILE) {
                stats.offset =
                  (stats.offset ? stats.offset : BigInt(0)) + BigInt(rr);
              }
              r += rr;
              read += rr;

              // If we don't read anything, or we receive less than requested
              if (rr === 0 || rr < length) {
                break outer;
              }
            }
          }
          // console.log("fd_read: nread=", read);
          this.view.setUint32(nread, read, true);
          return WASI_ESUCCESS;
        }
      ),

      fd_readdir: wrap(
        (
          fd: number,
          bufPtr: number,
          bufLen: number,
          cookie: number,
          bufusedPtr: number
        ) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_FD_READDIR);
          // log("fd_readdir got stats = ", stats);
          this.refreshMemory();
          const entries = fs.readdirSync(stats.path, { withFileTypes: true });
          const startPtr = bufPtr;
          for (let i = Number(cookie); i < entries.length; i += 1) {
            const entry = entries[i];
            let nameLength = Buffer.byteLength(entry.name);
            if (bufPtr - startPtr > bufLen) {
              break;
            }
            this.view.setBigUint64(bufPtr, BigInt(i + 1), true);
            bufPtr += 8;
            if (bufPtr - startPtr > bufLen) {
              break;
            }
            // We use lstat instead of stat, since stat fails on broken links.
            // Also, stat resolves the link giving the wrong inode!  On the other
            // hand, lstat works fine on non-links.  This is wrong in upstream,
            // which breaks testing test_compileall.py  in the python test suite,
            // due to doing os.scandir on a directory that contains a broken link.
            const rstats = fs.lstatSync(path.resolve(stats.path, entry.name));
            this.view.setBigUint64(bufPtr, BigInt(rstats.ino), true);
            bufPtr += 8;
            if (bufPtr - startPtr > bufLen) {
              break;
            }
            this.view.setUint32(bufPtr, nameLength, true);
            bufPtr += 4;
            if (bufPtr - startPtr > bufLen) {
              break;
            }
            let filetype;
            switch (true) {
              case rstats.isBlockDevice():
                filetype = WASI_FILETYPE_BLOCK_DEVICE;
                break;
              case rstats.isCharacterDevice():
                filetype = WASI_FILETYPE_CHARACTER_DEVICE;
                break;
              case rstats.isDirectory():
                filetype = WASI_FILETYPE_DIRECTORY;
                break;
              case rstats.isFIFO():
                filetype = WASI_FILETYPE_SOCKET_STREAM;
                break;
              case rstats.isFile():
                filetype = WASI_FILETYPE_REGULAR_FILE;
                break;
              case rstats.isSocket():
                filetype = WASI_FILETYPE_SOCKET_STREAM;
                break;
              case rstats.isSymbolicLink():
                filetype = WASI_FILETYPE_SYMBOLIC_LINK;
                break;
              default:
                filetype = WASI_FILETYPE_UNKNOWN;
                break;
            }
            this.view.setUint8(bufPtr, filetype);
            bufPtr += 1;
            bufPtr += 3; // padding
            if (bufPtr + nameLength >= startPtr + bufLen) {
              // It doesn't fit in the buffer
              break;
            }
            let memory_buffer = Buffer.from(this.memory.buffer);
            memory_buffer.write(entry.name, bufPtr);
            bufPtr += nameLength;
          }
          const bufused = bufPtr - startPtr;
          this.view.setUint32(bufusedPtr, Math.min(bufused, bufLen), true);
          return WASI_ESUCCESS;
        }
      ),

      fd_renumber: wrap((from: number, to: number) => {
        CHECK_FD(from, BigInt(0));
        CHECK_FD(to, BigInt(0));
        fs.closeSync((this.FD_MAP.get(from) as File).real);
        this.FD_MAP.set(from, this.FD_MAP.get(to) as File);
        this.FD_MAP.delete(to);
        return WASI_ESUCCESS;
      }),

      fd_seek: wrap(
        (
          fd: number,
          offset: number | bigint,
          whence: number,
          newOffsetPtr: number
        ) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_FD_SEEK);
          this.refreshMemory();
          switch (whence) {
            case WASI_WHENCE_CUR:
              stats.offset =
                (stats.offset ? stats.offset : BigInt(0)) + BigInt(offset);
              break;
            case WASI_WHENCE_END:
              const { size } = this.fstatSync(stats.real);
              stats.offset = BigInt(size) + BigInt(offset);
              break;
            case WASI_WHENCE_SET:
              stats.offset = BigInt(offset);
              break;
          }
          if (stats.offset == null) {
            throw Error("stats.offset must be defined");
          }
          this.view.setBigUint64(newOffsetPtr, stats.offset, true);
          return WASI_ESUCCESS;
        }
      ),

      fd_tell: wrap((fd: number, offsetPtr: number) => {
        const stats = CHECK_FD(fd, WASI_RIGHT_FD_TELL);
        this.refreshMemory();
        if (!stats.offset) {
          stats.offset = BigInt(0);
        }
        this.view.setBigUint64(offsetPtr, stats.offset, true);
        return WASI_ESUCCESS;
      }),

      fd_sync: wrap((fd: number) => {
        const stats = CHECK_FD(fd, WASI_RIGHT_FD_SYNC);
        fs.fsyncSync(stats.real);
        return WASI_ESUCCESS;
      }),

      path_create_directory: wrap(
        (fd: number, pathPtr: number, pathLen: number) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_PATH_CREATE_DIRECTORY);
          if (!stats.path) {
            return WASI_EINVAL;
          }
          this.refreshMemory();
          const p = Buffer.from(
            this.memory.buffer,
            pathPtr,
            pathLen
          ).toString();
          fs.mkdirSync(path.resolve(stats.path, p));
          return WASI_ESUCCESS;
        }
      ),

      path_filestat_get: wrap(
        (
          fd: number,
          flags: number,
          pathPtr: number,
          pathLen: number,
          bufPtr: number
        ) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_PATH_FILESTAT_GET);
          if (!stats.path) {
            return WASI_EINVAL;
          }
          this.refreshMemory();
          const p = Buffer.from(
            this.memory.buffer,
            pathPtr,
            pathLen
          ).toString();
          //console.log("path_filestat_get", p);
          let rstats;
          if (flags) {
            rstats = fs.statSync(path.resolve(stats.path, p));
          } else {
            // there is exactly one flag implemented called "__WASI_LOOKUPFLAGS_SYMLINK_FOLLOW";
            // it's 1 and is used to follow links, i.e.,
            // implement lstat -- this is ignored in upstream.
            // See zig/lib/libc/wasi/libc-bottom-half/cloudlibc/src/libc/sys/stat/fstatat.c
            rstats = fs.lstatSync(path.resolve(stats.path, p));
          }
          //console.log("path_filestat_get got", rstats)
          // NOTE: the output is the filestat struct as documented here
          // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-filestat-record
          // This does NOT even have a field for that.  This is considered an open bug in WASI:
          //   https://github.com/WebAssembly/wasi-filesystem/issues/34
          // That said, wasi does end up setting enough of st_mode so isdir works.
          this.view.setBigUint64(bufPtr, BigInt(rstats.dev), true);
          bufPtr += 8;
          this.view.setBigUint64(bufPtr, BigInt(rstats.ino), true);
          bufPtr += 8;
          this.view.setUint8(
            bufPtr,
            translateFileAttributes(this, undefined, rstats).filetype
          );
          bufPtr += 8;
          this.view.setBigUint64(bufPtr, BigInt(rstats.nlink), true);
          bufPtr += 8;
          this.view.setBigUint64(bufPtr, BigInt(rstats.size), true);
          bufPtr += 8;
          this.view.setBigUint64(bufPtr, msToNs(rstats.atimeMs), true);
          bufPtr += 8;
          this.view.setBigUint64(bufPtr, msToNs(rstats.mtimeMs), true);
          bufPtr += 8;
          this.view.setBigUint64(bufPtr, msToNs(rstats.ctimeMs), true);
          return WASI_ESUCCESS;
        }
      ),

      path_filestat_set_times: wrap(
        (
          fd: number,
          _dirflags: number,
          pathPtr: number,
          pathLen: number,
          stAtim: number,
          stMtim: number,
          fstflags: number
        ) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_PATH_FILESTAT_SET_TIMES);
          if (!stats.path) {
            return WASI_EINVAL;
          }
          this.refreshMemory();
          const rstats = this.fstatSync(stats.real);
          let atim = rstats.atime;
          let mtim = rstats.mtime;
          const n = nsToMs(now(WASI_CLOCK_REALTIME)!);
          const atimflags = WASI_FILESTAT_SET_ATIM | WASI_FILESTAT_SET_ATIM_NOW;
          if ((fstflags & atimflags) === atimflags) {
            return WASI_EINVAL;
          }
          const mtimflags = WASI_FILESTAT_SET_MTIM | WASI_FILESTAT_SET_MTIM_NOW;
          if ((fstflags & mtimflags) === mtimflags) {
            return WASI_EINVAL;
          }
          if ((fstflags & WASI_FILESTAT_SET_ATIM) === WASI_FILESTAT_SET_ATIM) {
            atim = nsToMs(stAtim);
          } else if (
            (fstflags & WASI_FILESTAT_SET_ATIM_NOW) ===
            WASI_FILESTAT_SET_ATIM_NOW
          ) {
            atim = n;
          }
          if ((fstflags & WASI_FILESTAT_SET_MTIM) === WASI_FILESTAT_SET_MTIM) {
            mtim = nsToMs(stMtim);
          } else if (
            (fstflags & WASI_FILESTAT_SET_MTIM_NOW) ===
            WASI_FILESTAT_SET_MTIM_NOW
          ) {
            mtim = n;
          }
          const p = Buffer.from(
            this.memory.buffer,
            pathPtr,
            pathLen
          ).toString();
          fs.utimesSync(
            path.resolve(stats.path, p),
            new Date(atim),
            new Date(mtim)
          );
          return WASI_ESUCCESS;
        }
      ),

      path_link: wrap(
        (
          oldFd: number,
          _oldFlags: number,
          oldPath: number,
          oldPathLen: number,
          newFd: number,
          newPath: number,
          newPathLen: number
        ) => {
          const ostats = CHECK_FD(oldFd, WASI_RIGHT_PATH_LINK_SOURCE);
          const nstats = CHECK_FD(newFd, WASI_RIGHT_PATH_LINK_TARGET);
          if (!ostats.path || !nstats.path) {
            return WASI_EINVAL;
          }
          this.refreshMemory();
          const op = Buffer.from(
            this.memory.buffer,
            oldPath,
            oldPathLen
          ).toString();
          const np = Buffer.from(
            this.memory.buffer,
            newPath,
            newPathLen
          ).toString();
          fs.linkSync(
            path.resolve(ostats.path, op),
            path.resolve(nstats.path, np)
          );
          return WASI_ESUCCESS;
        }
      ),

      path_open: wrap(
        (
          dirfd: number,
          _dirflags: number,
          pathPtr: number,
          pathLen: number,
          oflags: number,
          fsRightsBase: bigint | number,
          fsRightsInheriting: bigint | number,
          fsFlags: number,
          fdPtr: number
        ) => {
          const stats = CHECK_FD(dirfd, WASI_RIGHT_PATH_OPEN);
          fsRightsBase = BigInt(fsRightsBase);
          fsRightsInheriting = BigInt(fsRightsInheriting);

          const read =
            (fsRightsBase & (WASI_RIGHT_FD_READ | WASI_RIGHT_FD_READDIR)) !==
            BigInt(0);
          const write =
            (fsRightsBase &
              (WASI_RIGHT_FD_DATASYNC |
                WASI_RIGHT_FD_WRITE |
                WASI_RIGHT_FD_ALLOCATE |
                WASI_RIGHT_FD_FILESTAT_SET_SIZE)) !==
            BigInt(0);

          let noflags;
          if (write && read) {
            noflags = fs.constants.O_RDWR;
          } else if (read) {
            noflags = fs.constants.O_RDONLY;
          } else if (write) {
            noflags = fs.constants.O_WRONLY;
          }

          // fsRightsBase is needed here but perhaps we should do it in neededInheriting
          let neededBase = fsRightsBase | WASI_RIGHT_PATH_OPEN;
          let neededInheriting = fsRightsBase | fsRightsInheriting;

          if ((oflags & WASI_O_CREAT) !== 0) {
            noflags |= fs.constants.O_CREAT;
            neededBase |= WASI_RIGHT_PATH_CREATE_FILE;
          }
          if ((oflags & WASI_O_DIRECTORY) !== 0) {
            noflags |= fs.constants.O_DIRECTORY;
          }
          if ((oflags & WASI_O_EXCL) !== 0) {
            noflags |= fs.constants.O_EXCL;
          }
          if ((oflags & WASI_O_TRUNC) !== 0) {
            noflags |= fs.constants.O_TRUNC;
            neededBase |= WASI_RIGHT_PATH_FILESTAT_SET_SIZE;
          }

          // Convert file descriptor flags.
          if ((fsFlags & WASI_FDFLAG_APPEND) !== 0) {
            noflags |= fs.constants.O_APPEND;
          }
          if ((fsFlags & WASI_FDFLAG_DSYNC) !== 0) {
            if (fs.constants.O_DSYNC) {
              noflags |= fs.constants.O_DSYNC;
            } else {
              noflags |= fs.constants.O_SYNC;
            }
            neededInheriting |= WASI_RIGHT_FD_DATASYNC;
          }
          if ((fsFlags & WASI_FDFLAG_NONBLOCK) !== 0) {
            noflags |= fs.constants.O_NONBLOCK;
          }
          if ((fsFlags & WASI_FDFLAG_RSYNC) !== 0) {
            if (fs.constants.O_RSYNC) {
              noflags |= fs.constants.O_RSYNC;
            } else {
              noflags |= fs.constants.O_SYNC;
            }
            neededInheriting |= WASI_RIGHT_FD_SYNC;
          }
          if ((fsFlags & WASI_FDFLAG_SYNC) !== 0) {
            noflags |= fs.constants.O_SYNC;
            neededInheriting |= WASI_RIGHT_FD_SYNC;
          }
          if (
            write &&
            (noflags & (fs.constants.O_APPEND | fs.constants.O_TRUNC)) === 0
          ) {
            neededInheriting |= WASI_RIGHT_FD_SEEK;
          }

          this.refreshMemory();
          const p = Buffer.from(
            this.memory.buffer,
            pathPtr,
            pathLen
          ).toString();
          if (p == "dev/tty") {
            // special case: "the terminal".
            // This is used, e.g., in the "less" program in open_tty in ttyin.c
            // It will work to make a new tty if using the native os, but when
            // using a worker thread or in browser, it's much simpler to just
            // return stdin, which works fine (I think).
            this.view.setUint32(fdPtr, WASI_STDIN_FILENO, true);
            return WASI_ESUCCESS;
          }
          logOpen("path_open", p);
          if (p.startsWith("proc/")) {
            // Immediate error -- otherwise stuff will try to read from this,
            // which just isn't implemented, and will hang forever.
            // E.g., cython does.
            throw new WASIError(WASI_EBADF);
          }
          const fullUnresolved = path.resolve(stats.path, p);
          // I don't know why the original code blocked .., but that breaks
          // applications (e.g., tar), and this seems like the wrong layer at which to
          // be imposing security?
          //           if (path.relative(stats.path, fullUnresolved).startsWith("..")) {
          //             return WASI_ENOTCAPABLE;
          //           }
          let full;
          try {
            full = fs.realpathSync(fullUnresolved);
            //             if (path.relative(stats.path, full).startsWith("..")) {
            //               return WASI_ENOTCAPABLE;
            //             }
          } catch (e) {
            if ((e as any)?.code === "ENOENT") {
              full = fullUnresolved;
            } else {
              // log("** openpath FAIL: p = ", p, e);
              throw e;
            }
          }
          /* check if the file is a directory (unless opening for write,
           * in which case the file may not exist and should be created) */
          let isDirectory;
          if (write) {
            try {
              isDirectory = fs.statSync(full).isDirectory();
            } catch (_err) {
              //console.log(_err)
            }
          }
          let realfd;
          if (!write && isDirectory) {
            realfd = fs.openSync(full, fs.constants.O_RDONLY);
          } else {
            // console.log(`fs.openSync("${full}", ${noflags})`);
            realfd = fs.openSync(full, noflags);
          }
          const newfd = this.getUnusedFileDescriptor();
          // log(`** openpath got fd: p='${p}', fd=${newfd}`);
          this.FD_MAP.set(newfd, {
            real: realfd,
            filetype: undefined,
            // offset: BigInt(0),
            rights: {
              base: neededBase,
              inheriting: neededInheriting,
            },
            path: full,
          });
          // calling state here does some consistency checks
          // and set the filetype entry in the record created above.
          stat(this, newfd);
          this.view.setUint32(fdPtr, newfd, true);
          return WASI_ESUCCESS;
        }
      ),

      path_readlink: wrap(
        (
          fd: number,
          pathPtr: number,
          pathLen: number,
          buf: number,
          bufLen: number,
          bufused: number
        ) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_PATH_READLINK);
          if (!stats.path) {
            return WASI_EINVAL;
          }
          this.refreshMemory();
          const p = Buffer.from(
            this.memory.buffer,
            pathPtr,
            pathLen
          ).toString();
          const full = path.resolve(stats.path, p);
          const r = fs.readlinkSync(full);
          const used = Buffer.from(this.memory.buffer).write(r, buf, bufLen);
          this.view.setUint32(bufused, used, true);
          return WASI_ESUCCESS;
        }
      ),

      path_remove_directory: wrap(
        (fd: number, pathPtr: number, pathLen: number) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_PATH_REMOVE_DIRECTORY);
          if (!stats.path) {
            return WASI_EINVAL;
          }
          this.refreshMemory();
          const p = Buffer.from(
            this.memory.buffer,
            pathPtr,
            pathLen
          ).toString();
          fs.rmdirSync(path.resolve(stats.path, p));
          return WASI_ESUCCESS;
        }
      ),

      path_rename: wrap(
        (
          oldFd: number,
          oldPath: number,
          oldPathLen: number,
          newFd: number,
          newPath: number,
          newPathLen: number
        ) => {
          const ostats = CHECK_FD(oldFd, WASI_RIGHT_PATH_RENAME_SOURCE);
          const nstats = CHECK_FD(newFd, WASI_RIGHT_PATH_RENAME_TARGET);
          if (!ostats.path || !nstats.path) {
            return WASI_EINVAL;
          }
          this.refreshMemory();
          const op = Buffer.from(
            this.memory.buffer,
            oldPath,
            oldPathLen
          ).toString();
          const np = Buffer.from(
            this.memory.buffer,
            newPath,
            newPathLen
          ).toString();
          fs.renameSync(
            path.resolve(ostats.path, op),
            path.resolve(nstats.path, np)
          );
          return WASI_ESUCCESS;
        }
      ),

      path_symlink: wrap(
        (
          oldPath: number,
          oldPathLen: number,
          fd: number,
          newPath: number,
          newPathLen: number
        ) => {
          const stats = CHECK_FD(fd, WASI_RIGHT_PATH_SYMLINK);
          if (!stats.path) {
            return WASI_EINVAL;
          }
          this.refreshMemory();
          const op = Buffer.from(
            this.memory.buffer,
            oldPath,
            oldPathLen
          ).toString();
          const np = Buffer.from(
            this.memory.buffer,
            newPath,
            newPathLen
          ).toString();
          fs.symlinkSync(op, path.resolve(stats.path, np));
          return WASI_ESUCCESS;
        }
      ),

      path_unlink_file: wrap((fd: number, pathPtr: number, pathLen: number) => {
        const stats = CHECK_FD(fd, WASI_RIGHT_PATH_UNLINK_FILE);
        if (!stats.path) {
          return WASI_EINVAL;
        }
        this.refreshMemory();
        const p = Buffer.from(this.memory.buffer, pathPtr, pathLen).toString();
        fs.unlinkSync(path.resolve(stats.path, p));
        return WASI_ESUCCESS;
      }),

      // poll_oneoff: Concurrently poll for the occurrence of a set of events.
      //
      // TODO: this is NOT implemented properly yet in general.
      // It does read all the data from sin, etc.
      // correctly now, but it doesn't actually work correctly
      // when there are multiple subscriptions.
      // It works for:
      //     - one timer
      //     - one file descriptor corresponding to a socket and one timer,
      //       which is what poll with 1 fd and a timeout create.
      poll_oneoff: (
        sin: number,
        sout: number,
        nsubscriptions: number,
        neventsPtr: number
      ) => {
        let nevents = 0;
        let name = "";

        // May have to wait this long (this gets computed below in the WASI_EVENTTYPE_CLOCK case).

        let waitTimeNs = BigInt(0);

        let fd = -1;
        let fd_type: "read" | "write" = "read";
        let fd_timeout_ms = 0;

        const startNs = BigInt(this.bindings.hrtime());
        this.refreshMemory();
        let last_sin = sin;
        for (let i = 0; i < nsubscriptions; i += 1) {
          const userdata = this.view.getBigUint64(sin, true);
          sin += 8;
          const type = this.view.getUint8(sin);
          sin += 1;
          sin += 7; // padding
          if (log.enabled) {
            if (type == WASI_EVENTTYPE_CLOCK) {
              name = "poll_oneoff (type=WASI_EVENTTYPE_CLOCK): ";
            } else if (type == WASI_EVENTTYPE_FD_READ) {
              name = "poll_oneoff (type=WASI_EVENTTYPE_FD_READ): ";
            } else {
              name = "poll_oneoff (type=WASI_EVENTTYPE_FD_WRITE): ";
            }
            log(name);
          }
          switch (type) {
            case WASI_EVENTTYPE_CLOCK: {
              // see packages/zig/dist/lib/libc/include/wasm-wasi-musl/wasi/api.h
              // for exactly how these values are encoded.  I carefully looked
              // at that header and **this is definitely right**.  Same with the fd
              // in the other case below.
              const clockid = this.view.getUint32(sin, true);
              sin += 4;
              sin += 4; // padding
              const timeout = this.view.getBigUint64(sin, true);
              sin += 8;
              //const precision = this.view.getBigUint64(sin, true);
              sin += 8;
              const subclockflags = this.view.getUint16(sin, true);
              sin += 2;
              sin += 6; // padding

              const absolute = subclockflags === 1;
              if (log.enabled) {
                log(name, { clockid, timeout, absolute });
              }
              if (!absolute) {
                fd_timeout_ms = Number(timeout / BigInt(1000000));
              }

              let e = WASI_ESUCCESS;
              const t = now(clockid);
              // logToFile(t, clockid, timeout, subclockflags, absolute);
              if (t == null) {
                e = WASI_EINVAL;
              } else {
                const end = absolute ? timeout : t + timeout;
                const waitNs = end - t;
                if (waitNs > waitTimeNs) {
                  waitTimeNs = waitNs;
                }
              }

              this.view.setBigUint64(sout, userdata, true);
              sout += 8;
              this.view.setUint16(sout, e, true); // error
              sout += 2; // pad offset 2
              this.view.setUint8(sout, WASI_EVENTTYPE_CLOCK);
              sout += 1; // pad offset 1
              sout += 5; // padding to 8

              nevents += 1;

              break;
            }
            case WASI_EVENTTYPE_FD_READ:
            case WASI_EVENTTYPE_FD_WRITE: {
              /*
              Look at
               lib/libc/wasi/libc-bottom-half/cloudlibc/src/libc/sys/select/pselect.c
              to see how poll_oneoff is actually used by wasi to implement pselect.
              It's also used in
               lib/libc/wasi/libc-bottom-half/cloudlibc/src/libc/poll/poll.c

              "If none of the selected descriptors are ready for the
              requested operation, the pselect() or select() function shall
              block until at least one of the requested operations becomes
              ready, until the timeout occurs, or until interrupted by a signal."
              Thus what is supposed to happen below is supposed
              to block until the fd is ready to read from or write
              to, etc.

              For now at least if reading from stdin then we block for a short amount
              of time if getStdin defined; otherwise, we at least *pause* for a moment
              (to avoid cpu burn) if this.sleep is available.
              */
              fd = this.view.getUint32(sin, true);
              fd_type = type == WASI_EVENTTYPE_FD_READ ? "read" : "write";
              sin += 4;
              log(name, "fd =", fd);
              sin += 28;

              this.view.setBigUint64(sout, userdata, true);
              sout += 8;
              this.view.setUint16(sout, WASI_ENOSYS, true); // error
              sout += 2; // pad offset 2
              this.view.setUint8(sout, type);
              sout += 1; // pad offset 3
              sout += 5; // padding to 8

              nevents += 1;
              /*
              TODO: for now for stdin we are just doing a dumb hack.

              We just do something really naive, which is "pause for a little while".
              It seems to work for every application I have so far, from Python to
              to ncurses, etc.  This also makes it easy to have non-blocking sleep
              in node.js at the terminal without a worker thread, which is very nice!

              Before I had it block here via getStdin when available, but that does not work
              in general; in particular, it breaks ncurses completely. In
                 ncurses/tty/tty_update.c
              the following call is assumed not to block, and if it does, then ncurses
              interaction becomes totally broken:

                 select(SP_PARM->_checkfd + 1, &fdset, NULL, NULL, &ktimeout)

              */
              if (fd == WASI_STDIN_FILENO && WASI_EVENTTYPE_FD_READ == type) {
                this.shortPause();
              }

              break;
            }
            default:
              return WASI_EINVAL;
          }

          // Consistency check that we consumed exactly the right amount
          // of the __wasi_subscription_t. See zig/lib/libc/include/wasm-wasi-musl/wasi/api.h
          if (sin - last_sin != 48) {
            console.warn("*** BUG in wasi-js in poll_oneoff ", {
              i,
              sin,
              last_sin,
              diff: sin - last_sin,
            });
          }
          last_sin = sin;
        }

        this.view.setUint32(neventsPtr, nevents, true);

        if (nevents == 2 && fd >= 0) {
          const r = this.wasiImport.sock_pollSocket(fd, fd_type, fd_timeout_ms);
          if (r != WASI_ENOSYS) {
            // special implementation from outside
            return r;
          }
          // fall back to below
        }

        // Account for the time it took to do everything above, which
        // can be arbitrarily long:
        if (waitTimeNs > 0) {
          waitTimeNs -= BigInt(this.bindings.hrtime()) - startNs;
          // logToFile("waitTimeNs", waitTimeNs);
          if (waitTimeNs >= 1000000) {
            if (this.sleep == null && !warnedAboutSleep) {
              warnedAboutSleep = true;
              console.log(
                "(100% cpu burning waiting for stdin: please define a way to sleep!) "
              );
            }
            if (this.sleep != null) {
              // We are running in a worker thread, and have *some way*
              // to synchronously pause execution of this thread.  Yeah!
              const ms = nsToMs(waitTimeNs);
              this.sleep(ms);
            } else {
              // Use **horrible** 100% block and 100% cpu
              // wait, which might sort of work, but is obviously
              // a wrong nightmare.  Unfortunately, this is the
              // only possible thing to do when not running in
              // a work thread.
              const end = BigInt(this.bindings.hrtime()) + waitTimeNs;
              while (BigInt(this.bindings.hrtime()) < end) {
                // burn your CPU!
              }
            }
          }
        }

        return WASI_ESUCCESS;
      },

      proc_exit: (rval: number) => {
        this.bindings.exit(rval);
        return WASI_ESUCCESS;
      },

      proc_raise: (sig: number) => {
        if (!(sig in SIGNAL_MAP)) {
          return WASI_EINVAL;
        }
        this.bindings.kill(SIGNAL_MAP[sig]);
        return WASI_ESUCCESS;
      },

      random_get: (bufPtr: number, bufLen: number) => {
        this.refreshMemory();
        this.bindings.randomFillSync(
          new Uint8Array(this.memory.buffer),
          bufPtr,
          bufLen
        );
        return WASI_ESUCCESS;
        // NOTE: upstream had "return WASI_ESUCCESS;" here, which I thought was
        // a major bug, since getrandom returns the *number of random bytes*.
        // However, I think instead this was a bug in musl or libc or zig or something,
        // which got fixed in version  0.10.0-dev.4161+dab5bb924, since with that
        // release returning anything instead of success (=0) here actually
        // (Before returning 0 made it so Python hung mysteriously on startup, which tooks
        // me days of suffering to figure out. In particular, Python startup
        // hangs at py_getrandom in bootstrap_hash.c.)
        // return bufLen;
      },

      sched_yield() {
        // Single threaded environment
        // This is a no-op in JS
        return WASI_ESUCCESS;
      },

      // The client could overwrite these sock_*; that's what
      // CoWasm does in injectFunctions in
      //    packages/kernel/src/wasm/worker/posix-context.ts
      sock_recv() {
        return WASI_ENOSYS;
      },

      sock_send() {
        return WASI_ENOSYS;
      },

      sock_shutdown() {
        return WASI_ENOSYS;
      },

      sock_fcntlSetFlags(_fd: number, _flags: number) {
        return WASI_ENOSYS;
      },

      sock_pollSocket(
        _fd: number,
        _eventtype: "read" | "write",
        _timeout_ms: number
      ) {
        return WASI_ENOSYS;
      },
    };

    if (log.enabled) {
      // Wrap each of the imports to show the calls via the debug logger.
      // We ONLY do this if the logger is enabled, since it might
      // be expensive.
      Object.keys(this.wasiImport).forEach((key: string) => {
        const prevImport = this.wasiImport[key];
        this.wasiImport[key] = function (...args: any[]) {
          log(key, args);
          try {
            let result = prevImport(...args);
            log("result", result);
            return result;
          } catch (e) {
            log("error: ", e);
            throw e;
          }
        };
      });
    }
  }

  shortPause() {
    if (this.sleep == null) return;
    const now = new Date().valueOf();
    if (now - this.lastStdin > 2000) {
      // We have *some way* to synchronously pause execution of
      // this thread, so we sleep a little to avoid burning
      // 100% cpu.  But not right after reading input, since
      // otherwise typing feels laggy.
      // We can probably get rid of this entirely with a proper
      // wgetchar...
      this.sleep(50);
    }
  }

  // return an unused file descriptor.  It *will* be the smallest
  // available file descriptor, except we don't use 0,1,2
  getUnusedFileDescriptor(start = 3) {
    let fd = start;
    while (this.FD_MAP.has(fd)) {
      fd += 1;
    }
    if (fd > SC_OPEN_MAX) {
      throw Error("no available file descriptors");
    }
    return fd;
  }

  refreshMemory() {
    // @ts-ignore
    if (!this.view || this.view.buffer.byteLength === 0) {
      this.view = new DataView(this.memory.buffer);
    }
  }

  setMemory(memory: WebAssembly.Memory) {
    this.memory = memory;
  }

  start(instance: WebAssembly.Instance, memory?: WebAssembly.Memory) {
    const exports = instance.exports;
    if (exports === null || typeof exports !== "object") {
      throw new Error(
        `instance.exports must be an Object. Received ${exports}.`
      );
    }
    if (memory == null) {
      memory = exports.memory as any;
      if (!(memory instanceof WebAssembly.Memory)) {
        throw new Error(
          `instance.exports.memory must be a WebAssembly.Memory. Recceived ${memory}.`
        );
      }
    }

    this.setMemory(memory);
    if (exports._start) {
      (exports as any)._start();
    }
  }

  private getImportNamespace(module: WebAssembly.Module): string {
    let namespace: string | null = null;
    for (let imp of WebAssembly.Module.imports(module)) {
      // We only check for the functions
      if (imp.kind !== "function") {
        continue;
      }
      // We allow functions in other namespaces other than wasi
      if (!imp.module.startsWith("wasi_")) {
        continue;
      }
      if (!namespace) {
        namespace = imp.module;
      } else {
        if (namespace !== imp.module) {
          throw new Error("Multiple namespaces detected.");
        }
      }
    }
    return namespace!;
  }

  getImports(
    module: WebAssembly.Module
  ): Record<string, Record<string, Function>> {
    let namespace = this.getImportNamespace(module);
    switch (namespace) {
      case "wasi_unstable":
        return {
          wasi_unstable: this.wasiImport,
        };
      case "wasi_snapshot_preview1":
        return {
          wasi_snapshot_preview1: this.wasiImport,
        };
      default:
        throw new Error(
          "Can't detect a WASI namespace for the WebAssembly Module"
        );
    }
  }

  initWasiFdInfo() {
    // TODO: this is NOT used yet. It currently crashes.
    if (this.env["WASI_FD_INFO"] != null) {
      // If the environment variable WASI_FD_INFO is set to the
      // JSON version of a map from wasi fd's to real fd's, then
      // we also initialize FD_MAP with that, assuming these
      // are all inheritable file descriptors for ends of pipes.
      // This is something added for
      // python-wasm fork/exec support.
      const fdInfo = JSON.parse(this.env["WASI_FD_INFO"]);
      for (const wasi_fd in fdInfo) {
        console.log(wasi_fd);
        const fd = parseInt(wasi_fd);
        if (this.FD_MAP.has(fd)) {
          continue;
        }
        const real = fdInfo[wasi_fd];
        try {
          // check the fd really exists
          this.fstatSync(real);
        } catch (_err) {
          console.log("discarding ", { wasi_fd, real });
          continue;
        }
        const file = {
          real,
          filetype: WASI_FILETYPE_SOCKET_STREAM,
          rights: {
            base: STDIN_DEFAULT_RIGHTS, // TODO
            inheriting: BigInt(0),
          },
        } as File;
        this.FD_MAP.set(fd, file);
      }
      console.log("after initWasiFdInfo: ", this.FD_MAP);
      console.log("fdInfo = ", fdInfo);
    } else {
      console.log("no WASI_FD_INFO");
    }
  }
}
