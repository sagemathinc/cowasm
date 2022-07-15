# python-wasm

> "WebAssembly CPython for Node.js and the browser"

URL: https://github.com/sagemathinc/python-wasm 

DEMO: https://python-wasm.cocalc.com/

[![Docker Image CI](https://github.com/sagemathinc/python-wasm/actions/workflows/docker-image.yml/badge.svg)](https://github.com/sagemathinc/python-wasm/actions/workflows/docker-image.yml)

## Quick Start

```sh
npm install python-wasm
```

Then from the nodejs REPL:

```js
> python = require('python-wasm')
> await python.init()
> python.exec('import sys; sys.version')
'3.11.0b3 (main, Jul  8 2022, 23:21:07) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 81f0e6c5b902ead84753490d'
> python.repr('sys.platform')
'wasi'
```

There is also a readline\-based REPL that is part of python\-wasm:

```sh
> python.main()
> Starting full python-wasm with readline support.   Type quit() to exit.
Python 3.11.0b3 (main, Jul 14 2022, 22:22:40) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 623481199fe17f4311cbdbbf on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> 2+3
5
>>> 1/0  # you can edit with readline!
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
ZeroDivisionError: division by zero
>>> quit()
```

You can also use python-wasm in your [web application via webpack](https://github.com/sagemathinc/python-wasm/tree/main/packages/webpack).

## Quick start \- install from npm and use in node.js

```sh
wstein@max % node --version
v16.x   # If less then 16, install a newer version of node or use node --experimental-wasm-bigint
wstein@max % mkdir test && cd test && npm init -y
wstein@max % npm install python-wasm
wstein@max % node
Welcome to Node.js v16.13.0.
Type ".help" for more information.
> python = require('python-wasm')
> python.exec('a=2+3; a') # outputs to stdout
5
> s = python.repr('a'); s # javascript string
5
> python.exec('import sys; sys.version')
'3.11.0b3 (main, Jul  8 2022, 23:21:07) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 81f0e6c5b902ead84753490d'
> python.repr('sys.platform')
'wasi'
> python.exec('sum(range(10**7))')
```

This project also includes a Python-to-Javascript compiler:

```sh
npm install jpython
```

Try out the REPL:

```sh
wstein@max % npx jpython
Welcome to JPython.  Using Node.js v16.13.0. 
>>> 2+2
4
>>> sum(range(10**7))
49999995000000
```

See below for more examples.

## Build python\-wasm from source

### Build on Linux or MacOS

To build everything from source, make sure your systemwide nodejs is at least version 16.x and that you have standard command line dev tools.  Then build, which [takes 15\-20 minutes](https://github.com/sagemathinc/wapython/actions), and around 1GB of disk space:

```sh
wstein@max % make
```

This builds native CPython, installs zig, then builds a WebAssembly version of CPython, and also builds all the Typescript code.  Building from source is supported on four platforms:

- Linux: tested on both x86\_64 and aarch64 Ubuntu with standard dev tools installed; see [Dockerfile](./Dockerfile)
- MacOS: tested on both x86\_64 and M1 mac with standard XCode command live dev tools installed.

If you're using Windows, you'll have to use Linux via a virtual machine \(or maybe WSL\) to build python\-wasm from source.

### Try out your build

Run some tests, which won't take long:

```sh
make test
```

You can also use the WebAssembly repl directly on the command line:

```sh
wstein@max % ./bin/python-wasm
Python 3.11.0b3 (main, Jul  8 2022, 23:21:07) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 81f0e6c5b902ead84753490d on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> 2+3
5
>>> import sys; sys.platform
'wasi'
```

Next use python\-wasm as a library in node.js:

```sh
wstein@max % cd packages/python-wasm
# Now actually use the module:
wstein@max % node
Welcome to Node.js v16.13.0.
Type ".help" for more information.
> python = require('.')
> python.exec('2+2')
4
> python.exec('import time; t=time.time(); print(sum(range(10**7)), time.time()-t)')
49999995000000 1.0109999179840088
```

Next try out JPython which is a Javascript-based JIT Python interpreter:

```sh
wstein@max % cd ../..
wstein@max % bin/jpython
Welcome to JPython.  Using Node.js v16.13.0.
>>> 2+2
4
# Notice that it can be much faster than python-wasm:
>>> import time; t=time.time(); print(sum(range(10**7)), time.time()-t)
49999995000000 0.06099987030029297
```

## What's the goal?  What about pyodide and emscripten?

Create a WebAssembly build of Python and related packages, which runs both on the command line with Node.js and in web browsers \(via npm modules that you can include via webpack\).  The build system is based on Makefiles and [zig](https://ziglang.org/), which provides excellent caching and cross compilation.  

Most of the C/C\+\+ code in emscripten will instead be written in the [zig](https://ziglang.org/) language here, and the Javascript code will be replaced by more modern Typescript.

This is probably extremely difficult to pull off, since emscripten and pyodide have been at it for years, and it's a complicated project.   Our software license \-\- _**BSD 3\-clause**_ \-\- is compatible with their's and we hope to at least learn from their solutions to problems.

## Other Goodies 

### JPython

As mentioned above, this project also includes a self\-hosted Python interpreter that is implemented in Javascript \(a significant rewrite of [RapydScript](https://github.com/atsepkov/RapydScript)\).  This provides the Python **languages** with the extremely fast JIT and very easy interoperability with the full Javascript ecosystem, but a very tiny library of functionality.   Our plan is to combine this with the actual WASM Python and Python libraries, in order to provide, e.g., access to numpy from JPython.   The idea is to make writing code on the Javascript side easier for Python programmers.

## More about building from source

### How to build

Just type make.   \(Do **NOT** type `make -j8;` it might not work...\)

```sh
...$ make
```

This runs a single top level makefile to build all the packages. The build process for all individual packages is _also_ accomplished using a Makefile. We don't use shell scripts or Python code to orchestrate building anything, since `make` is much cleaner and easier to read, maintain and debug.

### What happens

In most subdirectories `foo` of packages, this will create some subdirectories:

- `packages/foo/dist/[native|wasm]` -- a native or WebAssembly build of the package; this has binaries, headers, and libs. These get used by other packages.
- `packages/build/[native|wasm]` - build artifacts for the native or WebAssembly build; can be safely deleted

### No common prefix directory

Unlike some systems, where everything is built and installed into a single `prefix` directory, here we build everything in its own self\-contained package. When a package like `cpython` depends on another package like `lzma` , our Makefile for `cpython` explicitly references `packages/lzma/dist`. This makes it easier to uninstall packages, update them, etc., without having to track what files are in any package, whereas using a common directory for everything can be a mess with possibly conflicting versions of files, and makes versioning and dependencies very explicit.  Of course, it makes the environment variables and build commands potentially much longer.  

### Native and Wasm

The build typically create directories `dist/native`and `dist/wasm.` The `dist/native` artifacts are only of value on the computer where you ran the build, since they are architecture dependent and can easily depend on libraries on your system. In contrast, the `dist/wasm` artifacts are platform independent. They can be used nearly everywhere: on servers via WASM, on ARM computers \(e.g., aarch64 linux, Apple Silicon, etc.\), and in any modern web browser \(though many details remain, obviously\).

### Standalone WASM executables

The bin directory has scripts `zcc` and `z++` that are C and C\+\+ compiler wrappers around Zig \+ Node.  They create binaries that you can run on the command line as normal.  Under the hood there's a wrapper script that calls node.js and the wasi runtime.

```sh
$ . bin/env.sh
$ echo 'int main() { printf("hello from Web Assembly: %d\n", 2+2); }' > a.c
$ zcc a.c
$ ls -l
a.c  a.out  a.out.wasm  ...
$ ./a.out   # this actually runs nodejs + python-wasm
hello from Web Assembly: 4
```

This isn't currently used here for building wapytho, but it's an extremely powerful tool.  \(For example, I used it with JSage to get the first build of the NTL library for Web Assembly...\)

### Run a script via web assembly Python from the CLI

```sh
~/python-wasm$ echo "import sys; print(f'hi from {sys.platform}')" > a.py
~/python-wasm$ bin/python-wasm `pwd`/a.py
hi from wasi
```

## Benchmarks

There is a collection of cpu\-intensive benchmarks in [packages/jpython/bench](./packages/jpython/bench), which you can run under cpython, jpython, python-wasm, pypy, etc., by running e.g., `python `pwd`/all.py`. 

On x86\_64 Linux, here are some grand total times.  The timings are pretty stable, and the parameters of the benchmarks are chosen so a single benchmark doesn't unduly impact the results \(e.g., it is trivial to game any such benchmark by adjusting parameters\).

| Python  | x86_64 Linux |  MacOS M1 max | aarch64 Linux (docker on M1 max) |
| :------------ |:---------------:|:---------------:|:---------------:|
| PyPy 3.9.x (Python reimplemented with a JIT)   |    2997 ms     |  2127 ms |  1514 ms (ver 3.6.9) |
| jpython (Javascript Python) |    6909 ms   |  2876 ms |  4424 ms  | 
| Native CPython 3.11     | 9284 ms | 4491 ms | 4607 ms |
| WebAssembly CPython (python-wasm) | 23109 ms |   12171 ms|  12909 ms |

<br/>

The quick summary is that in each case pypy is twice as fast as jpython, jpython is twice as fast as cpython, and _**native cpython is about 2.5x\-2.8x as fast as webassembly cpython**_.  However, when you study the individual benchmarks, there are some significant differences.  E.g., in `brython.py` there is a benchmark "create instance of simple class" and it typically takes 4x\-5x longer in WebAssembly versus native CPython.

---

## Contact

Email [wstein@cocalc.com](mailto:wstein@cocalc.com) if you find this interesting and want to help out. **This is an open source 3\-clause BSD licensed project.**

There is a related project https://github.com/sagemathinc/jsage that is GPLv3 licensed, and has a goal related to https://sagemath.org.

