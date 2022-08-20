# Missing Posix Functions for Node.js -- via a native module written in Zig

`posiz-zig` is a Node.js native module written using Zig that provides access to Posix functions not in node that are needed to fully support WebAssembly modules. It includes precompiled binaries for `[x86_64/aarch64]-[macos/linux]`, and falls back to empty functionality on all other platforms.  In particular, this doesn't support any functionality on Windows yet.  On Windows, the import provides an empty collection of functions.

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

There is an [npm module called posix](https://www.npmjs.com/package/posix), which claims to provide _"The missing POSIX system calls for Node."_, but there are many calls that I want that are missing, at least for
my application to [python\-wasm](https://python-wasm.cocalc.com/), since CPython exposes _**all**_ of Posix. Also, the Zig code here is hopefully likely to be easier to maintain and extend. The [posix npm module](https://www.npmjs.com/package/posix) also has a [high severity vulnerability](https://github.com/ohmu/node-posix/issues/66), but hasn't been updated in a while \(see note below\).

## Why Zig?

[Zig](https://ziglang.org/) is very easy to install, and makes it simple to cross compile for many architectures, and provides much better compile time sanity checks than C.

I'm not using [node\-gyp](https://github.com/nodejs/node-gyp) since I have a
specific target list of platforms where I need this module to work, and using
Zig I can easily build binaries for all of them. The binaries will also be tiny, since they are just lightweight wrappers around calls to libc, which is dynamically linked by the operating system. I can thus include all target binaries with the npm package, and it is still only 1.2MB.

## License and acknowledgements

This is licensed BSD-3 clause. The template for using Zig to build node.js native modules is https://github.com/staltz/zig-nodejs-example

## CVE-2022-21211 in the posix package

The posix package that posix-zig somewhat competes with has an unpatched vulnerability, in that some input will cause it to crash node. Here's [the
demonstration](https://security.snyk.io/vuln/SNYK-JS-POSIX-2400719), which
does NOT crash posix-zig.

```js
const posix = require("posix-zig"); // put "posix" with that installed to crash node

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

