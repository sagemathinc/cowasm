# CoWasm\-Python: Collaborative Python in WebAssembly for Servers and Browsers

URL: https://github.com/sagemathinc/cowasm/python/README.md

DEMOS:

- https://cowasm.org \- Python using SharedArrayBuffers
- https://zython.org \- Python using Service Workers
- https://cowasm.sh \- Dash Shell with Python, Sqlite, Lua, etc., using SharedArrayBuffers

Type this if you have nodejs at least version 16 installed:

```sh
~$ npx python-wasm  # pnpm dlx python-wasm  or  yarn dlx python-wasm
Python 3.11.0 (main, Oct 27 2022, 10:03:11) [Clang 15.0.3 (git@github.com:ziglang/zig-bootstrap.git 0ce789d0f7a4d89fdc4d9571 on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> 2 + 3
5
>>> import numpy
>>> import sympy
>>> import pandas
...
```

## What is this?

See  https://github.com/sagemathinc/cowasm for more about the CoWasm project.

### Try python-wasm

Try the python-wasm REPL under node.js (version at least 16):

```py
~$ npx python-wasm
Python 3.11.0 (main, Oct 27 2022, 10:03:11) [Clang 15.0.3 (git@github.com:ziglang/zig-bootstrap.git 0ce789d0f7a4d89fdc4d9571 on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> 2 + 3
5
>>> import sys; sys.version
'3.11.0 (main, Oct 27 2022, 10:03:11) [Clang 15.0.3 (git@github.com:ziglang/zig-bootstrap.git 0ce789d0f7a4d89fdc4d9571'
>>> sys.platform
'wasi'
```

### Install python\-wasm

Install python\-wasm into your project, and try it via the library interface and the node.js terminal.

```sh
pnpm install python-wasm
```

Then from the nodejs REPL:

```js
~/cowasm/packages/python-wasm$ node
Welcome to Node.js v19.0.0.
Type ".help" for more information.
> {syncPython, asyncPython} = require('python-wasm')
{
  syncPython: [AsyncFunction: syncPython],
  asyncPython: [AsyncFunction: asyncPython],
  default: [AsyncFunction: asyncPython]
}
> python = await syncPython(); 0;
0
> python.exec('import sys')
undefined
> python.repr('sys.version')
"'3.11.0b3 (main, Jul 14 2022, 22:22:40) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 623481199fe17f4311cbdbbf'"
> python.exec('import numpy')
undefined
> python.repr('numpy.linspace(0, 10, num=5)')
'array([ 0. ,  2.5,  5. ,  7.5, 10. ])'
```

There is also a Python REPL that is part of python\-wasm:

```py
> python.terminal()
Python 3.11.0 (main, Oct 27 2022, 10:03:11) [Clang 15.0.3 (git@github.com:ziglang/zig-bootstrap.git 0ce789d0f7a4d89fdc4d9571 on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> 2 + 3   # you can edit using readline
5
>>> input('name? ')*3
name? william  <-- I just typed "william"
'williamwilliamwilliam'
>>> import time; time.sleep(3)  # sleep works
>>> while True: pass   # ctrl+c works, but exits this terminal
> # back in node.
```

You can also use python\-wasm in your own [web applications via webpack](https://github.com/sagemathinc/cowasm-browser/tree/main/packages/terminal).  In the browser, this transparently uses SharedArrayBuffers if available, and falls back to ServiceWorkers.

## Build from Source

We support and regularly test building CoWasm\-Python from source on the following platforms:

- x86\_64 macOS and aarch64 macOS \(Apple Silicon M1\)
- x86\_64 and aarch64 Linux

See the [top level README.md](../README.md) file.

### Benchmarks

There is a collection of cpu\-intensive benchmarks in [packages/bench/src](./packages/bench/src), which you can run under various Python interpreters by running

```sh
your-python-interpreter src/all.py
```

Here are some grand total times that I recorded at some point in time in the past.  Don't take them too seriously.  That said, I chose the parameters of the benchmarks so a single benchmark doesn't unduly impact the results \(e.g., it is easy to game any such benchmark by adjusting parameters\).

| Python                                                                  | x86_64 Linux | MacOS M1 max | aarch64 Linux (docker on M1 max) |
| :---------------------------------------------------------------------- | :----------: | :----------: | :------------------------------: |
| PyPy 3.9.x (Python reimplemented with a JIT)                            |   2997 ms    |   2127 ms    |       1514 ms (ver 3.6.9)        |
| pylang (Javascript Python -- see https://github.com/sagemathinc/pylang) |   6909 ms    |   2876 ms    |             4424 ms              |
| Native CPython 3.11                                                     |   9284 ms    |   4491 ms    |             4607 ms              |
| WebAssembly CPython (python-wasm)                                       |   23109 ms   |   12171 ms   |             12909 ms             |

<br/>

The quick summary is that in each case pypy is twice as fast as pylang \(basically node.js\), python\-lang is twice as fast as cpython, and _**native cpython is about 2.5x as fast as python\-wasm**_. However, when you study the individual benchmarks, there are some significant differences. E.g., in `brython.py` there is a benchmark "create instance of simple class" and it typically takes 4x\-5x longer in WebAssembly versus native CPython.

---

## Contact

Email [wstein@cocalc.com](mailto:wstein@cocalc.com) or [@wstein389](https://twitter.com/wstein389) if find this interesting and want to help out. 

**CoWasm is an open source 3\-clause BSD licensed project.  It includes components and dependencies that may be licensed in other ways, but nothing is GPL licensed.**
