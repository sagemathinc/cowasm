# `@wapython/wasi`

Javascript library for interacting with WASI Modules in Node.js.

(TODO: and in the Browser.)

This is a fork of version 0.12.0 of @wasmer/wasi to keep it alive, since the Wasmer company decided to end it, and I would like to use it in [JSage](https://github.com/sagemathinc/JSage).

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
  bindings: {...nodeBindings, fs}
});

const source = await readFile(pathToWasm);
const typedArray = new Uint8Array(source);
const result = await WebAssembly.instantiate(typedArray, wasmOpts);
wasi.start(result.instance);
```
