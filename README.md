# WAPYTHON

> _"Web Assembly Python"_

## Quick start

TODO

## OK, what is this?

TODO

## What's the goal? What is the good for?

TODO

## Build from source

### How to build

Just type "make"

```sh
...$ make
```

This runs a single top level makefile to build all the packages. The build process for all individual packages is _also_ accomplished using a Makefile. We don't use shell scripts or Python code to orchestrate building anything, since `make` is much cleaner and easier to read, maintain and debug.

### What happens

In most subdirectories `foo` of packages, this will create some subdirectories:

- `packages/foo/dist/[native|wasm]` -- a native or WebAssembly build of the package; this has binaries, headers, and libs. These get used by other packages.
- `packages/build/[native|wasm]` - build artifacts for the native or WebAssembly build; can be safely deleted

### Extra Packages

I have put a lot of work into getting various things to build.

### No common prefix directory

Unlike SageMath, where everything is built into a single `local` directory, here we build everything in its own self-contained package. When a package like `pari` depends on another package like `gmp` , our Makefile for `pari` explicitly references the `dist` directory in the `packages/dist/gmp` . This makes it possible to uninstall packages, update them, etc., whereas using a common directory for everything can be a mess with possibly conflicting versions of files.

### Native and Wasm

The build creates directories dist/native and dist/wasm. The `dist/native` artifacts are only of value on the computer where you ran the build, since they are architecture dependent and can easily depend on libraries on your system. In contrast, the `dist/wasm` artifacts are platform independent. They can be used nearly everywhere: on servers via WASM, on ARM computers (e.g., aarch64 linux, Apple Silicon, etc.), and in any modern web browser (though many details remain, obviously).

### Contact

Email [wstein@cocalc.com](mailto:wstein@cocalc.com) if you find this interesting and want to help out. **This is an open source BSD licensed project.**

There is a related project https://github.com/sagemathinc/jsage that is GPL licensed, and has a goal related to https://sagemath.org.
