# Embrace Modern Zig Plan

## Goal

Move CoWasm from the old pinned Zig 0.10.1 baseline to a modern pinned Zig
toolchain, while keeping the current known-good build green and preserving an
explicit clang/lld audit path.

The target is not "depend on whatever Zig is installed system-wide." The target
is a newer hermetic Zig baseline that provides modern LLVM/Clang/lld, better
WASI/WebAssembly support, fewer CoWasm-specific toolchain hacks, and a clearer
route toward serious browser-native Python and mathematics.

## Current Baseline

- CoWasm currently installs Zig 0.10.1 via `core/build/src/zig/Makefile`.
- `bin/zig` is the default compiler provider for package builds.
- `cowasm-cc` and `cowasm-c++` are Python wrappers around Zig plus manual
  `zig wasm-ld` linking.
- The wrapper currently compiles dynamic modules through
  `wasm32-emscripten -fPIC` plus manually supplied WASI/musl include paths.
- CoWasm carries a local patch, `01-emscripten.patch`, that teaches old Zig's
  standard library to treat emscripten similarly to WASI in a few places.
- CoWasm has roughly 4k lines of Zig source in `core/kernel/src` and
  `core/posix-node/src`; these use 0.10-era Zig syntax and command-line
  assumptions.

## Key Finding

Zig 0.16.0 materially changes the tradeoff.

Local probes with the stable 0.16.0 binary showed that this works:

```sh
zig cc -target wasm32-wasi -Oz -fPIC -shared add.c -o add.wasm
```

The output is a real `dylink.0` WebAssembly shared module importing the dynamic
linking state CoWasm expects:

- `env.memory`
- `env.__memory_base`
- `env.__table_base`
- `env.__stack_pointer`, when stack is needed
- `env.__indirect_function_table`, when table is needed

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

So modern Zig can eliminate much of the old wrapper logic, but the wrapper still
needs to own the final `zig wasm-ld` step for CoWasm-style dynamic modules that
intentionally resolve symbols at load time.

## Strategy

Make modern Zig the next primary path, but do it as a parallel, gated migration.
Do not replace `bin/zig` in one broad commit.

The working posture should be:

```text
current default: pinned Zig 0.10.1
next path:       pinned modern Zig, initially exposed as zig-next
audit path:      direct clang/lld smoke tests
future default:  modern pinned Zig after parity
```

This gives CoWasm the practical benefits of Zig's bundled LLVM/WASI tooling
without hiding the ABI contract or losing the ability to pivot to direct
clang/lld later.

## Principles

- Preserve Zig 0.10.1 as the known-good baseline until modern Zig passes the
  same package and runtime checks.
- Treat modern Zig as a toolchain distribution plus Zig compiler, not as an
  excuse to hide ABI details.
- Prefer `wasm32-wasi -fPIC -shared` over the old `wasm32-emscripten` dynamic
  module workaround.
- Keep the final linker step explicit where CoWasm needs `--allow-undefined`,
  `--experimental-pic`, custom exports, or loader-specific semantics.
- Migrate dependency layers in increasing order of complexity.
- Keep clang standalone smoke tests because they document the actual ABI
  contract and provide leverage if Zig regresses.
- Do not start with CPython, NumPy, Matplotlib, or SageMath; use small C and
  C++ dynamic-linking tests first.

## Phase 0: Freeze The Baseline

Before introducing modern Zig, capture the current build contract and test
state.

Actions:

- Record `bin/zig version` and `bin/zig env`.
- Record the current `cowasm-cc -cowasm-verbose` output for:
  - a trivial C shared module;
  - a module with global data;
  - a module with unresolved symbols resolved by the loader;
  - a small C++ module.
- Save `wasm-objdump -x` summaries for those outputs.
- Keep the existing scheduled baseline green:
  - `make -C core/build test`;
  - `make -C core/kernel test`;
  - `make -C core/zlib test`;
  - `make -C python/cpython test-runtime-contracts`;
  - `make -C python/cpython test`;
  - `make -C sagemath/gmp test`;
  - `make -C sagemath/pari test`.

Deliverable: a repeatable baseline log directory or doc section that captures
the Zig 0.10.1 behavior being replaced.

## Phase 1: Add A Side-By-Side Modern Zig Bootstrap

Add a new bootstrap target without disturbing `bin/zig`.

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

Deliverable: modern Zig can be installed and probed without changing any
package builds.

## Phase 2: Create A Modern Zig Wrapper Mode

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

## Phase 3: Focused Dylink Compatibility Tests

Before touching packages, expand the small dynamic-linking tests.

Test cases:

- Exported function with no globals.
- Exported function with mutable global data.
- Data relocation via `__memory_base`.
- Function-pointer export and `dlsym`.
- Undefined function resolved from the main module.
- Undefined data symbol resolved from the main module.
- Calls into libc-like symbols supplied by the main runtime, such as `printf`,
  `malloc`, and `free`.
- Optional `__wasm_apply_data_relocs` and `__wasm_call_ctors` behavior.
- Repeated `dlopen` and `dlsym`.
- A tiny C++ shared module that exercises `std::string`.

Expected object shape:

- first custom section is `dylink.0`;
- memory/table sizes parse with `core/dylink/src/metadata.ts`;
- imports use `env.memory`, `env.__memory_base`, `env.__table_base`, and
  `env.__indirect_function_table` as applicable;
- GOT imports for unresolved data/function symbols are understood by
  `core/dylink`.

Deliverable: `core/dylink` tests pass with modern-Zig-built side modules.

## Phase 4: Port CoWasm Zig Source To Modern Syntax

Modernizing package C builds is not enough; CoWasm also contains Zig source.

Likely updates:

- Replace old builtin forms such as:
  - `@ptrCast(T, value)`;
  - `@intCast(T, value)`;
  - `@bitCast(T, value)`;
  - `@intToPtr`;
  - `@ptrToInt`.
- Replace deprecated stdlib APIs such as `std.mem.copy`.
- Update alignment handling around `@alignCast`.
- Replace `--main-pkg-path` command-line usage.
- Evaluate whether `zig build-lib` invocations should become real `build.zig`
  files.

Candidate order:

1. `core/kernel/src/wasm/posix` unit tests.
2. `core/kernel` wasm library build.
3. `core/posix-node` native Node module build.
4. TypeScript bindings generated from Zig constants.

Deliverable: core Zig code compiles and tests with `bin/zig-next`, while
`bin/zig` remains untouched.

## Phase 5: Remove The Old Emscripten Workaround From The Next Path

Once the modern-Zig wrapper works for tiny dynamic modules, isolate or remove
the old emscripten-specific logic from the `zig-next` path.

Actions:

- Stop applying `01-emscripten.patch` to modern Zig.
- Stop selecting `wasm32-emscripten` for dynamic CoWasm modules in `zig-next`
  mode.
- Stop adding emscripten libc++ include paths by default.
- Use `wasm32-wasi -fPIC -shared` as the standard modern dynamic-module target.
- Keep compatibility shims only where package tests require them.

Deliverable: `zig-next` dynamic modules build as WASI dylink modules, not as
emscripten-target modules with WASI defines layered on top.

## Phase 6: Port Simple Packages

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

## Phase 7: Port Runtime-Adjacent Packages

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

## Phase 8: C++ Runtime And Python Extension Surface

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

## Phase 9: CPython

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

## Phase 10: Sage-Relevant Math Packages

After CPython and basic extension behavior:

1. `sagemath/gmp`
2. `sagemath/pari`
3. high-value Sagelite dependencies selected by mathematical payoff

Each package should have mathematical smoke tests, not just build tests.

Deliverable: one Sage-relevant math dependency layer works with modern Zig and
keeps the long-term SageMath-in-WebAssembly direction viable.

## Phase 11: Flip The Default

Only flip `bin/zig` or default wrapper behavior after parity.

Minimum gate:

- `core/build test`
- `core/kernel test`
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

Deliverable: modern Zig becomes the default pinned toolchain.

## Phase 12: Retire Old Zig Path

After the modern Zig path has been default for long enough to shake out
regressions:

- remove the Zig 0.10.1 bootstrap;
- remove `01-emscripten.patch` if no longer used;
- simplify wrapper documentation;
- delete stale comments that refer to old Zig limitations;
- keep direct clang/lld smoke tests as ABI documentation, not as the primary
  build path.

Deliverable: CoWasm has a modern Zig baseline and a smaller, clearer wrapper.

## Open Questions

- Which stable Zig version should be the first target: 0.16.x or the next
  stable after 0.16?
- Should `zig-next` be exposed through `COWASM_TOOLCHAIN=zig-next`, a separate
  `COWASM_ZIG` override, or both?
- Can Zig upstream be changed to allow forwarding `--allow-undefined` through
  `zig cc -shared` for wasm?
- Does modern Zig's WASI libc provide enough missing libc fragments to delete
  some copied files in `core/posix-wasm/src/lib`?
- Does modern Zig's C++ support reduce the special handling in `core/libcxx`?
- Do modern shared modules preserve all loader assumptions around GOT data
  symbols, function-table symbols, and weak imports?
- What is the artifact-size impact for real packages at `-Oz`?
- Does modern Zig make wasm64 a realistic later branch for memory-heavy math?

## Risks

- Zig language syntax churn may make the 4k-line source port noisy.
- The modern driver may still reject linker flags CoWasm needs, requiring
  wrapper-owned final linking.
- Package configure scripts may detect different features with newer libc
  headers and change behavior.
- Modern LLVM may expose latent undefined behavior in old C packages.
- Safari and browser runtime constraints still dominate deployment decisions;
  a better compiler does not solve every WebAssembly runtime limit.
- Flipping the default too early could break CPython or Sagelite-facing work.

## Success Criteria

The modernization is successful when:

- CoWasm builds from a pinned modern Zig without local Zig stdlib patches.
- Dynamic modules use `wasm32-wasi -fPIC -shared` rather than the old
  emscripten-target workaround.
- `cowasm-cc` and `cowasm-c++` are simpler and more explicit.
- Core dylink tests pass with modern-Zig-built side modules.
- CPython's supported suite passes.
- GMP and PARI pass.
- The direct clang/lld smoke tests still pass, documenting the ABI contract.

The desired end state is not blind dependence on Zig. It is a modern,
hermetic Zig-backed CoWasm toolchain with the real WASI/dylink contract visible
and testable.
