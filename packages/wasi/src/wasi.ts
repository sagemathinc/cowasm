/* MIT licensed.  See README.md for copyright and history information. */

import type {
  WASIBindings,
  WASIArgs,
  WASIEnv,
  WASIPreopenedDirs,
  WASIConfig,
} from "./types";

import { WASIError } from "./types";

import toBuffer from "typedarray-to-buffer";

import {
  WASI_ESUCCESS,
  WASI_EBADF,
  WASI_EINVAL,
  WASI_ENOSYS,
  WASI_EPERM,
  WASI_ENOTCAPABLE,
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
      // console.log("WASI error", err);
      const e: any = err;
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
  if (!entry) {
    throw new WASIError(WASI_EBADF);
  }
  if (entry.filetype === undefined) {
    const stats = wasi.bindings.fs.fstatSync(entry.real);
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

interface Rights {
  base: bigint;
  inheriting: bigint;
}

interface File {
  real: number;
  path?: string;
  fakePath?: string;
  rights: Rights;
  offset?: bigint;
  filetype?: WASI_FILETYPE;
}

type Exports = {
  [key: string]: any;
};

export default class WASI {
  memory: WebAssembly.Memory;
  view: DataView;
  FD_MAP: Map<number, File>;
  wasiImport: Exports;
  bindings: WASIBindings;

  constructor(wasiConfig: WASIConfig) {
    // Destructure our wasiConfig
    let preopens: WASIPreopenedDirs = {};
    if (wasiConfig.preopens) {
      preopens = wasiConfig.preopens;
    }

    let env: WASIEnv = {};
    if (wasiConfig && wasiConfig.env) {
      env = wasiConfig.env;
    }
    let args: WASIArgs = [];
    if (wasiConfig && wasiConfig.args) {
      args = wasiConfig.args;
    }
    let bindings = wasiConfig.bindings;

    // @ts-ignore
    this.memory = undefined;
    // @ts-ignore
    this.view = undefined;
    this.bindings = bindings;

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

    let fs = this.bindings.fs;
    let path = this.bindings.path;

    for (const [k, v] of Object.entries(preopens)) {
      const real = fs.openSync(v, fs.constants.O_RDONLY);
      const newfd = [...this.FD_MAP.keys()].reverse()[0] + 1;
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
        const bufLen = this.view.getUint32(ptr + 4, true);
        const buffer = new Uint8Array(this.memory.buffer, buf, bufLen);
        return toBuffer(buffer);
      });

      return buffers;
    };

    const CHECK_FD = (fd: number, rights: bigint) => {
      const stats = stat(this, fd);
      //console.log(`CHECK_FD: stats.real: ${stats.real}, stats.path:`, stats.path);
      if (rights !== BigInt(0) && (stats.rights.base & rights) === BigInt(0)) {
        throw new WASIError(WASI_EPERM);
      }
      return stats;
    };
    const CPUTIME_START = bindings.hrtime();

    const now = (clockId?: number) => {
      switch (clockId) {
        case WASI_CLOCK_MONOTONIC:
          return bindings.hrtime();
        case WASI_CLOCK_REALTIME:
          return msToNs(Date.now());
        case WASI_CLOCK_PROCESS_CPUTIME_ID:
        case WASI_CLOCK_THREAD_CPUTIME_ID:
          return bindings.hrtime() - CPUTIME_START;
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
        Object.entries(env).forEach(([key, value]) => {
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
        const envProcessed = Object.entries(env).map(
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

      fd_fdstat_set_flags: wrap((fd: number, _flags: number) => {
        CHECK_FD(fd, WASI_RIGHT_FD_FDSTAT_SET_FLAGS);
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
        const rstats = fs.fstatSync(stats.real);
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
          const rstats = fs.fstatSync(stats.real);
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
        // console.log("fd_prestat_get", { fd, stats });
        if (!stats.path) {
          return WASI_EINVAL;
        }
        this.refreshMemory();
        this.view.setUint8(bufPtr, WASI_PREOPENTYPE_DIR);
        this.view.setUint32(
          bufPtr + 4,
          // TODO: this is definitely completely wrong unless preopens=/.
          Buffer.byteLength(stats.fakePath ?? stats.path),
          true
        );
        return WASI_ESUCCESS;
      }),

      fd_prestat_dir_name: wrap(
        (fd: number, pathPtr: number, pathLen: number) => {
          const stats = CHECK_FD(fd, BigInt(0));
          if (!stats.path) {
            return WASI_EINVAL;
          }
          this.refreshMemory();
          Buffer.from(this.memory.buffer).write(
            stats.fakePath ?? stats.path /* TODO: wrong in general! */,
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
          let written = 0;
          getiovs(iovs, iovsLen).forEach((iov) => {
            // useful to be absolutely sure if wasi is writing something:
            // console.log(`write "${new TextDecoder().decode(iov)}" to ${fd})`);
            let w = 0;
            while (w < iov.byteLength) {
              // console.log(`write ${iov.byteLength} bytes to fd=${stats.real}`);
              const i = fs.writeSync(
                stats.real,
                iov,
                w,
                iov.byteLength - w,
                stats.offset ? Number(stats.offset) : null
              );
              // console.log(`just wrote i=${i} bytes`);
              if (stats.offset) stats.offset += BigInt(i);
              w += i;
            }
            written += w;
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
          const IS_STDIN = stats.real === 0;
          let read = 0;
          outer: for (const iov of getiovs(iovs, iovsLen)) {
            let r = 0;
            while (r < iov.byteLength) {
              let length = iov.byteLength - r;
              let position =
                IS_STDIN || stats.offset === undefined
                  ? null
                  : Number(stats.offset);
              let rr = fs.readSync(
                stats.real, // fd
                iov, // buffer
                r, // offset
                length, // length
                position // position
              );
              if (!IS_STDIN) {
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
          // We should not modify the offset of stdin
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
            const rstats = fs.statSync(path.resolve(stats.path, entry.name));
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
              const { size } = fs.fstatSync(stats.real);
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
          _flags: number,
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
          const rstats = fs.statSync(path.resolve(stats.path, p));
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
          const rstats = fs.fstatSync(stats.real);
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
          fd: number
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
          // console.log("** openpath: p = ", p);
          const fullUnresolved = path.resolve(stats.path, p);
          if (path.relative(stats.path, fullUnresolved).startsWith("..")) {
            return WASI_ENOTCAPABLE;
          }
          let full;
          try {
            full = fs.realpathSync(fullUnresolved);
            if (path.relative(stats.path, full).startsWith("..")) {
              return WASI_ENOTCAPABLE;
            }
          } catch (e) {
            if ((e as any)?.code === "ENOENT") {
              full = fullUnresolved;
            } else {
              // console.log("** openpath FAIL: p = ", p, e);
              throw e;
            }
          }
          /* check if the file is a directory (unless opening for write,
           * in which case the file may not exist and should be created) */
          let isDirectory;
          try {
            isDirectory = fs.statSync(full).isDirectory();
          } catch (e) {}

          let realfd;
          if (!write && isDirectory) {
            realfd = fs.openSync(full, fs.constants.O_RDONLY);
          } else {
            realfd = fs.openSync(full, noflags);
          }
          const newfd = [...this.FD_MAP.keys()].reverse()[0] + 1;
          // console.log(`** openpath got fd: p='${p}', fd=${newfd}`);
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
          stat(this, newfd);
          this.view.setUint32(fd, newfd, true);

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

      poll_oneoff: (
        sin: number,
        sout: number,
        nsubscriptions: number,
        nevents: number
      ) => {
        let eventc = 0;
        let waitEnd = 0;
        this.refreshMemory();
        for (let i = 0; i < nsubscriptions; i += 1) {
          const userdata = this.view.getBigUint64(sin, true);
          sin += 8;
          const type = this.view.getUint8(sin);
          sin += 1;
          switch (type) {
            case WASI_EVENTTYPE_CLOCK: {
              sin += 7; // padding
              //const identifier = this.view.getBigUint64(sin, true);
              sin += 8;
              const clockid = this.view.getUint32(sin, true);
              sin += 4;
              sin += 4; // padding
              const timestamp = this.view.getBigUint64(sin, true);
              sin += 8;
              //const precision = this.view.getBigUint64(sin, true);
              sin += 8;
              const subclockflags = this.view.getUint16(sin, true);
              sin += 2;
              sin += 6; // padding

              const absolute = subclockflags === 1;

              let e = WASI_ESUCCESS;
              const t = now(clockid);
              if (t == null) {
                e = WASI_EINVAL;
              } else {
                const end = absolute ? timestamp : BigInt(t) + timestamp;
                waitEnd = end > waitEnd ? (end as unknown as number) : waitEnd;
              }

              this.view.setBigUint64(sout, userdata, true);
              sout += 8;
              this.view.setUint16(sout, e, true); // error
              sout += 2; // pad offset 2
              this.view.setUint8(sout, WASI_EVENTTYPE_CLOCK);
              sout += 1; // pad offset 3
              sout += 5; // padding to 8

              eventc += 1;

              break;
            }
            case WASI_EVENTTYPE_FD_READ:
            case WASI_EVENTTYPE_FD_WRITE: {
              sin += 3; // padding
              //const fd = this.view.getUint32(sin, true);
              sin += 4;

              this.view.setBigUint64(sout, userdata, true);
              sout += 8;
              this.view.setUint16(sout, WASI_ENOSYS, true); // error
              sout += 2; // pad offset 2
              this.view.setUint8(sout, type);
              sout += 1; // pad offset 3
              sout += 5; // padding to 8

              eventc += 1;

              break;
            }
            default:
              return WASI_EINVAL;
          }
        }

        this.view.setUint32(nevents, eventc, true);

        while (bindings.hrtime() < waitEnd) {
          // nothing
        }

        return WASI_ESUCCESS;
      },

      proc_exit: (rval: number) => {
        bindings.exit(rval);
        return WASI_ESUCCESS;
      },

      proc_raise: (sig: number) => {
        if (!(sig in SIGNAL_MAP)) {
          return WASI_EINVAL;
        }
        bindings.kill(SIGNAL_MAP[sig]);
        return WASI_ESUCCESS;
      },

      random_get: (bufPtr: number, bufLen: number) => {
        this.refreshMemory();
        bindings.randomFillSync(
          new Uint8Array(this.memory.buffer),
          bufPtr,
          bufLen
        );
        // NOTE: upstream had "return WASI_ESUCCESS;" here, which is a major
        // bug, since this is supposed to return the *number of random bytes*.
        // This bug made it so Python hung mysteriously on startup, which tooks
        // me days of suffering to figure out. In particular, Python startup
        // hangs at py_getrandom in bootstrap_hash.c.
        return bufLen;
      },

      sched_yield() {
        // Single threaded environment
        // This is a no-op in JS
        return WASI_ESUCCESS;
      },

      sock_recv() {
        return WASI_ENOSYS;
      },

      sock_send() {
        return WASI_ENOSYS;
      },

      sock_shutdown() {
        return WASI_ENOSYS;
      },
    };
    // Wrap each of the imports to show the calls in the console
    if ((wasiConfig as WASIConfig).traceSyscalls) {
      Object.keys(this.wasiImport).forEach((key: string) => {
        const prevImport = this.wasiImport[key];
        this.wasiImport[key] = function (...args: any[]) {
          console.log(`wasi.${key} (${args})`);
          try {
            let result = prevImport(...args);
            console.log(` (wasi.${key} => ${result})`);
            return result;
          } catch (e) {
            console.log(`Caught error: ${e}`);
            throw e;
          }
        };
      });
    }
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

  start(instance: WebAssembly.Instance) {
    const exports = instance.exports;
    if (exports === null || typeof exports !== "object") {
      throw new Error(
        `instance.exports must be an Object. Received ${exports}.`
      );
    }
    const { memory } = exports;
    if (!(memory instanceof WebAssembly.Memory)) {
      throw new Error(
        `instance.exports.memory must be a WebAssembly.Memory. Recceived ${memory}.`
      );
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
}
