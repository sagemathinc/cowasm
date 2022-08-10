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

  // os module -- this isn't used directly by this module yet, but is used right now in python-wasm/wasm/worker/import.ts
  os?: any;
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
  traceSyscalls?: boolean;
  spinLock?: (time: number) => void;
  waitForStdin?: () => Buffer;
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
