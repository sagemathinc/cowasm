import type WASIFileSystem from "./filesystem";
export type { WASIFileSystem };
import { WASI_FILETYPE } from "./constants";

// export interface WASIFileSystem extends FileSystem {
//   constants: { [name: string]: number };
//   open: (
//     path: string,
//     flags: number | string,
//     mode?: string
//   ) => Promise<number>;
//   openSync: (path: string, flags: number | string, mode?: string) => number;
// }

export interface WASIBindings {
  // Current high-resolution real time in a bigint
  hrtime: () => bigint;
  // Process functions
  exit: (rval: number) => void;
  kill: (signal: string) => void;
  // Crypto functions
  randomFillSync: Function;
  // isTTY
  isTTY: (fd: number) => boolean;

  // Filesystem
  fs: any;

  // Path
  path: any;

  // The following modules arne't used directly by this module yet, but is used
  // right now in python-wasm/wasm/worker/import.ts
  os?: any;
  child_process?: any;
  posix?: any;
}

export type WASIArgs = string[];
export interface WASIEnv {
  [key: string]: string | undefined;
}
export interface WASIPreopenedDirs {
  [key: string]: string;
}

export interface WASIConfig {
  preopens?: WASIPreopenedDirs;
  env?: WASIEnv;
  args?: WASIArgs;
  bindings: WASIBindings;

  // sleep: should be blocking sleep for the given number of milliseconds
  sleep?: (milliseconds: number) => void;

  // blocking get something from stdin; blocks waiting for some stdin to appear
  getStdin?: () => Buffer;

  // send any stdout we receive; in particular, when the write call happens, instead
  // of actually writing to stdout, this function is called with the data that would
  // have been written to stdout.  This makes it easy to capture stdout and stderr
  // at the wasi level, rather than at the filesystem level (via bindings.fs).
  sendStdout?: (Buffer) => void;
  sendStderr?: (Buffer) => void;
}

export class WASIError extends Error {
  errno: number;
  constructor(errno: number) {
    super();
    this.errno = errno;
    Object.setPrototypeOf(this, WASIError.prototype);
  }
}

export class WASIExitError extends Error {
  code: number | null;
  constructor(code: number | null) {
    super(`WASI Exit error: ${code}`);
    this.code = code;
    Object.setPrototypeOf(this, WASIExitError.prototype);
  }
}

export class WASIKillError extends Error {
  signal: string;
  constructor(signal: string) {
    super(`WASI Kill signal: ${signal}`);
    this.signal = signal;
    Object.setPrototypeOf(this, WASIKillError.prototype);
  }
}

interface Rights {
  base: bigint;
  inheriting: bigint;
}

export interface File {
  real: number;
  path?: string;
  fakePath?: string;
  rights: Rights;
  offset?: bigint;
  filetype?: WASI_FILETYPE;
}
