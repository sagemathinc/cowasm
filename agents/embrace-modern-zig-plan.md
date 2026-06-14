# Embrace Modern Zig As A Toolchain Plan

## Goal

Move CoWasm toward a modern pinned Zig distribution for LLVM/Clang/lld/WASI
toolchain delivery, while removing CoWasm's own Zig implementation code.

The strategy is not "write more Zig" and it is not "depend on whatever Zig is
installed system-wide." The target is:

```text
Zig distribution: yes, pinned and hermetic
Zig implementation language in CoWasm: no, translate to C
WASI/dylink ABI contract: explicit, tested, and also auditable through clang/lld
```

This keeps the practical value of Zig's bundled compiler stack without making
CoWasm depend on Zig language churn for its runtime glue.

## Strategic Decision

Use modern Zig primarily as the easy-to-distribute source of:

- Clang;
- lld / `wasm-ld`;
- WASI libc headers and libraries;
- C/C++ cross-compilation defaults;
- consistent host binaries across Linux and macOS.

Do not preserve or expand CoWasm's Zig source layer. The roughly 4k lines of
Zig in `core/kernel/src` and `core/posix-node/src` are mostly C ABI glue,
POSIX shims, N-API wrappers, constants, and syscall-style adapters. They are
good candidates for C because their primary job is to expose stable C-shaped
interfaces, not to use Zig-specific abstractions.

## Order Of Work

Do a small modern-Zig probe first, but translate the CoWasm Zig source to C
before flipping the default compiler path.

Recommended order:

1. Preserve the current Zig 0.10.1 baseline.
2. Add a side-by-side modern Zig install as `zig-next` and probe C/C++ dylink
   behavior only.
3. Translate CoWasm's own Zig runtime glue to C while the known-good baseline
   remains available.
4. Remove `zig build-lib` and `.zig` source dependencies from core runtime
   builds.
5. Move `cowasm-cc` / `cowasm-c++` to a modern-Zig-backed C/C++ toolchain path.
6. Port packages in dependency order.
7. Flip the default only after core, CPython, and Sage-relevant tests pass.

This order avoids porting old Zig syntax to new Zig syntax just to delete it
later. The early `zig-next` probe is still important because it tells us what
C flags, linker flags, object shapes, and WASI assumptions the C translation
should target.

## Current Baseline

- CoWasm currently installs Zig 0.10.1 via `core/build/src/zig/Makefile`.
- `bin/zig` is the default compiler provider for package builds.
- `cowasm-cc` and `cowasm-c++` are Python wrappers around Zig plus manual
  `zig wasm-ld` linking.
- The wrapper currently compiles dynamic modules through
  `wasm32-emscripten -fPIC` plus manually supplied WASI/musl include paths.
- CoWasm carries a local patch, `01-emscripten.patch`, that teaches old Zig's
  standard library to treat emscripten similarly to WASI in a few places.
- CoWasm has 35 Zig files and 4086 lines of Zig source in:
  - `core/kernel/src`;
  - `core/posix-node/src`.
- The main Zig build entry points are:
  - `core/kernel/Makefile`, which builds `src/kernel/interface.zig`;
  - `core/posix-node/Makefile`, which builds `src/lib.zig`;
  - `core/build/src/zig/bin/zig_cowasm_compiler.py`, which still accepts `.zig`
    sources.

## Key Modern-Zig Finding

Zig 0.16.0 materially changes the toolchain tradeoff.

Local probes with the stable 0.16.0 binary showed that this works:

```sh
zig cc -target wasm32-wasi -Oz -fPIC -shared add.c -o add.wasm
```

The output is a real `dylink.0` WebAssembly shared module importing the dynamic
linking state CoWasm expects:

- `env.memory`;
- `env.__memory_base`;
- `env.__table_base`;
- `env.__stack_pointer`, when stack is needed;
- `env.__indirect_function_table`, when table is needed.

With `-nostdlib`, a trivial exported function compiled to a tiny dylink module
instead of requiring the older emscripten-target workaround.

A more realistic test also passed: the existing `core/dylink/test/wasi` shared
library was compiled with Zig 0.16.0 and linked with:

```sh
zig cc -target wasm32-wasi -Oz -fPIC -c dynamic-library.c -o dynamic.o
zig wasm-ld --experimental-pic -shared --allow-undefined \
  -o dynamic-library.so dynamic.o
```

The resulting `.so` passed CoWasm's existing dlopen test, including function
exports, function-pointer lookup, main-module symbol resolution, `malloc`,
`free`, `printf`, and shared pointer identity for `_Py_NoneStruct`.

The remaining catch is important: modern `zig cc -shared` currently rejects
some unresolved-symbol linker flags that CoWasm needs:

```text
error: unsupported linker arg: --allow-undefined
```

So modern Zig can simplify the compile step, but the CoWasm wrapper should
continue to own the final `zig wasm-ld` step for dynamic modules that
intentionally resolve symbols at load time.

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
- C keeps the direct clang/lld fallback straightforward;
- C makes Zig's role visibly limited to compiler distribution.

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
- Keep helper functions boring and local. The point is to reduce repeated N-API
  boilerplate without inventing a framework.
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
C translation and modern toolchain must preserve.

## Phase 1: Add Side-By-Side Modern Zig Probe

Add modern Zig without changing the default build.

Actions:

- Add `make -C core/build zig-next`.
- Install stable Zig 0.16.x or a deliberately chosen newer stable release into
  a separate directory, such as `core/build/build/zig-next/dist/native`.
- Symlink it as `bin/zig-next`, not `bin/zig`.
- Add checksum validation for Linux x86_64 first, then Linux aarch64, macOS
  x86_64, and macOS aarch64.
- Add a minimal `make -C core/build test-zig-next` target:
  - `bin/zig-next version`;
  - `bin/zig-next env`;
  - `bin/zig-next cc -target wasm32-wasi hello.c`;
  - `bin/zig-next cc -target wasm32-wasi -Oz -fPIC -shared add.c`;
  - `bin/zig-next wasm-ld --version`.

Non-goals in this phase:

- do not point `bin/zig` at the new version;
- do not port `.zig` source to modern syntax;
- do not change package builds;
- do not remove the old emscripten workaround yet.

Deliverable: modern Zig is available as a C/C++ toolchain probe, not as the
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
- Keep `bin/zig` as the old compiler distribution until the modern toolchain
  migration is ready.

Deliverable: CoWasm core runtime is C/C++/TypeScript from the implementation
language perspective, even if old Zig still provides the compiler.

## Phase 8: Create Modern-Zig Toolchain Wrapper Mode

Teach the CoWasm compiler wrapper to use modern Zig explicitly.

Possible selector:

```sh
COWASM_TOOLCHAIN=zig
COWASM_TOOLCHAIN=zig-next
COWASM_TOOLCHAIN=clang
```

Actions:

- Keep `zig` mapped to the current 0.10.1 behavior.
- Add `zig-next` mode that discovers `bin/zig-next`.
- For compile-only C/C++:
  - use `zig-next cc -target wasm32-wasi -fPIC`;
  - stop injecting emscripten target flags;
  - stop injecting old Zig-specific WASI/musl include paths unless tests prove
    they are still needed.
- For dynamic module linking:
  - compile sources to objects with `zig-next cc -target wasm32-wasi -fPIC`;
  - link with `zig-next wasm-ld --experimental-pic -shared`;
  - keep `--allow-undefined` when unresolved dynamic symbols are expected;
  - keep current strip/debug behavior until artifact comparisons say otherwise.
- Preserve `-fvisibility-main` behavior or replace it with a cleaner export
  mechanism only after tests prove parity.

Deliverable: `COWASM_TOOLCHAIN=zig-next cowasm-cc` builds tiny dylink modules
matching the current loader's expectations.

## Phase 9: Focused Dylink Compatibility Tests

Before touching packages, expand the small dynamic-linking tests.

Test cases:

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
  `core/dylink`.

Deliverable: `core/dylink` tests pass with modern-Zig-built side modules.

## Phase 10: Port Simple Packages

Start with packages that have small build systems and clear smoke tests.

Suggested order:

1. `core/zlib`
2. `core/bzip2`
3. `core/termcap`
4. `sagemath/gmp`
5. `core/sqlite`
6. `core/lua`

For each package:

- add a `test-zig-next` or backend-selectable test target;
- compare `wasm-objdump -x` for important imports/exports;
- run the existing package smoke test;
- record artifact size differences;
- keep the old Zig target green.

Deliverable: a first dependency layer builds and tests with modern Zig.

## Phase 11: Port Runtime-Adjacent Packages

Move to packages that stress headers, termios, filesystem behavior, and
dynamic-linking details.

Suggested order:

1. `core/libedit`
2. `core/ncurses`
3. `core/less`
4. `core/tar`
5. `core/openssl`
6. `core/libgit2`

Validation:

- run package tests;
- run clang standalone smokes where they exist;
- run relevant `core/dash-wasm` or terminal integration smoke tests;
- inspect unresolved symbols to ensure loader resolution is intentional.

Deliverable: terminal/runtime package layer works with modern Zig.

## Phase 12: C++ Runtime And Python Extension Surface

Do not attempt CPython before C++ runtime behavior is clear.

Actions:

- Rebuild `core/libcxx` or define a modern-Zig replacement strategy.
- Validate:
  - C++ shared module with `std::string`;
  - RTTI if needed;
  - exceptions if needed;
  - repeated dlopen;
  - coexistence with C modules.
- Build one simple Python extension module with modern Zig.
- Build one Cython-generated extension module.

Deliverable: C++ and Python-extension dynamic module rules are explicit and
tested under modern Zig.

## Phase 13: CPython

Only after the prior phases are green:

- build `python/cpython` with modern Zig;
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
- object and archive tool behavior.

Deliverable: CPython's supported CoWasm suite passes with modern Zig.

## Phase 14: Sage-Relevant Math Packages

After CPython and basic extension behavior:

1. `sagemath/gmp`
2. `sagemath/pari`
3. high-value Sagelite dependencies selected by mathematical payoff

Each package should have mathematical smoke tests, not just build tests.

Deliverable: one Sage-relevant math dependency layer works with modern Zig and
keeps the long-term SageMath-in-WebAssembly direction viable.

## Phase 15: Flip The Default

Only flip `bin/zig` or default wrapper behavior after parity.

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

Deliverable: modern Zig becomes the default pinned toolchain distribution.

## Phase 16: Retire Old Zig Path

After the modern Zig path has been default for long enough to shake out
regressions:

- remove the Zig 0.10.1 bootstrap;
- remove `01-emscripten.patch` if no longer used;
- simplify wrapper documentation;
- delete stale comments that refer to old Zig limitations;
- keep direct clang/lld smoke tests as ABI documentation, not as the primary
  build path.

Deliverable: CoWasm has a modern Zig-distributed toolchain and no CoWasm-owned
Zig implementation code.

## Pros

- Avoids spending effort porting 0.10-era Zig code to modern Zig syntax.
- Makes future Zig upgrades mostly toolchain upgrades, not source-language
  upgrades.
- Keeps CoWasm's runtime glue in the language that matches its ABI surface.
- Makes a direct clang/lld fallback more realistic because the source is C.
- Lowers contributor friction; more people can review C POSIX/N-API glue than
  Zig-specific glue.
- Preserves the main thing Zig is very good at here: convenient hermetic
  compiler distribution.
- Reduces local Zig patch pressure over time.

## Cons

- C loses Zig conveniences such as `defer`, `try`, checked casts, `@cImport`,
  and comptime constants.
- Raw N-API C code is verbose without a careful helper layer.
- Constants generation becomes an explicit build artifact instead of a Zig
  comptime convenience.
- The translation will temporarily increase churn in sensitive runtime code.
- Process, socket, and terminal behavior can regress if tests do not cover
  both success and failure paths.
- The final toolchain still depends on Zig release quality and Zig's bundled
  LLVM/lld choices, even if CoWasm no longer contains Zig source.

## Effort Estimate

This is not a huge source tree, but it touches runtime boundaries where small
mistakes matter.

Rough implementation scale:

- wasm kernel C translation: 3-6 focused commits;
- constants replacement: 1-3 focused commits;
- native N-API helper layer: 2-4 focused commits;
- native POSIX module translation: 8-15 focused commits;
- build-system cleanup: 2-4 focused commits;
- modern-Zig wrapper path: 3-6 focused commits;
- package migration and parity work: open-ended, likely many package-specific
  commits.

The first major milestone should be "no CoWasm-owned Zig source in core
runtime builds." The second major milestone should be "modern Zig is the
default compiler distribution."

## Open Questions

- Which stable Zig version should be the first modern toolchain target:
  0.16.x or the next stable after 0.16?
- Should `zig-next` be exposed through `COWASM_TOOLCHAIN=zig-next`, a separate
  `COWASM_ZIG` override, or both?
- Should `zig_cowasm_compiler.py` continue to support `.zig` inputs after
  CoWasm stops using Zig source internally?
- Can Zig upstream be changed to allow forwarding `--allow-undefined` through
  `zig cc -shared` for wasm?
- Does modern Zig's WASI libc provide enough missing libc fragments to delete
  some copied files in `core/posix-wasm/src/lib`?
- Does modern Zig's C++ support reduce the special handling in `core/libcxx`?
- Do modern shared modules preserve all loader assumptions around GOT data
  symbols, function-table symbols, and weak imports?
- What is the artifact-size impact for real packages at `-Oz`?
- Does modern Zig make wasm64 a realistic later branch for memory-heavy math?
- How much macOS-specific behavior exists in the native POSIX addon that Linux
  tests will not catch?

## Risks

- Translating the native addon can accidentally change errno, exception, or
  cleanup behavior.
- Socket address packing and termios behavior are easy to get subtly wrong.
- `fork_exec` has enough file descriptor and process-state complexity that it
  deserves isolated tests before replacement.
- Package configure scripts may detect different features with newer libc
  headers and change behavior.
- Modern LLVM may expose latent undefined behavior in old C packages.
- Safari and browser runtime constraints still dominate deployment decisions;
  a better compiler does not solve every WebAssembly runtime limit.
- Flipping the default too early could break CPython or Sagelite-facing work.

## Success Criteria

The modernization is successful when:

- CoWasm core runtime builds do not depend on CoWasm-owned Zig source files.
- CoWasm builds from a pinned modern Zig distribution without local Zig stdlib
  patches.
- Dynamic modules use `wasm32-wasi -fPIC -shared` rather than the old
  emscripten-target workaround.
- `cowasm-cc` and `cowasm-c++` are simpler and more explicit.
- Core dylink tests pass with modern-Zig-built side modules.
- Native POSIX addon tests pass through the C implementation.
- CPython's supported suite passes.
- GMP and PARI pass.
- The direct clang/lld smoke tests still pass, documenting the ABI contract.

The desired end state is not blind dependence on Zig. It is a modern,
hermetic Zig-distributed CoWasm toolchain with C runtime glue and a visible,
testable WASI/dylink contract.
