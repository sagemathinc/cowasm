# WASI SDK Modernization Plan

## Goal

Move CoWasm from the old pinned Zig 0.10.1 toolchain path to a pinned
`wasi-sdk` toolchain, while translating CoWasm-owned Zig implementation code
to C.

The strategic target is:

```text
current baseline:     pinned Zig 0.10.1
next toolchain:       pinned wasi-sdk
implementation code:  C/C++/TypeScript, not CoWasm-owned Zig
fallback/comparison:  modern Zig and direct LLVM/lld probes
ABI contract:         explicit WASI/dylink tests
```

This makes `wasi-sdk` the canonical long-term toolchain provider because it is
exactly the bundle CoWasm wants: Clang, lld, wasi-libc, compiler runtime
support, libc++, target-specific sysroots, and WASI driver defaults.

## Strategic Decision

Prefer `wasi-sdk` over modern Zig as the long-term replacement for Zig 0.10.1.

Modern Zig remains useful as:

- a comparison point for wasm dylink behavior;
- a fallback packaged compiler distribution;
- a way to understand what old CoWasm wrapper behavior was relying on.

But the strategic bet should be `wasi-sdk`, not "embrace modern Zig." CoWasm
does not need the Zig language as an implementation language, and it does not
need Zig-specific compiler-driver behavior if `wasi-sdk` can directly expose
the Clang/lld/WASI contract.

## Why WASI SDK Is The Better Fit

`wasi-sdk` is purpose-built around the exact pieces CoWasm needs:

- `clang`;
- `clang++`;
- `wasm-ld`;
- LLVM binutils such as `llvm-objdump`, `llvm-ar`, `llvm-ranlib`, and
  `llvm-strip`;
- wasi-libc sysroots;
- libc, libdl, libc++, libc++abi, libunwind, and compiler runtime support;
- target-specific driver aliases for `wasm32-wasi`, `wasm32-wasip1`,
  `wasm32-wasip2`, and thread variants.

Zig was a very good surprise toolchain distribution in the early CoWasm era.
In 2026, `wasi-sdk` is the more canonical answer for a C/C++ WASI runtime.
Using it also avoids tying CoWasm's runtime glue to Zig language syntax churn.

## Empirical Finding

`wasi-sdk-33.0-x86_64-linux` was tested locally from the official GitHub
release.

Release metadata:

- release: `wasi-sdk-33`;
- published: April 30, 2026;
- Linux x86_64 tarball SHA256:
  `0ba8b5bfaeb2adf3f29bab5841d76cf5318ab8e1642ea195f88baba1abd47bce`;
- `clang version 22.1.0-wasi-sdk`;
- `LLD 22.1.0`;
- default target: `wasm32-unknown-wasip1`.

Size comparison from the local probe:

```text
wasi-sdk 33 tarball:      185M
wasi-sdk 33 unpacked:     642M
Zig 0.16.0 tarball:        53M
Zig 0.16.0 unpacked:      391M
```

The size cost is real, but `wasi-sdk` buys a more direct and standard toolchain
contract.

## Dylink Finding

The key side-module test passed with `wasi-sdk`.

The best direct CoWasm-compatible command found so far is:

```sh
clang -target wasm32-wasip1 -Oz -fPIC -shared -nostdlib \
  -Wl,--allow-undefined -Wl,--no-entry \
  dynamic-library.c -o dynamic-library.so
```

That produced a small `dylink.0` side module and passed the existing
`core/dylink/test/wasi` loader test unchanged:

```text
add10(2022) = 2032
add10b(2022) = 2032
add389(2022) = 2411
add5077_using_lib_using_main(389) = 5466
pynones_match() = 1
All tests passed!
```

This is better than the modern-Zig result in one important way:

- modern `zig cc -shared` rejected `--allow-undefined`;
- wasi-sdk `clang -shared` accepts `-Wl,--allow-undefined`.

The wrapper may still keep a two-step compile-plus-`wasm-ld` path for maximum
control, but `wasi-sdk` does not force that path for the same reason modern
Zig does.

## Important Dylink Caveat

Plain `clang -shared` is not the right default for current CoWasm side modules.

For C, plain `clang -shared` records:

```text
needed_dynlibs:
  libc.so
```

For C++, plain `clang++ -shared` records:

```text
needed_dynlibs:
  libc++.so
  libc++abi.so
  libc.so
```

That is valid WASI SDK behavior, but it is not a drop-in match for CoWasm's
current loader model. Copying `wasi-sdk`'s `libc.so` into the existing
`core/dylink/test/wasi` directory failed because the SDK libc shared module
expects runtime hooks such as:

```text
env.__main_argc_argv
env.__stack_high
env.__stack_low
```

For the current CoWasm model, side modules should initially use:

- `-nostdlib`;
- `--allow-undefined`;
- `--no-entry`;
- runtime symbols resolved by the main module and CoWasm loader.

Loading `wasi-sdk` shared runtime libraries may become useful later, but it is
a separate runtime design project.

## WASI Target Choice

Use `wasm32-wasip1` for new `wasi-sdk` work.

Observations:

- `wasm32-wasi` still works but emits a deprecation warning telling users to
  use `wasm32-wasip1`;
- `wasm32-wasip1` emits normal core WebAssembly modules compatible with the
  current CoWasm tooling;
- `wasm32-wasip2` emits component-format wasm artifacts, which current
  `wasm-objdump` in the environment rejected as non-MVP core wasm.

`wasm32-wasip2` should be treated as a future branch, not the migration target
for current CoWasm.

## Current Baseline

- CoWasm currently installs Zig 0.10.1 via `core/build/src/zig/Makefile`.
- `bin/zig` is the default compiler provider for package builds.
- `cowasm-cc` and `cowasm-c++` are Python wrappers around Zig plus manual
  `zig wasm-ld` linking.
- The wrapper currently compiles dynamic modules through
  `wasm32-emscripten -fPIC` plus manually supplied WASI/musl include paths.
- CoWasm carries `01-emscripten.patch` for the old Zig path.
- CoWasm has 35 Zig files and 4086 lines of Zig source in:
  - `core/kernel/src`;
  - `core/posix-node/src`.
- The main Zig build entry points are:
  - `core/kernel/Makefile`, which builds `src/kernel/interface.zig`;
  - `core/posix-node/Makefile`, which builds `src/lib.zig`;
  - `core/build/src/zig/bin/zig_cowasm_compiler.py`, which still accepts `.zig`
    sources.

## Current Landed State

As of the June 2026 manual runs, the plan is no longer purely prospective.
The repository already has a side-by-side `wasi-sdk` probe path:

- `make -C core/build wasi-sdk-next`;
- `make -C core/build test-wasi-sdk-next`;
- pinned `wasi-sdk-33.0` bootstrap in `core/build/src/wasi-sdk/Makefile`;
- checksum validation for Linux x86_64, Linux arm64, macOS x86_64, and macOS
  arm64 release assets;
- SDK install path:
  `core/build/build/wasi-sdk/dist/wasi-sdk-next/native`;
- explicit tool symlinks in `bin/` for `clang`, `clang++`, `wasm-ld`,
  `llvm-ar`, `llvm-ranlib`, `llvm-nm`, `llvm-objdump`, `llvm-strip`, and
  `llvm-strings`.

The compiler wrapper also has a first `wasi-sdk` selector:

```sh
COWASM_TOOLCHAIN=zig       # current default
COWASM_TOOLCHAIN=clang     # direct experimental clang/lld probe
COWASM_TOOLCHAIN=wasi-sdk  # pinned wasi-sdk-next probe
```

The landed `wasi-sdk` wrapper mode currently supports:

- `--print-multiarch` returning `wasm32-wasip1`;
- standalone tiny C and C++ programs;
- compile-only C/C++;
- CoWasm-style C/C++ side modules through `-fPIC -shared -nostdlib
  -Wl,--allow-undefined -Wl,--no-entry`;
- stripping optimized side modules with `--strip-all`;
- filtering `-lc`, `-lm`, and `-ldl` from side-module link flags so the SDK
  driver does not accidentally emit `needed_dynlibs`;
- archive tool selection through `cowasm-ar` and `cowasm-ranlib`.

The `core/dylink` Phase 9 blocker is also landed:

- the old Zig-built `dist/wasm/libdylink.a` remains as the baseline archive;
- `dist/wasm-export/libc-wasi-sdk.c` is generated by `dist/libc.js
  --wasi-sdk`;
- `dist/wasm/libdylink-wasi-sdk.a` is compiled by pinned
  `wasi-sdk-clang-next` with `-target wasm32-wasip1 -fPIC`;
- the SDK archive build rejects `R_WASM_MEMORY_ADDR*` relocations;
- `core/dylink/test/wasi` links a `wasi-sdk` main module against
  `libdylink-wasi-sdk.a` and runs the existing loader test;
- `make -C core/dylink test-wasi-sdk-next` covers SDK side modules, the
  SDK-built archive-backed main module, and the tiny C++ side-module runtime
  smoke.

The focused `core/dylink` Phase 10 test expansion is also landed:

- the WASI dylink fixture covers repeated `dlopen`/`dlsym` on the same side
  module;
- the side module includes a constructor and exports the synthesized
  `__wasm_call_ctors` hook in the `wasi-sdk` build;
- runtime checks assert that repeated `dlopen` reuses the loaded module and does
  not rerun constructors;
- the SDK ABI checker parses `dylink.0` metadata with
  `core/dylink/src/metadata.ts` and asserts memory/table metadata is present;
- the checker also asserts no accidental `needed_dynlibs`, the expected GOT
  imports, `__wasm_apply_data_relocs`, and `__wasm_call_ctors`.

This status changes the immediate work: do not re-implement the bootstrap, the
basic wrapper selector, the Phase 9 archive probe, or the Phase 10 focused
dylink compatibility tests. The Phase 11, Phase 12, and Phase 13 probe targets
are also covered. The next blocker is Phase 14 CPython work.

The first Phase 11 package probe is partially landed for `core/zlib`:

- `make -C core/zlib test-wasi-sdk-standalone` builds zlib with
  `COWASM_TOOLCHAIN=wasi-sdk`;
- the probe configures zlib with `cowasm-cc`, `cowasm-ar`, and
  `cowasm-ranlib`;
- it rebuilds `libz.a` from object files, preserving parity with the default
  wasm target's archive workaround;
- it builds and runs zlib's upstream `example` program through the standalone
  WASI runner;
- `make -C core/zlib test-wasi-sdk-next` is available as the stable
  `wasi-sdk-next` target name.

The `core/bzip2` Phase 11 package probe is also partially landed:

- `make -C core/bzip2 test-wasi-sdk-standalone` builds bzip2 with
  `COWASM_TOOLCHAIN=wasi-sdk`;
- the probe uses the existing `extra_config.h` plus a small WASI-only shim for
  `fchmod`, `fchown`, and `signal`;
- it installs the bzip2 command-line tools and `libbz2.a`;
- it checks `bzip2 --help` and `bunzip2 --help`;
- it runs a compress/decompress roundtrip under the standalone WASI runner;
- `make -C core/bzip2 test-wasi-sdk-next` is available as the stable
  `wasi-sdk-next` target name.

The `core/termcap` Phase 11 package probe is also partially landed:

- `make -C core/termcap test-wasi-sdk-standalone` builds `libtermcap.a` with
  `COWASM_TOOLCHAIN=wasi-sdk`;
- the probe configures termcap with the pinned SDK wrapper, archive, and ranlib
  tools;
- it compiles and runs a small termcap API program that checks `tgetent`,
  `tgetnum`, `tgetflag`, `tgetstr`, and `tgoto`;
- `make -C core/termcap test-wasi-sdk-next` is available as the stable
  `wasi-sdk-next` target name.

The `sagemath/gmp` Phase 11 package probe is also partially landed:

- `make -C sagemath/gmp test-wasi-sdk-standalone` builds static GMP with
  `COWASM_TOOLCHAIN=wasi-sdk`;
- the probe configures GMP with `ABI=standard`, generic mpn code,
  `--disable-assembly`, and `--disable-shared`;
- it links the existing `test-gmp.c` mathematical smoke against the SDK-built
  `libgmp.a`;
- it runs the smoke under the standalone WASI runner and checks the expected
  large integer output;
- `make -C sagemath/gmp test-wasi-sdk-next` is available as the stable
  `wasi-sdk-next` target name.

The `core/sqlite` Phase 11 package probe is also partially landed:

- `make -C core/sqlite test-wasi-sdk-standalone` builds a static SQLite
  archive with `COWASM_TOOLCHAIN=wasi-sdk`;
- the probe applies the existing syscall and shell patches;
- it disables loadable extensions, threads, largefile, readline, zlib, and math
  functions for the standalone SDK smoke;
- it links a small in-memory SQLite program against the SDK-built
  `libsqlite3.a`;
- it runs `select 389*5077` under the standalone WASI runner;
- `make -C core/sqlite test-wasi-sdk-next` is available as the stable
  `wasi-sdk-next` target name.

The `core/lua` Phase 11 package probe is also partially landed:

- `make -C core/lua test-wasi-sdk-standalone` builds Lua with
  `COWASM_TOOLCHAIN=wasi-sdk`;
- the probe supplies local compatibility shims for setjmp/longjmp, signal,
  clock, temporary files, and `system`;
- it installs the Lua executable, headers, and `liblua.a` into
  `dist/wasi-sdk`;
- it runs the existing `sum.lua` smoke under the standalone WASI runner;
- `make -C core/lua test-wasi-sdk-next` is available as the stable
  `wasi-sdk-next` target name.

The Phase 11, Phase 12, and Phase 13 probe lists are now covered by
side-by-side `wasi-sdk-next` probe targets. The next blocker is Phase 14
CPython work.

The first Phase 12 package probe is partially landed for `core/libedit`:

- `make -C core/libedit test-wasi-sdk-standalone` builds libedit with
  `COWASM_TOOLCHAIN=wasi-sdk`;
- the probe first builds the `core/termcap` SDK dependency;
- it applies the existing readline compatibility patch and disables example
  builds;
- it installs `libedit.a`, histedit/readline headers, and pkg-config metadata
  into `dist/wasi-sdk`;
- it compiles and runs a focused history/tokenizer API smoke under the
  standalone WASI runner;
- `make -C core/libedit test-wasi-sdk-next` is available as the stable
  `wasi-sdk-next` target name.

The `core/ncurses` Phase 12 package probe is also partially landed:

- `make -C core/ncurses test-wasi-sdk-standalone` builds ncurses with
  `COWASM_TOOLCHAIN=wasi-sdk`;
- the probe first builds the `core/termcap` SDK dependency;
- it supplies a small standalone `sgtty.h` compatibility shim and uses
  `core/posix-wasm` headers for CoWasm runtime-adjacent declarations;
- it installs `libncurses.a`, `libpanel.a`, `libmenu.a`, `libform.a`,
  `libncurses++.a`, headers, and the `ncurses6-config` helper into
  `dist/wasi-sdk`;
- it compiles and runs a focused `curses_version()`/constant smoke under the
  standalone WASI runner;
- `make -C core/ncurses test-wasi-sdk-next` is available as the stable
  `wasi-sdk-next` target name.

The `core/less` Phase 12 package probe is also partially landed:

- `make -C core/less test-wasi-sdk-standalone` builds less with
  `COWASM_TOOLCHAIN=wasi-sdk`;
- the probe first builds the `core/termcap` and `core/ncurses` SDK
  dependencies;
- it supplies local standalone compatibility shims for legacy terminal,
  setjmp, signal, and process APIs;
- it disables shell escapes, editor integration, `popen`, `ttyname`,
  `_setjmp`, and `sigsetmask` for the standalone SDK smoke;
- it installs `less`, `lesskey`, `lessecho`, and man pages into
  `dist/wasi-sdk`;
- it runs `less --help` under the standalone WASI runner and checks the command
  help text;
- `make -C core/less test-wasi-sdk-next` is available as the stable
  `wasi-sdk-next` target name.

The `core/tar` Phase 12 package probe is also partially landed:

- `make -C core/tar test-wasi-sdk-standalone` builds libarchive with
  `COWASM_TOOLCHAIN=wasi-sdk`;
- the probe first builds the SDK zlib, bzip2, and lzma dependencies;
- it supplies standalone compatibility shims for wait, termios, network
  lookup, passwd/group lookup, process IDs, and archive child-process hooks;
- it installs `libarchive.a`, archive headers, pkg-config metadata, `tar`,
  `cat`, `cpio`, and man pages into `dist/wasi-sdk`;
- it checks `tar -h`, `cat --version`, and `cpio --version` under the
  standalone WASI runner;
- it creates and extracts a tar archive under the standalone WASI runner and
  compares the extracted file content;
- `make -C core/tar test-wasi-sdk-next` is available as the stable
  `wasi-sdk-next` target name.

The `core/openssl` Phase 12 package probe is also partially landed:

- `make -C core/openssl test-wasi-sdk-standalone` builds OpenSSL with
  `COWASM_TOOLCHAIN=wasi-sdk`;
- the probe first ensures the `core/posix-wasm` runtime archive exists;
- it supplies standalone compatibility shims for wait, termios, network
  lookup, uid/gid access, fork, pipe, dup, alarm, and terminal attributes;
- it links against the CoWasm POSIX runtime plus WASI emulation libraries for
  mmap, getpid, signal, and process clocks;
- it installs `libcrypto.a`, `libssl.a`, OpenSSL headers, pkg-config metadata,
  and the `openssl` command into `dist/wasi-sdk`;
- it runs `openssl md5` under the standalone WASI runner and checks the
  expected stdin digest;
- `make -C core/openssl test-wasi-sdk-next` is available as the stable
  `wasi-sdk-next` target name.

The `core/libgit2` Phase 12 package probe is also partially landed:

- `make -C core/libgit2 test-wasi-sdk-standalone` builds libgit2 with
  `COWASM_TOOLCHAIN=wasi-sdk`;
- the probe first builds the SDK zlib dependency and bootstraps
  `wasi-sdk-next`;
- it supplies standalone compatibility shims for network lookup, passwd
  lookup, process identity, uid/gid access, and load averages;
- it applies the existing CoWasm libgit2 patches when they still match the
  fresh upstream tree;
- it installs `libgit2.a` and libgit2 headers into `dist/wasi-sdk`;
- it compiles and runs the `test-init.c` smoke program under the standalone
  WASI runner and checks that `git_repository_init` creates a `.git`
  directory;
- `make -C core/libgit2 test-wasi-sdk-next` is available as the stable
  `wasi-sdk-next` target name.

The first Phase 13 C++ and Python-extension surface probes are partially
landed:

- `make -C core/dylink/test/cxx-runtime test-wasi-sdk-next` builds a C++ side
  module with `wasi-sdk-clang++-next`;
- the C++ side module statically links the pinned SDK `libc++.a` and
  `libc++abi.a` archives instead of declaring `needed_dynlibs`;
- the C++ smoke now checks `std::string`, pointer-safe RTTI, repeated
  `dlopen` of the same side module, and coexistence with a separate C side
  module in the same process;
- `make -C core/dylink/test/python-extension test-wasi-sdk-next` builds the
  Python-extension-shaped `hello.so` fixture with `wasi-sdk-clang-next`;
- the Python-extension fixture verifies `dylink.0`, exported `PyInit_hello`,
  no `needed_dynlibs`, `dlopen`, `dlsym`, and function-pointer callback
  behavior under the standalone Node/WASI runner;
- `make -C core/dylink test-wasi-sdk-next` now includes the WASI dylink tests,
  archive dylink tests, C++ runtime fixture, and Python-extension fixture.
- `make -C python/bench/src/cython test-wasi-sdk-next` regenerates `fib.c`
  from `fib.pyx` with the repo's packaged Cython 3.2.5 and builds the
  generated extension C into a `wasi-sdk` side module;
- the generated Cython side-module probe verifies `dylink.0`, exported
  `PyInit_fib`, and no `needed_dynlibs`; it is intentionally a compile and
  module-shape check until Phase 14 CPython import tests are available.

The Phase 14 CPython configure and core-compile probe is now landed:

- `make -C python/cpython test-wasi-sdk-next` prepares a side-by-side
  `build/wasi-sdk` tree without changing the default `build/wasm` path;
- the probe reuses the normal CPython wasm patch list through
  `src/prepare-wasm-build.sh`;
- it configures CPython with `COWASM_TOOLCHAIN=wasi-sdk`, `cowasm-cc`,
  `cowasm-c++`, `cowasm-ar`, and `cowasm-ranlib`;
- it points CPython at the SDK `core/posix-wasm/dist/wasi-sdk` compatibility
  headers and archive;
- it records the wasi-sdk `wasm32-wasip1` compiler target while preserving
  CPython's existing `wasm32-wasi` multiarch/SOABI names;
- it appends the normal CoWasm `src/pyconfig.h` overlay after SDK configure so
  the SDK build sees the same runtime compatibility declarations and config
  overrides as the default wasm build;
- it keeps `--experimental-pic` in `BLDSHARED` as a CoWasm compatibility flag,
  with the wasi-sdk wrapper filtering that legacy flag before invoking clang;
- it generates the SDK CPython `Programs/libpython.c` export thunk without
  Emscripten signal exports and fork-hook exports that are not declared in the
  configured `wasi-sdk` build;
- it compiles `Programs/python.o`, parser objects, object-runtime objects,
  Python core objects, bootstrap module objects, and the CoWasm static
  `_posixsubprocess` module with `COWASM_TOOLCHAIN=wasi-sdk` before running the
  broader archive build;
- the `_posixsubprocess` patch now declares the unreachable fallback fork/exec
  path prototypes under `__wasi__`, so clang can parse the upstream fallback
  code while the runtime path still goes through `python_wasm_fork_exec`;
- the SDK `posix-wasm` compatibility header now defers to wasi-sdk's
  `sched.h` definition of `struct sched_param`, avoiding a duplicate type
  definition once the CoWasm pyconfig overlay is appended;
- the SDK `posix-wasm` compatibility layer now exposes POSIX-shaped socket
  prototypes, name-service declarations, address-info flags, `struct servent`,
  `h_errno`, and `struct winsize` in the generated SDK headers, while leaving
  `struct addrinfo` to CPython's fallback definition;
- `make -C python/cpython test-wasi-sdk-next` now builds
  `libpython3.14.a` with the SDK path, so the Phase 14 compile probe covers the
  built-in extension-module object set as well as the core runtime objects.
- the SDK probe now also links `build/wasi-sdk/python-wasi-sdk.wasm` from a C
  translation of the `python/python-wasm` Zig wrapper, the generated
  `Programs/libpython.c` export thunk, `libpython3.14.a`, and the generated
  HACL static archives;
- `test-wasi-sdk-link` verifies that the SDK-built wasm exports the CoWasm
  runtime entry points such as `cowasm_python_init` and
  `cowasm_python_terminal`, exports `__wasm_call_ctors` for wasm-ld's
  synthesized global-relocation hook, and imports the expected TypeScript
  runtime hooks such as `wasmSendString` and `_PyEM_TrampolineCall`.
- the SDK CPython link now compiles CPython and the wrapper as PIC and links
  `build/wasi-sdk/python-wasi-sdk.wasm` as a real `dylink.0` side module with
  `-shared -nostdlib`;
- the SDK wrapper provides the disabled Emscripten signal globals required by
  CPython's `ceval.o`, legacy `netdb` compatibility symbols not provided by
  the main runtime (`h_errno`, `getipnodebyaddr`, `freehostent`, `inet_ntoa`),
  a local `fchdir` wasm fallback for the only host POSIX function imported
  through `GOT.func`, and an exported `__main_argc_argv` entrypoint for the
  kernel runner;
- `make -C python/cpython wasi-sdk-cpython` installs from the SDK link-probe
  artifacts without invoking CPython's built-in `python.wasm` rule, including
  `dist/wasi-sdk/bin/python3.14.wasm`, `libpython3.14.a`, HACL archives,
  headers, patched `_sysconfigdata__wasi_wasm32-wasi.py`, and
  `lib/dist/python-stdlib.zip`;
- `make -C python/cpython python-wasi-sdk` creates the top-level wrapper
  symlink to `python/cpython/bin/python-wasi-sdk`.

The Phase 14 runtime-startup blocker is now cleared.

Earlier June 2026 follow-up work had already narrowed several real
side-module defects:

- the dylink loader now provides a side-module-local `env.__memory_size`
  function derived from `dylink.0` memory metadata;
- the SDK CPython wrapper can use `__memory_base` plus `__memory_size` to keep
  side-module allocator calls from forwarding static-data, pre-load, or
  out-of-linear-memory pointers to the main runtime allocator;
- the dylink loader now clears the whole side-module static-memory allocation
  before instantiating the module. This is required because the `dylink.0`
  memory size includes BSS, while the wasm data segment only initializes the
  non-zero prefix;
- after BSS clearing, the original `method_dealloc`/GC-header trap moved to a
  later CPython startup path, confirming that dirty side-module static memory
  was one real defect;
- the SDK CPython patch list now includes a target patch that treats
  `_PyTuple_Resize(tuple, current_size)` as a no-op before enforcing the unique
  reference precondition. This matches the operation's behavior: no resize is
  needed when `oldsize == newsize`, so uniqueness is not required;
- the clean SDK CPython build, link, and install path completes through:
  `make -C python/cpython test-wasi-sdk-link wasi-sdk-cpython
  python-wasi-sdk`;
- `./bin/python-wasi-sdk -S --version` succeeds and reports
  `Python 3.14.6`.

The final startup trap was caused by pthread ABI mismatch, not by the
`MemoryError` object layout itself. SDK CPython was compiled against
`wasi-sdk`'s `pthread.h`, but unresolved `pthread_*` imports were being
satisfied by CoWasm's main runtime pthread exports, whose stub structs come
from the CoWasm POSIX runtime. Keeping CPython's pthread calls local to the SDK
side module avoids cross-ABI writes into CPython runtime state.

The SDK wrapper now provides local single-thread pthread stubs for the subset
CPython imports during startup and normal single-thread execution:

- mutex, condvar, condattr, and attr init/destroy/lock/wait helpers;
- `pthread_self`;
- `pthread_create` returning `ENOSYS`;
- TLS key create/delete/get/set with a small wrapper-local key table.

The SDK pyconfig overlay now also declares the CoWasm JavaScript POSIX process
surface that cross configure misses in the side-module build:

- `HAVE_EXECV`;
- `HAVE_FORK`;
- `HAVE_WAITPID`.

Those macros expose the same `os.fork`, `os.execv`, `os.execve`, and
`os.waitpid` names that the default wasm build has. CPython's patched WASI
`os.spawn*` implementation then publishes `spawnv`/`spawnl` and routes actual
process creation through `subprocess`, so the runtime-contract tests exercise
CoWasm's process surface without relying on native WASI fork.

Validated Phase 14 runtime status:

```sh
./bin/python-wasi-sdk -S --version
./bin/python-wasi-sdk -S -c 'pass'
./bin/python-wasi-sdk -S -c 'print(1)'
make -C python/cpython test-wasi-sdk-runtime-contracts
```

The runtime contract suite passes all 12 tests, covering filesystem behavior,
`os.spawnl`, and subprocess stdin/stdout/stderr, environment, cwd, file
descriptor, and nonzero-exit semantics. This clears the previous "do not
proceed" gate for Phase 14; the next work can move to SDK CPython import tests,
pip behavior, and package/extension integration.

The first SDK CPython import-smoke target is also landed:

- `make -C python/cpython test-wasi-sdk-imports` runs under
  `./bin/python-wasi-sdk`;
- it verifies `site` startup installs the CoWasm import hook;
- it imports representative pure-Python stdlib modules used by packaging,
  subprocess, filesystem, and HTTP/client code;
- it checks that SDK sysconfig still reports the expected
  `cpython-314-wasm32-wasi` SOABI, `.cpython-314-wasm32-wasi.so` extension
  suffix, SDK include path, and `cowasm-cc` shared-link command.

The first SDK CPython dynamic-extension import probe is also landed for
`_json`:

- `make -C python/cpython test-wasi-sdk-extension-imports` builds
  `Modules/_json.cpython-314-wasm32-wasi.so` with `COWASM_TOOLCHAIN=wasi-sdk`;
- the extension link clears CPython's generated `CONFIGURE_LDFLAGS_NODIST`
  for the shared-module link so main-module memory flags such as
  `--initial-memory` and `--stack-first` do not leak into side modules;
- the target checks that the extension has a `dylink.0` section, exports
  `PyInit__json`, and does not declare `needed_dynlibs`;
- it installs `_json` into `dist/wasi-sdk/lib/python3.14/lib-dynload`;
- it imports `_json` under `python-wasi-sdk` and verifies that `json` uses the
  extension accelerators.

This clears the first extension-import boundary and sets up the
dependency-backed extension probes.

The first dependency-backed SDK CPython extension import probe is also landed
for `zlib`:

- the SDK `core/zlib` package probe now compiles zlib objects with `-fPIC`
  while preserving the standalone zlib example smoke;
- `make -C python/cpython test-wasi-sdk-extension-imports` also builds
  `Modules/zlib.cpython-314-wasm32-wasi.so` against the SDK zlib archive;
- the target applies the same shared-module guardrails as `_json`: no
  main-module memory flags, `env.memory` initial size of one page,
  `dylink.0`, expected `PyInit_zlib`, and no `needed_dynlibs`;
- it installs `zlib` into `dist/wasi-sdk/lib/python3.14/lib-dynload`;
- it imports `zlib` under `python-wasi-sdk` and checks compression,
  decompression, and CRC behavior.

This clears the first dependency-backed extension boundary. Remaining Phase 14
extension work can now move to `pyexpat`, `_bz2`, `_lzma`, `_sqlite3`, and
other package-backed modules before pip/ensurepip behavior.

## Order Of Work

Recommended order:

1. Preserve the current Zig 0.10.1 baseline.
2. Add side-by-side `wasi-sdk-next` bootstrap and probes.
3. Translate CoWasm-owned Zig runtime glue to C.
4. Remove `zig build-lib` and `.zig` source dependencies from core runtime
   builds.
5. Move `cowasm-cc` / `cowasm-c++` to a `wasi-sdk`-backed C/C++ toolchain
   path.
6. Rebuild CoWasm runtime archives such as `libdylink` with PIC where needed.
7. Port packages in dependency order.
8. Flip the default only after core, CPython, and Sage-relevant tests pass.

This order avoids porting old Zig syntax to new Zig syntax just to delete it
later. It also avoids switching package builds before the runtime glue and
dylink archives are ready for a Clang/lld-first path.

Some work has intentionally landed out of strict phase order: the
side-by-side SDK bootstrap and basic `COWASM_TOOLCHAIN=wasi-sdk` wrapper mode
exist before the C translation. Keep treating them as probes until the runtime
archive and core translation phases are green.

## Zig Source Inventory

The existing Zig code falls into two different migration buckets.

### Wasm Kernel Glue

Files:

- `core/kernel/src/kernel/cowasm.zig`;
- `core/kernel/src/kernel/interface.zig`;
- `core/kernel/src/wasm/posix.zig`;
- `core/kernel/src/wasm/posix/*.zig`.

Role:

- expose kernel entry points;
- provide wasm-side POSIX constants and stubs;
- adapt imported JavaScript/runtime services to C-shaped wasm exports;
- provide small implementations for `stdio`, `stdlib`, `string`, `termios`,
  `socket`, `netdb`, and related shims.

Risk profile:

- low to medium;
- mostly direct C translation;
- must preserve exact export names, import names, pointer widths, errno values,
  and struct layouts;
- good first target because it is small and has existing wasm tests.

### Native Node POSIX Addon

Files:

- `core/posix-node/src/lib.zig`;
- `core/posix-node/src/node.zig`;
- `core/posix-node/src/unistd.zig`;
- `core/posix-node/src/socket.zig`;
- `core/posix-node/src/fork_exec.zig`;
- `core/posix-node/src/termios.zig`;
- `core/posix-node/src/netdb.zig`;
- `core/posix-node/src/netif.zig`;
- `core/posix-node/src/*.zig`.

Role:

- implement a native Node N-API module;
- expose host POSIX functionality to the CoWasm JavaScript runtime;
- perform argument conversion, errno mapping, buffer/string handling, struct
  packing, file descriptor calls, process spawning, sockets, termios, and
  network lookup.

Risk profile:

- medium to high;
- not hard because it is Zig, but because it crosses Node N-API, libc, errno,
  process, terminal, and socket boundaries;
- `node.zig`, `unistd.zig`, `socket.zig`, `termios.zig`, and `fork_exec.zig`
  should be translated deliberately with parity tests.

## Translation Design

### C Runtime Shape

Use C, not C++, for the replacement runtime glue.

Reasons:

- the exposed interfaces are already C-like;
- raw N-API is a C API;
- C avoids pulling C++ ABI/runtime questions into the native addon migration;
- C keeps direct `wasi-sdk` and direct LLVM/lld fallback paths straightforward;
- C makes Zig optional as a historical toolchain provider instead of a source
  language dependency.

Expected layout:

```text
core/kernel/src/kernel/*.c
core/kernel/src/wasm/posix/*.c
core/kernel/src/wasm/posix/*.h
core/posix-node/src/*.c
core/posix-node/src/*.h
```

Do not make this a broad architecture rewrite. Keep module names and exported
functions close to the current Zig files so review can compare old and new
behavior mechanically.

### Kernel C Rules

- Preserve exported wasm symbol names exactly.
- Preserve imported runtime symbol names exactly.
- Keep pointer arithmetic explicit with `uintptr_t`.
- Keep struct layout checks near the C definitions.
- Keep errno values and POSIX constants generated or asserted, not hand-copied
  across multiple files.
- Keep the final wasm link command explicit enough to inspect imports, exports,
  memory/table behavior, and custom sections.

### Native Node C Rules

- Use raw N-API.
- Build a small local helper layer to replace the useful parts of `node.zig`:
  - argument count/type checks;
  - integer and boolean conversion;
  - UTF-8 string extraction;
  - buffer pointer/length extraction;
  - object property reads and writes;
  - errno-to-exception helpers;
  - method registration helpers;
  - cleanup for allocated strings and arrays.
- Keep helper functions boring and local.
- Use `goto cleanup` in functions with multiple allocations.
- Keep the translated module boundary close to the current Zig modules:
  `unistd`, `socket`, `termios`, `netdb`, `spawn`, `wait`, `signal`, `netif`,
  and `other`.

### Constants Strategy

Replace Zig comptime constants extraction with an explicit generated artifact.

Good options:

1. Build and run a tiny native C program that prints JSON or TypeScript source.
2. Compile a native C object and use preprocessor output for selected constants.
3. Maintain a checked-in generated TypeScript file plus a validation target that
   compares it to a native generator.

Recommended path:

- use a native C generator for host constants used by `core/posix-node`;
- use a separate WASI-targeted header or generated C include for wasm constants;
- keep the generated TypeScript API shape stable for existing consumers;
- add validation that catches changed constants on the host platform.

The constants migration should happen before translating the largest native
modules because it removes one of the main places Zig currently provides real
convenience.

## Phase 0: Freeze The Baseline

Before changing implementation language or toolchain, capture current behavior.

Actions:

- Record `bin/zig version` and `bin/zig env`.
- Record `cowasm-cc -cowasm-verbose` output for:
  - a trivial C shared module;
  - a module with global data;
  - a module with unresolved function symbols;
  - a module with unresolved data symbols;
  - a small C++ module.
- Save `wasm-objdump -x` summaries for those outputs.
- Record current core Zig-source builds:
  - `make -C core/kernel test`;
  - `make -C core/posix-node test`, or the closest available native addon
    smoke target.
- Keep the existing scheduled baseline green:
  - `make -C core/build test`;
  - `make -C core/kernel test`;
  - `make -C core/zlib test`;
  - `make -C python/cpython test-runtime-contracts`;
  - `make -C python/cpython test`;
  - `make -C sagemath/gmp test`;
  - `make -C sagemath/pari test`.

Deliverable: baseline logs and object-shape notes that define the behavior the
C translation and `wasi-sdk` toolchain must preserve.

## Phase 1: Add Side-By-Side WASI SDK Bootstrap (Landed)

Add `wasi-sdk` without changing the default build.

Landed actions:

- Added `make -C core/build wasi-sdk-next`.
- Added `make -C core/build test-wasi-sdk-next`.
- Pinned `wasi-sdk-33.0`.
- Installed the SDK into:
  `core/build/build/wasi-sdk/dist/wasi-sdk-next/native`.
- Symlinked drivers into `bin/` with explicit names:
  - `bin/wasi-sdk-clang-next`;
  - `bin/wasi-sdk-clang++-next`;
  - `bin/wasi-sdk-wasm-ld-next`;
  - `bin/wasi-sdk-llvm-ar-next`;
  - `bin/wasi-sdk-llvm-ranlib-next`;
  - `bin/wasi-sdk-llvm-nm-next`;
  - `bin/wasi-sdk-llvm-objdump-next`;
  - `bin/wasi-sdk-llvm-strip-next`;
  - `bin/wasi-sdk-llvm-strings-next`.
- Added checksum validation for Linux x86_64, Linux arm64, macOS x86_64, and
  macOS arm64.
- Added a probe script that checks:
  - `clang --version`;
  - `clang++ --version`;
  - `wasm-ld --version`;
  - `llvm-nm --version`;
  - `llvm-strings --version`;
  - `clang -target wasm32-wasip1 hello.c`;
  - `clang -target wasm32-wasip1 -Oz -fPIC -shared add.c`;
  - `clang -target wasm32-wasip1 -Oz -fPIC -shared -nostdlib
    -Wl,--allow-undefined -Wl,--no-entry add.c`;
  - `llvm-objdump` checks that `dylink.0` is present;
  - `llvm-strings` checks that CoWasm-style side modules do not contain
    accidental SDK `needed_dynlibs`.

Non-goals in this phase:

- do not point `bin/zig` at anything new;
- do not remove the old Zig bootstrap;
- do not change package builds;
- do not try `wasm32-wasip2` for current CoWasm runtime artifacts.

Deliverable: `wasi-sdk` is available as a C/C++ toolchain probe, not as the
default.

## Phase 2: Build C Scaffolding And Parity Harnesses

Create the C infrastructure before translating large files.

Actions:

- Add shared C headers for wasm kernel imports/exports and POSIX structs.
- Add native C helper files for N-API conversion and errno handling.
- Add layout/assertion helpers:
  - `sizeof`;
  - `offsetof`;
  - selected enum and constant values;
  - pointer-size expectations.
- Add small tests that call helpers directly where possible.
- Add build rules that can compile one C replacement file next to the existing
  Zig implementation without switching all modules at once.

Deliverable: the repository has a C-shaped place for the translated code to
land, with focused tests before the large migration starts.

## Phase 3: Translate Wasm Kernel Glue To C

Translate the smaller wasm-side Zig layer first.

Suggested order:

1. `core/kernel/src/kernel/cowasm.zig`
2. `core/kernel/src/wasm/posix/errno.zig`
3. `core/kernel/src/wasm/posix/signal.zig`
4. `core/kernel/src/wasm/posix/wait.zig`
5. `core/kernel/src/wasm/posix/stdio.zig`
6. `core/kernel/src/wasm/posix/string.zig`
7. `core/kernel/src/wasm/posix/stdlib.zig`
8. `core/kernel/src/wasm/posix/unistd.zig`
9. `core/kernel/src/wasm/posix/stat.zig`
10. `core/kernel/src/wasm/posix/termios.zig`
11. `core/kernel/src/wasm/posix/netif.zig`
12. `core/kernel/src/wasm/posix/netdb.zig`
13. `core/kernel/src/wasm/posix/socket.zig`
14. `core/kernel/src/wasm/posix/other.zig`
15. `core/kernel/src/wasm/posix.zig`
16. `core/kernel/src/kernel/interface.zig`

Validation after each cluster:

- run the current Zig tests until replaced;
- run the equivalent C tests;
- run `make -C core/kernel test`;
- inspect wasm imports/exports for changed names;
- inspect artifact size changes when meaningful.

Deliverable: `core/kernel` no longer requires Zig source to build.

## Phase 4: Replace Constants Generation

Remove the Zig comptime constants dependency.

Actions:

- Replace `core/kernel/src/wasm/posix/constants.zig` with C/header generation
  or checked constants plus assertions.
- Replace `core/posix-node/src/constants.zig` with a native C generator.
- Preserve the TypeScript constants API consumed by:
  - `core/kernel/src/wasm/posix/constants.ts`;
  - `core/posix-node/src/index.ts`;
  - any runtime consumers found by `rg`.
- Add a validation target that fails when generated constants differ from the
  checked-in output.

Deliverable: constants no longer require Zig, and drift is testable.

## Phase 5: Translate Native N-API Foundation

Translate `core/posix-node/src/node.zig` before translating most POSIX modules.

Actions:

- Implement `node.c` / `node.h` helper functions for raw N-API.
- Translate module initialization from `lib.zig` to C.
- Register one or two tiny functions through the new C module path.
- Preserve exception messages where they are relied on by tests.
- Preserve errno propagation behavior.
- Keep the old Zig module path available until feature parity is reached.

Validation:

- build the native addon for the current host;
- import it from Node;
- call trivial methods;
- run any existing `core/posix-node` smoke tests.

Deliverable: a C N-API module skeleton can replace the Zig module skeleton.

## Phase 6: Translate Native POSIX Modules

Translate native addon modules from least risky to most risky.

Suggested order:

1. `wait.zig`
2. `signal.zig`
3. `other.zig`
4. `netif.zig`
5. `netdb.zig`
6. `termios.zig`
7. `unistd.zig`
8. `socket.zig`
9. `spawn.zig`
10. `fork_exec.zig`

Reasoning:

- simple modules prove the C helper layer;
- network and terminal modules exercise struct packing and platform constants;
- `unistd` is broad and should come after helpers stabilize;
- sockets need careful sockaddr and buffer behavior;
- `fork_exec` is last because process setup, file descriptor handling, pipes,
  environment, and cleanup paths are where parity mistakes are most expensive.

Validation for each module:

- run focused JS tests for the exported functions;
- compare representative successful calls and errno failures against the Zig
  implementation;
- test invalid argument behavior;
- run the runtime paths that consume the module;
- run under Linux first, then macOS once Linux is stable.

Deliverable: `core/posix-node` no longer requires Zig source to build.

## Phase 7: Remove Core Zig Build Dependencies

After the C translations pass parity, remove the old source-language path.

Actions:

- Remove `zig build-lib` invocations for CoWasm-owned source.
- Remove `.zig` source discovery from `core/kernel/Makefile`.
- Remove `.zig` source discovery from `core/posix-node/Makefile`.
- Decide whether `zig_cowasm_compiler.py` should still accept `.zig` inputs:
  - likely remove CoWasm's dependency on it;
  - optionally keep passthrough support only if third-party use needs it.
- Remove stale comments that describe Zig source requirements.
- Keep `bin/zig` as the old compiler distribution until the `wasi-sdk`
  migration is ready.

Deliverable: CoWasm core runtime is C/C++/TypeScript from the implementation
language perspective, even if old Zig still provides the compiler.

## Phase 8: Create WASI SDK Toolchain Wrapper Mode (Partly Landed)

Teach the CoWasm compiler wrapper to use `wasi-sdk` explicitly.

Current selector:

```sh
COWASM_TOOLCHAIN=zig
COWASM_TOOLCHAIN=wasi-sdk
COWASM_TOOLCHAIN=clang
```

Landed actions:

- Kept `zig` mapped to the current 0.10.1 behavior and default.
- Added `wasi-sdk` mode that discovers the pinned SDK tools.
- Added sibling-tool discovery so direct `./bin/cowasm-cc` invocations work
  without putting `bin/` first on `PATH`.
- Used `wasm32-wasip1` for new `wasi-sdk` builds.
- For compile-only C/C++:
  - use `clang -target wasm32-wasip1 -fPIC`;
  - stop injecting emscripten target flags;
  - stop injecting old Zig-specific WASI/musl include paths.
- For CoWasm-style dynamic side modules:
  - start with direct driver linking:
    `clang -target wasm32-wasip1 -fPIC -shared -nostdlib
    -Wl,--allow-undefined -Wl,--no-entry`;
  - add `-fPIC`, `-shared`, `-nostdlib`, `--allow-undefined`, and `--no-entry`
    when needed;
  - remove `-lc`, `-lm`, and `-ldl` from side-module link flags;
  - keep optimized side modules stripped unless debug flags are present.
- Added standalone tiny C and C++ program support.
- Added `cowasm-ar` and `cowasm-ranlib` selection for `zig`, `clang`, and
  `wasi-sdk`.
- Added smoke coverage for wrapper C/C++ standalone builds, C side modules,
  C++ side modules, side-module library-flag filtering, and archive wrapper
  selection.

Remaining actions:

- Keep an explicit two-step `clang -c` plus `wasm-ld` path available for cases
  where the driver hides too much.
- Preserve `--experimental-pic` behavior where direct `wasm-ld` needs it.
- Preserve `-fvisibility-main` behavior or replace it with a cleaner export
  mechanism only after tests prove parity.
- Expand beyond tiny wrapper smokes now that Phase 9 has unblocked
  `core/dylink` main-module linking.

Deliverable: `COWASM_TOOLCHAIN=wasi-sdk cowasm-cc` builds tiny dylink modules
matching the current loader's expectations.

## Phase 9: Rebuild Dylink Runtime Archives As PIC (Landed)

The side-module probe works, but the main-module migration exposed a real
runtime archive issue.

Attempting to rebuild `core/dylink/test/wasi/app.wasm` with `wasi-sdk` failed
because the existing `core/dylink/dist/wasm/libdylink.a` contains non-PIC
relocations such as:

```text
R_WASM_MEMORY_ADDR_LEB
R_WASM_MEMORY_ADDR_SLEB
```

A follow-up manual run narrowed this further:

- passing `-fPIC` to the current Zig 0.10.1 `zig cc` compile of
  `dist/wasm-export/libc.c` still produced the same absolute memory
  relocations;
- compiling that generated file directly with `wasi-sdk` did not get to the
  relocation check because CoWasm's generated libc export source still includes
  Zig/musl-oriented headers through `posix-wasm.h`, starting with
  `sys/wait.h`, which is not provided by the `wasi-sdk` wasip1 sysroot.

Landed actions:

- Identified that the baseline archive is produced from
  `dist/wasm-export/libc.c` in `core/dylink/Makefile` and intentionally copied
  as a single object file to keep the export thunks live.
- Kept that old Zig-built `dist/wasm/libdylink.a` as the baseline.
- Added a `wasi-sdk`-specific generated export source,
  `dist/wasm-export/libc-wasi-sdk.c`, that uses explicit declarations instead
  of the Zig/musl-oriented header list.
- Added `dist/wasm/libdylink-wasi-sdk.a`, compiled with pinned
  `wasi-sdk-clang-next -target wasm32-wasip1 -fPIC`.
- Added an object-shape guard that rejects `R_WASM_MEMORY_ADDR*` relocations in
  the `wasi-sdk` runtime export object.
- Updated `core/dylink/test/wasi` so the archive-backed `wasi-sdk` main module
  links against `libdylink-wasi-sdk.a`.
- Kept ABI checks for imports, exports, accidental `needed_dynlibs`, and loader
  behavior.

Deliverable: CoWasm's dylink runtime archive can participate in a
`wasi-sdk`-built main-module test.

## Phase 10: Focused Dylink Compatibility Tests (Landed)

Before touching packages, expand the small dynamic-linking tests.

Landed and existing test cases:

- exported function with no globals;
- exported function with mutable global data;
- data relocation via `__memory_base`;
- function-pointer export and `dlsym`;
- undefined function resolved from the main module;
- undefined data symbol resolved from the main module;
- calls into libc-like symbols supplied by the main runtime, such as `printf`,
  `malloc`, and `free`;
- optional `__wasm_apply_data_relocs` and `__wasm_call_ctors` behavior;
- repeated `dlopen` and `dlsym`;
- a tiny C++ shared module that exercises `std::string`.

Expected object shape:

- first custom section is `dylink.0`;
- memory/table sizes parse with `core/dylink/src/metadata.ts`;
- imports use `env.memory`, `env.__memory_base`, `env.__table_base`, and
  `env.__indirect_function_table` as applicable;
- GOT imports for unresolved data/function symbols are understood by
  `core/dylink`;
- no accidental `needed_dynlibs` are emitted in CoWasm-style side modules
  unless the test explicitly covers loading SDK shared runtimes.

Deliverable: `core/dylink` tests pass with `wasi-sdk`-built side modules and a
`wasi-sdk`-built main-module path.

## Phase 11: Port Simple Packages (Probe Targets Landed)

Start with packages that have small build systems and clear smoke tests.

Suggested order:

1. `core/zlib` (probe target landed)
2. `core/bzip2` (probe target landed)
3. `core/termcap` (probe target landed)
4. `sagemath/gmp` (probe target landed)
5. `core/sqlite` (probe target landed)
6. `core/lua` (probe target landed)

For each package:

- add a `test-wasi-sdk` or backend-selectable test target;
- compare `wasm-objdump -x` for important imports/exports;
- run the existing package smoke test;
- record artifact size differences;
- keep the old Zig target green.

Deliverable: a first dependency layer builds and tests with `wasi-sdk`.

## Phase 12: Port Runtime-Adjacent Packages (Probe Targets Landed)

Move to packages that stress headers, termios, filesystem behavior, and
dynamic-linking details.

Suggested order:

1. `core/libedit` (probe target landed)
2. `core/ncurses` (probe target landed)
3. `core/less` (probe target landed)
4. `core/tar` (probe target landed)
5. `core/openssl` (probe target landed)
6. `core/libgit2` (probe target landed)

Validation:

- run package tests;
- run direct clang/lld smokes where they exist;
- run relevant `core/dash-wasm` or terminal integration smoke tests;
- inspect unresolved symbols to ensure loader resolution is intentional.

Deliverable: terminal/runtime package layer works with `wasi-sdk`.

## Phase 13: C++ Runtime And Python Extension Surface (Probe Targets Landed)

Do not attempt CPython before C++ runtime behavior is clear.

Actions:

- For now, keep CoWasm side modules resolving C/C++ runtime symbols from the
  main module and statically linked SDK archives. Do not introduce
  `wasi-sdk` `libc++.so` / `libc++abi.so` dependencies until there is a clear
  loader contract for transitive dynamic libraries.
- Validate:
  - C++ shared module with `std::string` (probe target landed);
  - pointer-safe RTTI (probe target landed);
  - exceptions only if a real package requires them;
  - repeated dlopen of a C++ side module (probe target landed);
  - coexistence with C modules (probe target landed).
- Build one simple Python-extension-shaped module with `wasi-sdk` (probe target
  landed).
- Build one Cython-generated extension module (probe target landed).

Deliverable: C++ and Python-extension dynamic module rules are explicit and
tested under `wasi-sdk`.

## Phase 14: CPython

Only after the prior phases are green:

- configure `python/cpython` with `wasi-sdk` (probe target landed);
- build `python/cpython`'s static archive with `wasi-sdk` (probe target landed);
- link `python/cpython` with `wasi-sdk` (probe target landed);
- install `python/cpython` with `wasi-sdk` (artifact install target landed);
- run `make -C python/cpython pip`;
- run `make -C python/cpython test-runtime-contracts`;
- run the supported CPython test suite;
- inspect failures before broad package work.

Pay special attention to:

- subprocess/spawn contracts;
- filesystem semantics;
- temporary files;
- signal shims;
- dynamic extension imports;
- object and archive tool behavior;
- configure-script differences caused by newer wasi-libc headers.

Landed configure and core-compile probe details:

- `make -C python/cpython test-wasi-sdk-next`;
- side-by-side `python/cpython/build/wasi-sdk` and
  `python/cpython/dist/wasi-sdk` paths;
- `wasi-sdk` wrapper support for legacy `--experimental-pic` in CPython's
  `BLDSHARED`;
- CPython `wasm32-wasip1`/`wasm32-wasi` multiarch alias patch;
- SDK `posix-wasm` `netdb.h` shim fix for direct configure header checks;
- config-site socket contract update for runtime-resolved `getaddrinfo`;
- `dylink-libpython --without-emscripten-signal --without-fork` for the SDK
  generated export source;
- CoWasm `src/pyconfig.h` overlay appended after SDK configure;
- `Programs/python.o`, parser, object runtime, Python core, bootstrap module,
  and `_posixsubprocess` object compile coverage under
  `COWASM_TOOLCHAIN=wasi-sdk`;
- SDK socket/name-service compatibility declarations for `_socket`, including
  POSIX-shaped socket prototypes, address-info flags, `struct servent`,
  `h_errno`, host/service lookup prototypes, and an `addrinfo` forward
  declaration that avoids conflicting with CPython's fallback struct body;
- SDK terminal-size compatibility via `struct winsize` in the generated
  `termios.h` shim;
- full `libpython3.14.a` archive compile coverage under
  `COWASM_TOOLCHAIN=wasi-sdk`.
- C wrapper link coverage for `build/wasi-sdk/python-wasi-sdk.wasm`, including
  the CoWasm runtime exports used by `python/python-wasm`, the
  `__wasm_call_ctors` relocation hook, and the expected TypeScript runtime
  imports.
- SDK artifact install coverage via `make -C python/cpython wasi-sdk-cpython`.
- runnable wrapper target via `make -C python/cpython python-wasi-sdk`.

Current runtime status:

- the original main-runtime `free` trap is avoided by giving side modules an
  `env.__memory_size` import and guarding the SDK wrapper's allocator
  forwarding to pointers outside the side module's static memory range;
- the SDK wrapper keeps CPython's pthread calls inside the SDK side module
  through local single-thread pthread stubs, avoiding the previous
  wasi-sdk/CoWasm pthread ABI mismatch;
- `./bin/python-wasi-sdk -S --version`,
  `./bin/python-wasi-sdk -S -c 'pass'`, and
  `./bin/python-wasi-sdk -S -c 'print(1)'` all start successfully;
- `make -C python/cpython test-wasi-sdk-runtime-contracts` passes the focused
  runtime contract suite;
- `make -C python/cpython test-wasi-sdk-imports` passes the first pure-stdlib
  and sysconfig import smoke.

Remaining Phase 14 work:

- expand SDK CPython shared-extension install/import coverage beyond `_json`
  and `zlib` to the remaining dependency-backed extensions;
- add SDK pip/ensurepip behavior after dependency-backed extension imports are
  proven;
- only then expand toward the supported CPython test suite.

Deliverable: CPython's supported CoWasm suite passes with `wasi-sdk`.

## Phase 15: Sage-Relevant Math Packages

After CPython and basic extension behavior:

1. `sagemath/gmp`
2. `sagemath/pari`
3. high-value Sagelite dependencies selected by mathematical payoff

Each package should have mathematical smoke tests, not just build tests.

Deliverable: one Sage-relevant math dependency layer works with `wasi-sdk` and
keeps the long-term SageMath-in-WebAssembly direction viable.

## Phase 16: Flip The Default

Only flip default wrapper behavior after parity.

Minimum gate:

- `core/build test`
- `core/kernel test`
- `core/posix-node` native addon smoke tests
- `core/dylink` focused tests
- `core/zlib test`
- `python/cpython pip`
- `python/cpython test-runtime-contracts`
- `python/cpython test`
- `sagemath/gmp test`
- `sagemath/pari test`

Recommended gate:

- selected runtime-adjacent package tests;
- selected C++ shared module tests;
- artifact-size comparison reviewed;
- documentation updated;
- old Zig fallback retained for one transition window.

Deliverable: `wasi-sdk` becomes the default pinned toolchain provider.

## Phase 17: Retire Old Zig Path

After the `wasi-sdk` path has been default for long enough to shake out
regressions:

- remove the Zig 0.10.1 bootstrap;
- remove `01-emscripten.patch`;
- simplify wrapper documentation;
- delete stale comments that refer to old Zig limitations;
- keep modern Zig and direct LLVM/lld smoke tests only if they provide useful
  comparison coverage.

Deliverable: CoWasm has a `wasi-sdk` toolchain and no CoWasm-owned Zig
implementation code.

## Pros

- Uses the canonical WASI C/C++ SDK instead of Zig as an indirect Clang
  distribution.
- Avoids spending effort porting 0.10-era Zig code to modern Zig syntax.
- Makes future toolchain upgrades normal `wasi-sdk` upgrades.
- Keeps CoWasm's runtime glue in the language that matches its ABI surface.
- Exposes the real WASI/dylink linker contract directly.
- `clang -shared` accepts `--allow-undefined`, unlike modern `zig cc` in the
  tested configuration.
- Provides richer target-specific sysroots than relying on Zig's driver
  behavior.
- Lowers contributor friction; more people can review C POSIX/N-API glue than
  Zig-specific glue.

## Cons

- The SDK tarball and unpacked tree are larger than Zig.
- C loses Zig conveniences such as `defer`, `try`, checked casts, `@cImport`,
  and comptime constants.
- Raw N-API C code is verbose without a careful helper layer.
- Constants generation becomes an explicit build artifact instead of a Zig
  comptime convenience.
- The translation will temporarily increase churn in sensitive runtime code.
- Side modules must avoid accidental `needed_dynlibs` until CoWasm deliberately
  supports SDK shared runtime loading.
- Runtime archives such as `libdylink` need PIC-aware rebuild work.

## Resolved Decisions

- First pinned SDK: `wasi-sdk-33.0`.
- Backend selector: keep both `COWASM_TOOLCHAIN=wasi-sdk` for the pinned SDK
  path and `COWASM_TOOLCHAIN=clang` for direct local LLVM/lld probes.
- Modern Zig is not a first-class wrapper selector in the current plan. Keep it
  as an external comparison path unless a concrete need appears.

## Open Questions

- Should `zig_cowasm_compiler.py` be renamed once Zig is no longer the primary
  provider? (yes)
- Should CoWasm side modules always use `-nostdlib`, or should some package
  classes eventually load SDK shared libraries?
- How much of the `wasi-sdk` dylink archive path should replace the old
  Zig-built archive versus remain a side-by-side probe until broader package
  tests pass?
- Does `wasi-sdk`'s libc++ reduce or replace the special handling in
  `core/libcxx`?
- Do `wasi-sdk` shared modules preserve all loader assumptions around GOT data
  symbols, function-table symbols, and weak imports?
- What is the artifact-size impact for real packages at `-Oz` plus stripping?
- How much macOS-specific behavior exists in the native POSIX addon that Linux
  tests will not catch?
- When, if ever, should CoWasm start investigating `wasm32-wasip2` component
  artifacts?

## Risks

- Translating the native addon can accidentally change errno, exception, or
  cleanup behavior.
- Socket address packing and termios behavior are easy to get subtly wrong.
- `fork_exec` has enough file descriptor and process-state complexity that it
  deserves isolated tests before replacement.
- Package configure scripts may detect different features with newer wasi-libc
  headers and change behavior.
- Modern LLVM may expose latent undefined behavior in old C packages.
- Safari and browser runtime constraints still dominate deployment decisions;
  a better compiler does not solve every WebAssembly runtime limit.
- Flipping the default too early could break CPython or Sagelite-facing work.

## Success Criteria

The modernization is successful when:

- CoWasm core runtime builds do not depend on CoWasm-owned Zig source files.
- CoWasm builds from a pinned `wasi-sdk` without local Zig stdlib patches.
- Dynamic side modules use `wasm32-wasip1 -fPIC -shared` with an explicit
  CoWasm-compatible dynamic-linking contract.
- `cowasm-cc` and `cowasm-c++` are simpler and more explicit.
- Core dylink tests pass with `wasi-sdk`-built side modules and main modules.
- Native POSIX addon tests pass through the C implementation.
- CPython's supported suite passes.
- GMP and PARI pass.
- Modern Zig and direct LLVM/lld probes remain optional comparison paths, not
  required foundations.

The desired end state is a pinned `wasi-sdk` CoWasm toolchain with C runtime
glue and a visible, testable WASI/dylink contract.
