# python-wasm

> "WebAssembly CPython for Node.js and the browser"

URL: https://github.com/sagemathinc/python-wasm 

DEMO: https://python-wasm.cocalc.com/

[<img src="https://github.com/sagemathinc/python-wasm/actions/workflows/docker-image.yml/badge.svg"  alt="Docker Image CI"  width="172px"  height="20px"  style="object-fit:cover"/>](https://github.com/sagemathinc/python-wasm/actions/workflows/docker-image.yml)

## Try the python-wasm REPL under node.js

```py
wstein@max x4 % npx python-wasm
Welcome to Node.js v16.13.0.
Type ".help" for more information.
> Python 3.11.0b4 (main, Jul 27 2022, 04:39:08) [Clang 14.0.6 (git@github.com:ziglang/zig-bootstrap.git dbc902054739800b8c1656dc on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> 2 + 3
5
>>> import sys; sys.version
'3.11.0b4 (main, Jul 27 2022, 04:39:08) [Clang 14.0.6 (git@github.com:ziglang/zig-bootstrap.git dbc902054739800b8c1656dc'
>>> sys.platform
'wasi'
```

## Install python\-wasm into your project, and try it via the library interface and the node.js terminal

```sh
npm install python-wasm
```

Then from the nodejs REPL:

```js
> python = require('python-wasm')
> await python.init();
> await python.exec('import sys')
undefined
> await python.repr('sys.version')
"'3.11.0b3 (main, Jul 14 2022, 22:22:40) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 623481199fe17f4311cbdbbf'"
> await python.repr('sys.platform')
'wasi'
```

There is also a readline\-based REPL that is part of python\-wasm:

```py
> python.terminal()
Python 3.11.0b3 (main, Jul 14 2022, 22:22:40) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 623481199fe17f4311cbdbbf on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> 2 + 3   # you can edit using readline
5
>>> input('name? ')
name? william  <-- I just typed "william"
'william'
>>> quit()  # or ctrl+d
>
```

You can also use python\-wasm in your [web application via webpack](https://github.com/sagemathinc/python-wasm/tree/main/packages/webpack), but your webserver must set certain headers which [github pages does not set](https://github.com/github-community/community/discussions/13309).

## Build python\-wasm from source on Linux or MacOS

### Prerequisites

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
await python.init();
> await python.repr('2+2')
4
> await python.exec('import time; t=time.time(); print(sum(range(10**7)), time.time()-t)')
49999995000000 1.3460001945495605
```

## What's the goal?  What about Pyodide?

Our **primary goal** is to create a WebAssembly build of Python and related packages, which runs both on the command line with Node.js and in the major web browsers \(via npm modules that you can include via webpack\).  This will be relatively easy to _build from source_ on both Linux and MacOS.  The build system is based on [Zig](https://ziglang.org/), which provides excellent caching and cross compilation. 

Our main application is to make [CoCalc](https://cocalc.com) more efficient.  As such, we will also want to port all of the [SageMath packages](https://www.sagemath.org/), which goes far beyond just the scientific Python stack that's ported in Pyodide.  I'm the original founder of SageMath, hence the motivation.  This will be part of a new GPL'd project that will have this BSD\-licensed project `python-wasm` at its core; some relevant work has been done [here](https://github.com/sagemathinc/jsage).

Some of our code will be written in the [Zig](https://ziglang.org/) language.  However, we are mostly targeting just the parts that are used for Python, which is a small subset of the general problem.  Our software license \-\- _**BSD 3\-clause**_ \-\- is compatible with their's and we hope to at least learn from their solutions to problems.

[More about how Pyodide and python\-wasm differ...](./docs/differences-from-pyodide.md) 

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

### Run a script via python\-wasm from the CLI

```sh
~/python-wasm$ echo "import sys; print(f'hi from {sys.platform}')" > a.py
~/python-wasm$ bin/python-wasm `pwd`/a.py
hi from wasi
```

## Benchmarks

There is a collection of cpu\-intensive benchmarks in [packages/bench/src](./packages/bench/src), which you can run under  various Python interpreters by running

```sh
your-python-interpreter `pwd`/all.py
```

Here are some grand total times.  The timings are pretty stable, and the parameters of the benchmarks are chosen so a single benchmark doesn't unduly impact the results \(e.g., it is trivial to game any such benchmark by adjusting parameters\).

| Python  | x86_64 Linux |  MacOS M1 max | aarch64 Linux (docker on M1 max) |
| :------------ |:---------------:|:---------------:|:---------------:|
| PyPy 3.9.x (Python reimplemented with a JIT)   |    2997 ms     |  2127 ms |  1514 ms (ver 3.6.9) |
| pylang (Javascript Python -- see https://github.com/sagemathinc/pylang) |    6909 ms   |  2876 ms |  4424 ms  | 
| Native CPython 3.11     | 9284 ms | 4491 ms | 4607 ms |
| WebAssembly CPython (python-wasm) | 23109 ms |   12171 ms|  12909 ms |

<br/>

The quick summary is that in each case pypy is twice as fast as pylang \(basically node.js\), python\-lang is twice as fast as cpython, and _**native cpython is about 2.5x\-2.8x as fast as python\-wasm**_.  However, when you study the individual benchmarks, there are some significant differences.  E.g., in `brython.py` there is a benchmark "create instance of simple class" and it typically takes 4x\-5x longer in WebAssembly versus native CPython.

---

## Contact

Email [wstein@cocalc.com](mailto:wstein@cocalc.com) if you find this interesting and want to help out. **This is an open source 3\-clause BSD licensed project.**

