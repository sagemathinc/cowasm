# WAPYTHON

> _"Web Assembly Python"_

URL: https://github.com/sagemathinc/wapython 

LEAD AUTHOR:  [William Stein](https://github.com/williamstein/)

## Quick start

Nothing to see yet.

## What's the goal?

Create a web assembly build of Python and related packages, which runs both on the command line with Node.js and in web browsers \(via npm modules that you can include via webpack\).  The build system is based on Makefiles and `zig,`which provides excellent caching and cross compilation.  Most of the C/C\+\+ code in emscripten will instead be written in the zig language here, and the Javascript code will be replaced by more modern Typescript.

This is probably extremely difficult to pull off, since emscripten and pyodide have been at it for years, and it's a complicated project.   Our software license is compatible with there's and we hope to at least learn from their solutions to problems.

### JPython

One significant difference between this project and pyodide / pyscript, etc., is that we also have a self\-hosted Python interpreter that is implemented in Javascript \(a significant rewrite of [RapydScript](https://github.com/atsepkov/RapydScript)\).  This provides the Python **languages** with the extremely fast JIT and very easy interop with the full Javascript ecosystem, but a very tiny library of functionality.   Our plan is to combine this with the actual WASM Python and Python libraries, in order to provide, e.g., access to numpy from JPython.  It's a different approach than pyscript, and might be really powerful.  Or might not be; we'll see.

## Build from source

### How to build

Just type make.   \(Do **NOT** type `make -j8,` since parallel builds somehow mess up Python right now.\)

```sh
...$ make
```

This runs a single top level makefile to build all the packages. The build process for all individual packages is _also_ accomplished using a Makefile. We don't use shell scripts or Python code to orchestrate building anything, since `make` is much cleaner and easier to read, maintain and debug.

### What happens

In most subdirectories `foo` of packages, this will create some subdirectories:

- `packages/foo/dist/[native|wasm]` -- a native or WebAssembly build of the package; this has binaries, headers, and libs. These get used by other packages.
- `packages/build/[native|wasm]` - build artifacts for the native or WebAssembly build; can be safely deleted

### No common prefix directory

Unlike some systems, where everything is built and installed into a single `local` directory, here we build everything in its own self-contained package. When a package like `python` depends on another package like `lzma` , our Makefile for `python` explicitly references `packages/lzma/dist`. This makes it easier to uninstall packages, update them, etc., without having to track what files are in any package, whereas using a common directory for everything can be a mess with possibly conflicting versions of files, and makes versioning and dependencies very explicit.  Of course, it makes the environment variables and build commands potentially much longer.  Our goal is WebAssembly though, which ultimately links everything together in a single file, so this is fine.

### Native and Wasm

The build typically create directories `dist/native`and `dist/wasm.` The `dist/native` artifacts are only of value on the computer where you ran the build, since they are architecture dependent and can easily depend on libraries on your system. In contrast, the `dist/wasm` artifacts are platform independent. They can be used nearly everywhere: on servers via WASM, on ARM computers \(e.g., aarch64 linux, Apple Silicon, etc.\), and in any modern web browser \(though many details remain, obviously\).

### Contact

Email [wstein@cocalc.com](mailto:wstein@cocalc.com) if you find this interesting and want to help out. **This is an open source BSD licensed project.**

There is a related project https://github.com/sagemathinc/jsage that is GPL licensed, and has a goal related to https://sagemath.org.

