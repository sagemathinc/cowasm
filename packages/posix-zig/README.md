# Missing Posix Functions for Node.js -- via a native module written in Zig

Node.js native module written using Zig that provides access to Posix functions not in node that are needed to fully support WebAssembly modules. Includes precompiled binaries for [x86_64/aarch64]-[macos/linux], and falls back to empty functionality on all other platforms.

We don't support any functionality on Windows, because it is not Posix. Everything partially posix for Windows is already in node.js. On Windows the import provides an empty collection of functions.

Install it:
```
npm install posix-zig
```

Then
```js
>>> require('posix-zig').gethostname()
'max.local'
```

See [src/index.ts](src/index.ts) for what is available and what the Typescript types are.


## Why?

There is an [npm module called posix](https://www.npmjs.com/package/posix), which claims to provide "The missing POSIX system calls for Node.", but there are some calls that I want that are missing, at least for
for [python-wasm](https://python-wasm.cocalc.com/). Also, this Zig code is likely to be easier to maintain and extend. Also, [posix](https://www.npmjs.com/package/posix) has a [high severity vulnerability](https://github.com/ohmu/node-posix/issues/66), but hasn't been updated in 3 years. See note at the bottom.

## Why Zig?

[Zig](https://ziglang.org/) is very easy to install, makes it simple to cross compile for many architectures, and provides better compile time sanity checks than C.

I'm not using [node-gyp](https://github.com/nodejs/node-gyp) since I have a
specific target list of platforms where I need this module to work, and using
Zig I can easily build binaries for all of them. The binaries will also be tiny, since they are just lightweight wrappers around calls to libc, which is dynamically linked by the operating system. I can thus include all target binaries with the npm package.

## License and acknowledgements

This is licensed BSD-3 clause. The template for using Zig to build node.js native modules is https://github.com/staltz/zig-nodejs-example

## CVE-2022-21211 in the posix package

The posix package that posix-zig somewhat competes with has an unpatched vulnerability, in that some input will cause it to crash node. Here's [the
demonstration](https://security.snyk.io/vuln/SNYK-JS-POSIX-2400719), which
does NOT crash posix-zig.

```js
const posix = require("posix-zig"); // put "posix" with that installed to crash node

try {
  console.log("[!] Trying invokation");
  posix.setegid({ toString: 1 });
  console.log("[!] Made it!");
} catch (e) {
  console.log("[!] Excepted");
  console.error(e);
}
console.log("but we ok");
```
