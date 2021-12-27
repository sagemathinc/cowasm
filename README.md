# JSage

> _"Something like the Python based_ [_SageMath_](https://sagemath.org)_, but for the_ _**J**__ava__**S**__cript world."_

## Quick start

You should have Node version 16.x installed.  All the compiled code is WebAssembly, so it should work on any computer with Node 16.x installed and install very quickly; in particular, nothing needs to be compiled when installing.

```python
> npm install @jsage/jpython
> npx jsage    # or npx jpython for no preparser
Welcome to JSage.  Using Node.js v16.13.0.  
Type dir(jsage) for available functions.
jsage: list([2 .. 2^3])
[2, 3, 4, 5, 6, 7, 8]
jsage: 2/3 + 4/5
22/15
jsage: dir(jsage)
['ComplexNumber', 'dims', 'P1List', 'ManinSymbols', 'EllipticCurve', 'factor', 'arith', 'Integer', 'ZZ', 'Rational', 'QQ', 'pari', 'misc', 'Number', 'init']
jsage: dims.dimensionCuspForms(389)
32
jsage: E = EllipticCurve('389a'); E
EllipticCurve([0, 1, 1, -2, 0])
jsage: E.analyticRank()
2
jsage: E.conductor()
389
jsage: E.anlist(20)
[0, 1, -2, -2, 2, -3, 4, -5, 0, 1, 6, -4, -4, -3, 10, 6, -4, -6, -2, 5, -6]
jsage: M = ManinSymbols(389); P = M.presentation(1009); t = P.heckeOperator(2);
jsage: t.fcp()
[x + 2 2]
[x + 439 2]
...
[x^4 + 298*x^3 + 873*x^2 + 507*x + 325 2]
[x^9 + 347*x^8 + 408*x^7 + 343*x^6 + 673*x^5 + 219*x^4 + 736*x^3 + 475*x^2 + 326*x + 697 2]
jsage: for i in range(4): print(i, 10+i)   # jsage is similar to Python...
... 
0 10
1 11
2 12
3 13
```

As explained below, it's also pretty easy to build JSage from source.  We fully support building and developing natively using x86\_64 and aarch64 Linux, and Intel and M1 MacOS.   There's also a Docker build recipe.

## OK, what is this?

The name "JSage" is meant to suggest a small combination of ideas from Javascript and Sage.

In 2004, I started https://www.sagemath.org/, which has gone on to be very successful in supporting pure mathematics research and teaching. Similar to Ryan Dahl who started node.js, I haven't been deeply involved in the weeds of Sage development for a long time, and also [similar to Ryan](https://www.youtube.com/watch?v=M3BM9TB-8yA), I've been thinking what I would do differently if I were to start Sage today in 2021. This is one possible result of mulling over that question lately.

## What's the goal? What is the good for?

**!! Right now I don't claim this is useful for anything at all. It's a "Proof of Concept" !!**

Some potential longterm goals are listed below.

### Create a ridiculously easy to distribute and install platform-independent distribution of SageMath

SageMath is a very large Python/Cython library that also includes a large number of other mathematical software systems such as PARI and Gap and Singular. Thus part of the goal is to build each of PARI, GAP, etc. using Zig. This could be distributed as a small native Electron app along with a few hundred megabytes of cross-platform WebAssembly and data files. When there's a new release of Sage, the WebAssembly files need to get rebuilt and tested once, and the resulting binary will then support all versions of Linux, Windows, MacOS, and iOS. For iOS we would use [a-shell](https://github.com/holzschu/a-shell#programming--add-more-commands) (or simple contribute a free package to a-shell).

- There's probably [no way to build R](https://www.r-project.org/) with Zig, so we'll toss it; the Python community has not ended up building stats around rpy2 so this is fine.
- It might be very difficult to build Maxima via ECL (embedded common lisp) for WASM, in which case we will have to change Sage to not depend on Maxima for symbolic computation. We'll see. This is a very challenging project!

### Make research level mathematical software available to the Javascript ecosystem

Javascript is the most widely deployed language, but there is essentially nothing similar to any part of Sage, Pari, Gap or Singular available natively in [their ecosystem](https://www.npmjs.com/). Web applications, Node.js programs, and [sandboxed code running via Wasmer](https://blog.cloudflare.com/workers-unbound-ga/) could all benefit from such software.

#### JIT: Just in time compiler

Modern Javascript runtimes -- in particular, Chrome V8 and Firefox SpiderMonkey -- have good just-in-time (JIT) compilers that optimize a wide range of Javascript code. It could be valuable to combine math research software with the power of Javascript JIT. The Python ecosystem's JIT story is very different than what's available in Javascript.  There's Pypy, but it's more "fringe",  and it has real performance issues with C extensions. There's also numba, which is amazing for what it is amazing at, but only works for very specific types of code. There's also the new [Pyston](https://www.pyston.org/) spinoff from Dropbox.

Compared to Julia, the Javascript JIT's are also impressive due to how quickly and seamlessly it does JIT'ing, since that's a critical requirement for web pages. Sometimes Julia's JIT experience can involve waiting a long time for the JIT to happen before your code runs.

In any case, there may be situations where a program is fairly easy to write using a combination of Javascript and some of the WebAssembly libraries that come out of this project, and Javascript's JIT might also result in a very pleasant experience overall, as compared to other options.

##### JPython: yet another Python-to-Javascript compiler

Another experimental project you will find here is `jpython`, which is a _very lightweight_ Python-to-Javascript compiler. It makes it possible to write Python code, but benefit from a Javascript JIT and all the functionality we build for WASM above. JPython runs natively in Javascript, so there is no dependence on Python itself (unlike Transcrypt). JPython is a fork of RapydScript, but with very different goals and constraints, e.g., much better conformance with the Python language, support for operator overloading, support for numerical computation, a mode to parse the "Sage preparser" language, and with a lot of what RapydScript does removed (e.g., everything related to frontend UI programming).   This barely exists today though!

#### New low level code

Making libraries like Pari, NTL, eclib, etc. available to Javascript is just a first step. This project also includes building new tools using modern low-level high-performance languages like Zig.

### Does this compete with SageMath?

Unlike [Julia](https://julialang.org/) or [Oscar](https://oscar.computeralgebra.de/), this project does not attempt to directly compete with SageMath. Indeed, one of the goals is to provide a distribution of SageMath that is easier to use, and another goal is to make the components of Sage and ultimately much of the core Sage library efficiently usable in more situations (e.g., node.js, web browsers, [every language wasmer supports](https://github.com/wasmerio/wasmer#-language-integrations), etc.). This project is thus about enriching the mathematical software ecosystem and expanding it beyond Python.

## Build JSage from source

### Dependencies to build

- **Node.js at least version 16.x:** the `node` in your path must be this recent version of node.js, which is very [easy to install](https://nodejs.org/en/download/) on most computers.
- **Standard build tools:** e.g., git, make, curl, m4, etc. For Linux see the Dockerfile remark below, and for macOS, just make sure to install XCode which includes all this.
  - This [Dockerfile](./Dockerfile) automates building JSage from source on Ubuntu Linux 20.04.  It fully works on both x86\_64 and aarch64 Linux, and looking at it might answer any questions about build dependencies.  Also, if you're having trouble building JSage and have Docker installed, you could instead do `make docker` and build this Docker image locally.
- **Tested Platforms:** I've tested building on the following platforms:
  - _x86\_64 and aarch64 Linux_ -- via the Dockerfile above
  - _macOS 12.x with Apple Silicon_, and XCode installed (to provide make, git, etc.)
  - x86\_64 Linux as in any [CoCalc](https://cocalc.com) project with network access.
  - [Microsoft Windows via WSL](https://docs.microsoft.com/en-us/windows/wsl/install#change-the-default-linux-distribution-installed) -- works fine, at least using Ubuntu (the default) after `apt install` the packages in the Dockerfile.

The build takes on the order of **one hour** or so.

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

I have put a lot of work into getting various things to build, e.g., NTL, FLINT, Python, which are currently _**not**_ needed as a dependency for the core library I find myself building. Thus they are now NOT being built by default, since they aren't needed.  Really all we need so far to build what we want to build is JPython (a Python language-&gt;Javascript compiler), GMP and Pari.  It's amazing how much functionality Pari has built in, which overall is much broader (but less deep in some ways) than what's available in the C/C++ ecosystem of NTL/FLINT, etc.  For our purposes though (of something very cross platform and easy to maintain!), Pari is really ideal.

That said, I put a lot of work into these other packages, and maybe they will be important at some point.  But don't expect them to just work.

### No common prefix directory

Unlike SageMath, where everything is built into a single `local` directory, here we build everything in its own self-contained package. When a package like `pari` depends on another package like `gmp` , our Makefile for `pari` explicitly references the `dist` directory in the `packages/dist/gmp` . This makes it possible to uninstall packages, update them, etc., whereas using a common directory for everything can be a mess with possibly conflicting versions of files.

### Native and Wasm

The build creates directories dist/native and dist/wasm. The `dist/native` artifacts are only of value on the computer where you ran the build, since they are architecture dependent and can easily depend on libraries on your system. In contrast, the `dist/wasm` artifacts are platform independent.  They can be used nearly everywhere: on servers via WASM, on ARM computers (e.g., aarch64 linux, Apple Silicon, etc.), and in any modern web browser (though many details remain, obviously).

### Contact

Email [wstein@sagemath.com](mailto:wstein@sagemath.com) if you find this interesting and want to help out.  This is all as open source as possible, given what each dependency allows.   This is right now entirely a _"project for fun and exploration"_ with no real constraints.
