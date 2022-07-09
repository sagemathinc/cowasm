# WAPYTHON

> _"WebAssembly & Python"_

URL: https://github.com/sagemathinc/wapython 

AUTHOR:  [William Stein](https://github.com/williamstein/)

[![Docker Image CI](https://github.com/sagemathinc/wapython/actions/workflows/docker-image.yml/badge.svg)](https://github.com/sagemathinc/wapython/actions/workflows/docker-image.yml)

## Quick start - install from npm

\(This won't work yet, since the python source files aren't yet included in the bundle. Build from source below works.\)

```sh
wstein@max % mkdir wapython && cd wapython && npm init -y && npm install @wapython/jpython

wstein@max % node  # for older node, use "node --experimental-wasm-bigint"
Welcome to Node.js v16.13.0.
Type ".help" for more information.
> {python} = require('@wapython/core')
> python.exec('2+2')
4

# Also, to run Jpython:
wstein@max % npx jpython
Welcome to JPython.  Using Node.js v16.13.0. 
>>> 2+2
4
```

See below for more examples.

## Quick start - build from source

### Build

To build everything from source, make sure your systemwide nodejs is at least version 16.x and that you have standard command line dev tools.  Then build, which [takes 15\-20 minutes:](https://github.com/sagemathinc/wapython/actions) 

```sh
wstein@max % make
```

I've tested this build on:

- x86\_64 and aarch64 Linux with standard dev tools installed; see [Dockerfile](./Dockerfile) 
- MacOS \- my M1 mac with XCode CLI tools works.

### Try out your build

```sh
# Now try out WAPython, directly from the command line.  This runs the
# webassembly version of Python you just built:
wstein@max % bin/wapython  # takes a few seconds to start
Python 3.11.0b3 (main, Jul  8 2022, 23:21:07) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 81f0e6c5b902ead84753490d on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> 2+3
5
>>> import sys; sys.platform
'wasi'

# Try out the newly built @wapython/core module, which is our
# WebAssembly version of Python 3.11 that you can use via a library:
wstein@max % cd packages/core
# Run the WAPython test suite first:
wstein@max % make test

# Now actually use the module:
wstein@max % node
Welcome to Node.js v16.13.0.
Type ".help" for more information.
> {python} = require('@wapython/core')
> python.exec('2+2')
4
> python.exec('import time; t=time.time(); print(sum(range(10**7)), time.time()-t)')
49999995000000 1.0109999179840088

# Next try out JPython which is a Javascript-based JIT Python interpreter:
wstein@max % cd ../..
wstein@max % bin/jpython
Welcome to JPython.  Using Node.js v16.13.0.  
>>> 2+2
4
# Notice that it can be much faster than wapython:
>>> import time; t=time.time(); print(sum(range(10**7)), time.time()-t)
49999995000000 0.06099987030029297

# You can use WAPython from JPython:
>>> wapython = require('@wapython/core').python
>>> wapython.exec('import time; t=time.time(); print(sum(range(10**7)), time.time()-t)')

# One is genuine Python, whereas the other is really a Python-to-Javascript compiler,
# so semantics are different:
>>> 3**200
2.6561398887587478e+95
>>> wapython.exec('3**200')
265613988875874769338781322035779626829233452653394495974574961739092490901302182994384699044001
```

## What's the goal?

Create a WebAssembly build of Python and related packages, which runs both on the command line with Node.js and in web browsers \(via npm modules that you can include via webpack\).  The build system is based on Makefiles and [zig](https://ziglang.org/), which provides excellent caching and cross compilation.  Most of the C/C\+\+ code in emscripten will instead be written in the [zig](https://ziglang.org/) language here, and the Javascript code will be replaced by more modern Typescript.

This is probably extremely difficult to pull off, since emscripten and pyodide have been at it for years, and it's a complicated project.   Our software license \-\- _**BSD 3\-clause**_ \-\- is compatible with their's and we hope to at least learn from their solutions to problems.

## Other Goodies 

### JPython

This project also includes a self\-hosted Python interpreter that is implemented in Javascript \(a significant rewrite of [RapydScript](https://github.com/atsepkov/RapydScript)\).  This provides the Python **languages** with the extremely fast JIT and very easy interoperability with the full Javascript ecosystem, but a very tiny library of functionality.   Our plan is to combine this with the actual WASM Python and Python libraries, in order to provide, e.g., access to numpy from JPython.   The idea is to make writing code on the Javascript side easier for Python programmers.    

### Standalone WASM executables

The bin directory has scripts `zcc` and `z++` that are C and C\+\+ compiler wrappers around Zig \+ Node.  They create binaries that you can run on the command line as normal.  Under the hood there's a wrapper script that calls node.js and the wasi runtime.

```sh
$ . bin/env.sh
$ echo 'int main() { printf("hello from Web Assembly: %d\n", 2+2); }' > a.c
$ zcc a.c
$ ls -l
a.c  a.out  a.out.wasm  ...
$ ./a.out   # this actually runs nodejs + @wapython/wasm
hello from Web Assembly: 4
```

This isn't currently used here for building wapytho, but it's an extremely powerful tool.  \(For example, I used it with JSage to get the first build of the NTL library for Web Assembly...\)

### Run a script via web assembly Python from the CLI

```sh
~/wapython$ echo "import sys; print(f'hi from {sys.platform}')" > a.py
~/wapython$ bin/wapython `pwd`/a.py
hi from wasi
```

## Build wapython from source

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

### Contact

Email [wstein@cocalc.com](mailto:wstein@cocalc.com) if you find this interesting and want to help out. **This is an open source 3\-clause BSD licensed project.**

There is a related project https://github.com/sagemathinc/jsage that is GPLv3 licensed, and has a goal related to https://sagemath.org.

