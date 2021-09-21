# SageMathJS

In 2004, I started https://www.sagemath.org/, which has gone on to be very successful in supporting pure mathematics research and teaching. Similar to Ryan Dahl who started node.js, I haven't been involved in Sage development for a long time, and also [similar to Ryan](https://www.youtube.com/watch?v=M3BM9TB-8yA), I've been thinking what I would do differently if I were to start Sage today in 2021. This is the result of mulling over that question lately.

## What's the goal? What is the good for?

**!! Right now I don't claim this is useful for anything at all.  It's a "Proof of Concept" !!**

The longterm goals out outlined below.

### Create an easy to distribute and install platform independent distribution of SageMath

SageMath is a very large Python/Cython library that also includes a large number of other mathematical software systems such as PARI and Gap and Singular. Thus part of the goal is to build each of PARI, GAP, etc. using Zig. This could be distributed as a small native Electron app along with a few hundred megabytes of cross-platform WebAssembly and data files. When there's a new release of Sage, the WebAssembly files need to get rebuilt and tested once, and the resulting binary will then support all versions of Linux, Windows, MacOS, and iOS. For iOS we would use [a-shell](https://github.com/holzschu/a-shell#programming--add-more-commands) (or simple contribute a free package to a-shell).

- There's probably [no way to build R](https://www.r-project.org/) with Zig, so we'll toss it; the Python community has not ended up building stats around rpy2 so this is fine.
- It might be very difficult to build Maxima via ECL (embedded common lisp) for WASM, in which case we will simply have to change Sage to not depend on Maxima for symbolic computation.  We'll see.  This is a very challenging project!

### Make research level mathematical software available to the Javascript ecosystem

Javascript is the most widely deployed language, but there is essentially nothing similar to any part of Sage, Pari, Gap or Singular available natively in [their ecosystem](https://www.npmjs.com/). Web applications, Node.js programs, and [sandboxed code running via Wasmer](https://blog.cloudflare.com/workers-unbound-ga/) could all benefit from such software.

#### JIT: Just in time compiler

Modern Javascript runtimes -- in particular, Chrome V8 and Firefox SpiderMonkey -- have incredible just-in-time (JIT) compilers that optimize a wide range of general Javascript code. It could be valuable for some users to bring combine math research software with the power of Javascript JIT's. The Python ecosystem is not as good in some ways at JIT as Javascript.   Pypy still feels "fringe" despite Python 3.x support, and it has serious performance issues with C extensions.  There's numba, which is amazing for what it is amazing at, but only works for specific types of code. There's the new [Pyston](https://www.pyston.org/) spinoff from Dropbox.

Compared to Julia, the Javascript JIT's are also impressive due to how quickly and seamlessly it does JIT'ing, since that's a critical requirement for web pages.  Sometimes Julia's JIT experience can be slower than Javascript JIT, possibly due to reliance on LLVM.

In any case, there may be situations where a program is fairly easy to write using a combination of Javascript and some of the WebAssembly libraries that come out of this project, and Javascript's JIT might also result in a very pleasant experience overall, as compared to other options.

#### New low level code

Making libraries like Pari, Gap, etc., available to Javascript is just a first step. This project also includes building new tools using modern low level high performance languages like Zig.

#### A Python-to-Javascript compiler

Another experimental project you will find here is `jpython`, which is a _very lightweight_ Python-to-Javascript compiler.  It makes it possible to write Python code, but benefit from a Javascript JIT and all the functionality we build for WASM above.   JPython runs natively in Javascript, so there is no dependence on Python itself (unlike Transcrypt).  JPython is a a fork of RapydScript, but with a goal of much better conformance with the Python language, and support for operator overloading.

### Does this compete with SageMath?

Unlike [Julia](https://julialang.org/) or [Oscar](https://oscar.computeralgebra.de/), this project does not compete with SageMath.  Indeed, one of the main goals is to provide an easier to use distribution of SageMath someday, and another goal is to make the components of Sage and ultimately much of the core Sage library efficiently usable in more situations (e.g., node.js, web browsers, [every language wasmer supports](https://github.com/wasmerio/wasmer#-language-integrations), etc.).   This project is about enriching the mathematical software ecosystem and expanding it far beyond Python. 

## Build SageMathJS from source

### Dependencies to build

- Install the latest [devel version of zig](https://ziglang.org/download/), i.e., at least 0.9.x.
- Node.js at least version 16.x (though 14.x might mostly work).
- Some other standard build tools, e.g., make, autoconf stuff, since some packages assume these are available.
- You do **not** need any compilers or other build tools such as GCC, CLANG, LLVM, etc. _**All compilation is done using zig**_ (which [has clang/llvm built in](https://andrewkelley.me/post/zig-cc-powerful-drop-in-replacement-gcc-clang.html)).

### How to build

Just type "make"

```sh
...$ make
```

This runs a single top level makefile to build all the packages. The build process for all individual packages is _also_ accomplished using a Makefile. We don't use shell scripts or Python code to orchestrate building anything, since `make` is much cleaner and easier to read and maintain.

### What happens

In most subdirectories `foo` of packages, this will create some subdirectories:

- `packages/foo/dist/[native|wasm]` -- a native or WebAssembly build of the package; this has binaries, headers, and libs. These get used by other packages.
- `packages/build/[native|wasm]` - build artifacts for the native or WebAssembly build; can be safely deleted

### No common prefix directory

Unlike SageMath, where everything is built into a single `local` directory, here we build everything in its own self-contained package. When a package like `pari` depends on another package like `gmp` , our Makefile for `pari` explicitly references the `dist` directory in the `packages/dist/gmp` . This makes it possible to uninstall packages, update them, etc., whereas using a common directory for everything is a total mess with possibly conflicting versions of files.

### Native and Wasm

The build creates directories dist/native and dist/wasm. The `dist/native` artifacts are only of value on the computer where you ran the build, since the are architecture dependent and can easily depend on libraries on your system. In contrast, the `dist/wasm` artifacts are <u> </u>_**MAGIC™!**_ They are completely architecture independent, and can be used nearly everywhere -- on servers via WASM, on ARM computers (e.g., ARM linux, Apple Silicon), and in any modern web browser (though details remain, obviously).
