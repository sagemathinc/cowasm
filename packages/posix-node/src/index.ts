import { log } from "./logging";

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

export interface Sockaddr {
  sa_len: number;
  sa_family: number;
  sa_data: Buffer;
}

export interface Addrinfo extends Sockaddr {
  ai_flags: number;
  ai_family: number;
  ai_socktype: number;
  ai_protocol: number;
  ai_addrlen: number;
  ai_canonname?: string;
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

// Actuall possibilities:
//   | ["addclose", number]
//   | ["addopen", number, number, number, number]
//   | ["adddup2", number, number];
type PosixSpawnFileActions = any[];

interface PosixSpawnAttributes {
  sched_priority?: number;
  schedpolicy?: number;
  flags?: number;
  pgroup?: number;
  sigmask?: Set<number> | number[];
  sigdefault?: Set<number> | number[];
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
  // Blocking sleep.  This is sleep in *INTEGER* seconds not milliseconds.
  sleep: (seconds: number) => number;
  // Blocing sleep for up to 1 seconds, in microseconds; do NOT give input >= 1000000.
  usleep: (microseconds: number) => number;

  ttyname: (fd: number) => string;
  dup: (oldfd: number) => number;
  dup2: (oldfd: number, newfd: number) => number;

  // Change the current directory at the C library / process level; this is not the same as process.chdir(...)!
  chdir: (path: string) => void;
  // Get the C library / process level cwd; in general not the same as process.cwd()!
  getcwd: () => string;

  fork: () => number;

  // Completely stopping the libuv event loop might be useful in conjunction
  // with fork/exec*.
  close_event_loop: () => void;

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

  // A fork_exec implementation that is as close as possible to the one in Modules/_posixsubprocess.c in the CPython.
  // We need this for python-wasm.  It forks, then execs each element of exec_array until one works.  It also uses
  // the file descriptor errpipe_write to communicate failure at doing all the stuff leading up to execv, using
  // the protocol that cPython defines for this.
  fork_exec: (args: {
    exec_array: string[];
    argv: string[];
    envp: string[];
    cwd: string;
    p2cread: number;
    p2cwrite: number;
    c2pread: number;
    c2pwrite: number;
    errread: number;
    errwrite: number;
    errpipe_read: number;
    errpipe_write: number;
    fds_to_keep: number[];
    err_map: number[]; // err_map[native errno] = wasm errno; needed to write correct hex code to errpipe_write.
    WASI_FD_INFO: string; // this env variable is set after fork and before exec (ignored if envp is set); it is used by wasi-js.
  }) => number;
  // This is useful before using fork_exec.  It calls fcntl twice.
  set_inheritable: (fd: number, inheritable: boolean) => void;
  is_inheritable: (fd: number) => boolean;

  lockf: (fd: number, cmd: number, size: BigInt) => void;

  // This posix call is interesting -- it lets you suspend a node.js
  // process temporarily, which isn't a normal nodejs feature.
  pause: () => number;

  // NOTE: node.js has require('os').networkInterfaces(), but it is not
  // equivalent to the system calls in net/if.h, e.g., because it only returns
  // info about network interfaces that have been assigned an address.
  if_indextoname: (ifindex: number) => string;
  if_nametoindex: (ifname: string) => number;
  // output is array of pairs (index, 'name')
  if_nameindex: () => [number, string][];

  // spawn
  _posix_spawn: (
    path: string,
    fileActions,
    attrs,
    argv: string[],
    envp: string[], // same format at system call
    p_version: boolean
  ) => number;

  posix_spawn: (
    path: string,
    fileActions: PosixSpawnFileActions | undefined | null,
    attrs: PosixSpawnAttributes | undefined | null,
    argv: string[],
    envp: { [key: string]: string } | string[]
  ) => number;

  posix_spawnp: (
    path: string,
    fileActions: PosixSpawnFileActions | undefined | null,
    attrs: PosixSpawnAttributes | undefined | null,
    argv: string[],
    envp: { [key: string]: string } | string[]
  ) => number;

  // wait

  wait: () => {
    wstatus: number;
    ret: number;
  };

  // options is an or of these: constants.WNOHANG, constants.WUNTRACED, constants.WCONTINUED
  waitpid: (
    pid: number,
    options: number
  ) => {
    wstatus: number;
    ret: number;
  };

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

  // socket:
  // Create a socket. Returns the file descriptor
  socket: (family: number, socktype: number, protocol: number) => number;
  // Bind a socket to an address.
  bind: (socket: number, sockaddr: Sockaddr) => void;

  // termios sort of things; this is NOT done in a general way wrapping the api,
  // but instead implements things that node doesn't provide.
  // Blocking read of a single (wide!) character from stdin.  This is something
  // you call from a script, not from the node.js REPL, where it will immediately EOF.
  // The point is this is a useful building block for creating your own terminal.
  // See demo/terminal.js
  getChar: () => string;
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

  mod["bind"] = (socket: number, sockaddr: Sockaddr) => {
    return mod["_bind"](
      socket,
      sockaddr.sa_len,
      sockaddr.sa_family,
      sockaddr.sa_data
    );
  };

  for (const name of ["execve", "fexecve"]) {
    const f = mod["_" + name];
    if (f != null) {
      mod[name] = (pathname, argv, env) => {
        return f(pathname, argv, mapToStrings(env));
      };
    }
  }

  const { _posix_spawn } = mod;
  if (_posix_spawn != null) {
    for (const name of ["posix_spawn", "posix_spawnp"]) {
      mod[name] = (
        path,
        fileActions,
        attrs: PosixSpawnAttributes,
        argv,
        env
      ) => {
        if (attrs == null) {
          attrs = {};
        } else {
          // from Set([...]) to [...], which is easier to work with from Zig via node api.
          if (attrs.sigmask != null) {
            attrs.sigmask = Array.from(attrs.sigmask);
          }
          if (attrs.sigdefault != null) {
            attrs.sigdefault = Array.from(attrs.sigdefault);
          }
        }
        return _posix_spawn(
          path,
          fileActions ?? [],
          attrs ?? {},
          argv,
          mapToStrings(env),
          name.endsWith("spawnp")
        );
      };
    }
  }

  for (const name in mod) {
    exports[name] = mod1[name] = (...args) => {
      if (name != "chdir") log(name, args);
      const res = mod[name](...args);
      if (name != "chdir") log(name, "returned", res);
      return res;
    };
  }
  exports["constants"] = mod1.constants = mod["getConstants"]?.();
} catch (_err) {}

export default mod1;

function is_array(obj: any): boolean {
  return Object.prototype.toString.call(obj) === "[object Array]";
}

function mapToStrings(obj: object | string[]): string[] {
  if (is_array(obj)) {
    // already array of strings...
    return obj as unknown as string[];
  }
  const v: string[] = [];
  for (const key in obj) {
    v.push(`${key}=${obj[key]}`);
  }
  return v;
}
