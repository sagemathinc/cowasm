# Missing Posix Functions for Node.js -- via a native module written in Zig

**STATUS:** Nothing yet -- I'm just grabbing the package name.

Node.js native module written using Zig that provides access to Posix functions not in node that are needed to fully support WebAssembly modules. Includes precompiled binaries for [x86_64/aarch64]-[macos/linux], and falls back to empty functionality on all other platforms.  

We don't support any functionality on Windows, because it is not Posix.  Everything partially posix for Windows is already in node.js. 

## Why?

There is an [npm module called posix](https://www.npmjs.com/package/posix), which claims to provide "The missing POSIX system calls for Node.", but unfortunately actually provides a tiny subset of missing POSIX system calls. I need far more
for [python-wasm](https://python-wasm.cocalc.com/). Also, the Zig code is likely to be much easier to maintain an extend, e.g., [posix](https://www.npmjs.com/package/posix) has a [high severity vulnerability](https://github.com/ohmu/node-posix/issues/66), but hasn't been updated in years.

## Why Zig?

[Zig](https://ziglang.org/) is very easy to install, makes it simple to cross compile for many architectures, and provides better compile time sanity checks than C.

I'm not using [node-gyp](https://github.com/nodejs/node-gyp) since I have a
specific target list of platforms where I need this module to work, and using
Zig I can easily build binaries for all of them. The binaries will also be tiny, since they are just lightweight wrappers around calls to libc, which is dynamically linked by the operating system. I can thus include all target binaries with the npm package.

## License and acknowledgements

This is licensed BSD-3 clause. The template for using Zig to build node.js native modules is https://github.com/staltz/zig-nodejs-example
