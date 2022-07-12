# `@wapython/wasi`

Javascript library for interacting with WASI Modules in Node.js.

(TODO: and in the Browser.)

This is a fork of version 0.12.0 of @wasmer/wasi to keep it alive, since the Wasmer company decided to end it, and I would like to use it in [python-wasm](https://github.com/sagemathinc/python-wasm).

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)

## Features

`@wapython/wasi` uses the same API as the [future WASI integration in Node](https://github.com/nodejs/wasi).

However, `@wapython/wasi` is focused on:

- Bringing [WASI](https://github.com/webassembly/wasi) to an Isomorphic context (Node.js and the Browser)
- Make it easy to plug in different filesystems (via [wasmfs](https://github.com/wasmerio/wasmer-js/tree/master/packages/wasmfs))
- Make it type-safe using [Typescript](http://www.typescriptlang.org/)
- Pure JavaScript implementation (no Native bindings needed)
- Very small

## Installation

To install `@wapython/wasi`, run this command:

```bash
npm install @wapython/wasi
```

## Quick Start

**This quick start is for node.**  It's something like this.  See lib/src/wasm.ts in the JSage source code for something that uses @wapython/wasi in a real application for a better tested example.

```js
import { WASI } from "@wapython/wasi";
import fs from "fs";
import nodeBindings from "@wapython/wasi/dist/bindings/node";

const wasi = new WASI({
  args: [],
  env: {},
  bindings: {...nodeBindings, fs},
  traceSyscalls: true  /* logs all calls! */
});

const source = await readFile(pathToWasm);
const typedArray = new Uint8Array(source);
const result = await WebAssembly.instantiate(typedArray, wasmOpts);
wasi.start(result.instance);
```
## History and Copyright

This project is based on what the wasmer devs wrote, which itself was based on
what Gus Caplan wrote.  Here's what the WASMER people wrote:
```
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
