import debug from "debug";
const log = debug("posix-zig");

// Map from nodejs to zig descriptions:
const nodeToZig = {
  arm64: "aarch64",
  x64: "x86_64",
  linux: "linux-gnu",
  darwin: "macos",
};

const name = `${nodeToZig[process.arch]}-${nodeToZig[process.platform]}`;

const LINUX_ONLY = [
  "getresuid",
  "getresgid",
  "setresgid",
  "setresuid",
  "fexecve",
  "_fexecve",
];

export interface Hostent {
  h_name: string;
  h_length: number;
  h_addrtype: number;
  h_addr_list: string[];
  h_aliases: string[];
}

export interface Addrinfo {
  ai_flags: number;
  ai_family: number;
  ai_socktype: number;
  ai_protocol: number;
  ai_addrlen: number;
  ai_canonname?: string;
  sa_len: number;
  sa_family: number;
  sa_data: Buffer;
}

interface StatsVFS {
  f_bsize: number;
  f_frsize: number;
  f_blocks: number;
  f_bfree: number;
  f_bavail: number;
  f_files: number;
  f_ffree: number;
  f_favail: number;
  f_fsid: number;
  f_flag: number;
  f_namemax: number;
}

interface PosixFunctions {
  // wrappers around some nodejs posix compat functions
  getpid: () => number;

  // constants
  constants: { [name: string]: number };

  // unistd:
  alarm: (seconds: number) => number;
  chroot: (path: string) => void;
  getegid: () => number;
  geteuid: () => number;
  gethostname: () => string;
  getpgid: (number) => number;
  getpgrp: () => number;
  getppid: () => number;
  setpgid: (pid: number, pgid: number) => void;
  setregid: (rgid: number, egid: number) => void;
  setreuid: (ruid: number, euid: number) => void;
  setsid: () => number;
  setegid: (gid: number) => void;
  seteuid: (uid: number) => void;
  sethostname: (name: string) => void;
  ttyname: (fd: number) => string;

  fork: () => number;
  pipe: () => { readfd: number; writefd: number };
  pipe2: (flags: number) => { readfd: number; writefd: number };

  getresuid: () => { ruid: number; euid: number; suid: number }; // linux only
  getresgid: () => { rgid: number; egid: number; sgid: number }; // linux only
  setresgid: (rgid: number, egid: number, sgid: number) => void; // linux only
  setresuid: (ruid: number, euid: number, suid: number) => void; // linux only

  execv: (pathname: string, argv: string[]) => number;

  execve: (
    pathname: string,
    argv: string[],
    env: { [key: string]: string } // more reasonable format to use from node.
  ) => number;
  _execve: (
    pathname: string,
    argv: string[],
    envp: string[] // same format at system call
  ) => number;
  fexecve: (
    // linux only
    fd: number,
    argv: string[],
    env: { [key: string]: string }
  ) => number;
  _fexecve: (fd: number, argv: string[], envp: string[]) => number; // linux only

  lockf: (fd: number, cmd: number, size: BigInt) => void;

  // other
  login_tty: (fd: number) => void;
  statvfs: (path: string) => StatsVFS;
  fstatvfs: (fd: number) => StatsVFS;
  ctermid: () => string;

  // netdb:
  gai_strerror: (errcode: number) => string;
  hstrerror: (errcode: number) => string;
  gethostbyname: (name: string) => Hostent;
  gethostbyaddr: (addr: string) => Hostent; // addr is ipv4 or ipv6 (both are supported)
  getaddrinfo: (
    node: string,
    service: string,
    hints?: {
      flags?: number;
      family?: number;
      socktype?: number;
      protocol?: number;
    }
  ) => Addrinfo[];
}

export type Posix = Partial<PosixFunctions>;

let mod: Posix = {};
let mod1: Posix = {};
try {
  mod = require(`./${name}.node`);

  if (process.platform != "linux") {
    for (const name of LINUX_ONLY) {
      delete mod[name];
    }
  }

  mod.getpid = () => process.pid;

  // provide some better public interfaces:
  mod["getaddrinfo"] = (node, service, hints) => {
    const f = mod["_getaddrinfo"];
    if (f == null) throw Error("getaddrinfo is not implemented");
    return f(
      node,
      service,
      hints?.flags ?? 0,
      hints?.family ?? 0,
      hints?.socktype ?? 0,
      hints?.protocol ?? 0
    );
  };
  // I could do the JSON in the extension module, but is that really better?
  mod["statvfs"] = (...args) => JSON.parse(mod["_statvfs"]?.(...args));
  mod["fstatvfs"] = (...args) => JSON.parse(mod["_fstatvfs"]?.(...args));

  const _execve = mod["_execve"];
  if (_execve != null) {
    mod["execve"] = (pathname, argv, env) => {
      return _execve(pathname, argv, mapToStrings(env));
    };
  }

  const _fexecve = mod["_fexecve"];
  if (_fexecve != null) {
    mod["fexecve"] = (pathname, argv, env) => {
      return _fexecve(pathname, argv, mapToStrings(env));
    };
  }

  for (const name in mod) {
    exports[name] = mod1[name] = (...args) => {
      log(name, args);
      return mod[name](...args);
    };
  }
  exports["constants"] = mod1.constants = mod["getConstants"]?.();
} catch (_err) {}

export default mod1;

function mapToStrings(obj: object): string[] {
  const v: string[] = [];
  for (const key in obj) {
    v.push(`${key}=${obj[key]}`);
  }
  return v;
}
