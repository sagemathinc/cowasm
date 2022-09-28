# Missing Posix Functions for Node.js -- via a native module written in Zig

`posiz-zig` is a Node.js native module written using Zig that provides access to Posix functions not in node that are needed to fully support WebAssembly modules. It includes precompiled binaries for `[x86_64/aarch64]-[macos/linux]`, and falls back to empty functionality on all other platforms.  In particular, this doesn't support any functionality on Windows yet.  On Windows, the import provides an empty collection of functions.

This builds using the new _**self\-hosted stage2**_ zig compiler, i.e., the latest development version.

Install it:

```
npm install posix-node
```

Then

```js
import { posix } from "posix-node";
posix.gethostname()
// 'example.com'
```

See [src/index.ts](src/index.ts) for what is available and what the Typescript types are.

## Supported Functions

See [index.ts](./src/index.ts), which includes these functions.  Check that file, since there might be more not listed here.

```ts
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
```

## Why?

There is an [npm module called posix](https://www.npmjs.com/package/posix), which claims to provide _"The missing POSIX system calls for Node."_, but there are many calls that I want that are missing, at least for
my application to https://zython.org/, since CPython exposes _**all**_ of Posix. Also, the Zig code here is hopefully likely to be easier to maintain and extend. The [posix npm module](https://www.npmjs.com/package/posix) also has a [high severity vulnerability](https://github.com/ohmu/node-posix/issues/66), but hasn't been updated in a while \(see note below\).

## Why Zig?

[Zig](https://ziglang.org/) is very easy to install, and makes it simple to cross compile for many architectures, and provides much better compile time sanity checks than C.

I'm not using [node\-gyp](https://github.com/nodejs/node-gyp) since I have a
specific target list of platforms where I need this module to work, and using
Zig I can easily build binaries for all of them.  It's also very important to build for all supported platforms as part of the dev process, since the precise details of how these functions are implemented depends on the platform.  The binaries are small, since they are just lightweight wrappers around calls to libc, which is dynamically linked by the operating system. I can thus include all target binaries with the npm package, and it is still only 1.2MB.

## Also posix\-browser

We also plan to build a [browser analogue called posix-browser](https://www.npmjs.com/package/posix-browser) of this package with the _**same API**_, but of course a very different underlying implementation \(or implementations\), similar to how emscripten has browser functions like here that do things like making up random ip addresses \(or using a table\) to simulate netdb.  This is very useful for porting software to the browser and automated testing.

## ESM Module

This is built as an ESM module.  However, we have to use the [esm package](https://www.npmjs.com/package/esm) and _**not**_ `"type":"module"` in `package.json`, as explained [here](https://stackoverflow.com/questions/66378682/nodejs-loading-es-modules-and-native-addons-in-the-same-project), because this package includes _**native binary**_ `.node` files, and there seems to be no good non\-experimental way to load them at present using ESM.

## License and acknowledgements

This is licensed BSD-3 clause. The template for using Zig to build node.js native modules is https://github.com/staltz/zig-nodejs-example

## CVE-2022-21211 in the posix package

The [posix package](https://www.npmjs.com/package/posix) mentioned above has an unpatched vulnerability, in that some input will cause it to crash node. Here's [the
demonstration](https://security.snyk.io/vuln/SNYK-JS-POSIX-2400719), which
does NOT crash posix\-node.

```js
const posix = require("posix-node"); // put "posix" with that installed to crash node

try {
  console.log("[!] Trying invocation");
  posix.setegid({ toString: 1 });
  console.log("[!] Made it!");
} catch (e) {
  console.log("[!] Excepted");
  console.error(e);
}
console.log("but we ok");
```

