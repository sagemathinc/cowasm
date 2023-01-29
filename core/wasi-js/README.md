# wasi-js

This is a Javascript library for interacting with WASI Modules in node and in the browser.

## Features

`wasi-js` uses the same API as the [WASI integration in Node](https://nodejs.org/api/wasi.html).

However, `wasi-js` is focused on:

- Bringing [WASI](https://github.com/webassembly/wasi) to an Isomorphic context (Node.js and the Browser)
- Make it easy to plug in different filesystems (via [wasmfs](https://github.com/wasmerio/wasmer-js/tree/master/packages/wasmfs))
- Make code safer using [Typescript](http://www.typescriptlang.org/)
- Pure JavaScript implementation (no Native bindings needed)
- Very small
- Easy to plugin support for sleep, blocking read of stdout, and writing to stdout and stderr.

## Installation

To install `wasi-js`, run this command:

```bash
npm install wasi-js
```

## Testing

There is currently no test suite directly in this package. However, that doesn't
mean that it doesn't get thorough testing. Indeed, it is tested by the other
packages of CoWasm that depend on it, including a large number of tests in the
cpython test suite (which helped me find many bugs).

## Quick Start

**This quick start is for node.**  It's something like this.  See [cowasm](https://github.com/sagemathinc/cowasm)
for a nontrivial application that uses wasi\-js both in node and the browser.  The usage is something like this:

```js
import { WASI } from "wasi-js";
import fs from "fs";
import nodeBindings from "wasi-js/dist/bindings/node";

const wasi = new WASI({
  args: [],
  env: {},
  bindings: {...nodeBindings, fs},
});

const source = await readFile(pathToWasm);
const typedArray = new Uint8Array(source);
const result = await WebAssembly.instantiate(typedArray, wasmOpts);
wasi.start(result.instance);
```

Set the env variable `DEBUG=wasi*` to see a log of all wasi system calls; this uses the [debug library.](https://www.npmjs.com/package/debug)

## History

This started long ago as a fork of version 0.12.0 of @wasmer/wasi to keep it alive, since the Wasmer company deleted it entirely \(replacing it with a rust rewrite with very different goals\), and I would like to use it in [CoWasm](https://github.com/sagemathinc/cowasm).  I added some functionality to better support blocking IO and other features needed mainly in the browser.  I also found and _**fixed some very subtle bugs**_ while trying to get the cPython test suite to work.

There is no real test suite directly of this package.  That said, I have tested it quite a bit indirectly via Python test suites.

As mentioned above, this is based on what the wasmer devs wrote, which itself was based on
what Gus Caplan wrote.  I have also added hooks for implementing blocking IO.

Here's what the WASMER people wrote:

```md
This project is based from the Node implementation made by Gus Caplan
https://github.com/devsnek/node-wasi
However, JavaScript WASI is focused on:
 * Bringing WASI to the Browsers
 * Make easy to plug different filesystems
 * Provide a type-safe api using Typescript
 * Providing multiple output targets to support both browsers and node
 * The API is adapted to the Node-WASI API: https://github.com/nodejs/wasi/blob/wasi/lib/wasi.js
```

This is the original **MIT license** below:

```
Copyright 2019 Gus Caplan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
```

