// Map from nodejs to zig descriptions:

const nodeToZig = {
  arm64: "aarch64",
  x64: "x86_64",
  linux: "linux-gnu",
  darwin: "macos",
};

const name = `${nodeToZig[process.arch]}-${nodeToZig[process.platform]}`;

interface Hostent {
  h_name: string;
  h_length: number;
  h_addrtype: number;
  h_addr_list: string[];
  h_aliases: string[];
}

interface PosixFunctions {
  // unistd:
  chroot: (path: string) => void;
  getegid: () => number;
  geteuid: () => number;
  gethostname: () => string;
  getpgid: (number) => number;
  getppid: () => number;
  setpgid: (pid: number, pgid: number) => void;
  setregid: (rgid: number, egid: number) => void;
  setreuid: (ruid: number, euid: number) => void;
  setsid: () => number;
  setegid: (gid: number) => void;
  seteuid: (uid: number) => void;
  sethostname: (name: string) => void;
  ttyname: (fd: number) => string;

  // netdb:
  gethostbyname: (name: string) => Hostent;
  gethostbyaddr: (addr: string) => Hostent;  // addr is ipv4 or ipv6
}

export type Posix = Partial<PosixFunctions>;

let mod: Posix = {};
try {
  mod = require(`./${name}.node`);
  for (const name in mod) {
    exports[name] = mod[name];
  }
} catch (_err) {}

export default mod;
