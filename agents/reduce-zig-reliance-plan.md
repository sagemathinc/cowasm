# Iterative Plan To Reduce Zig Reliance

## Strategic Note

This plan captures the original direct clang/lld investigation path. Later
strategic investigations found that both modern Zig and `wasi-sdk` can produce
CoWasm-compatible `wasm32-wasi` / `wasm32-wasip1 -fPIC -shared` dylink side
modules. The `wasi-sdk` result is the better long-term fit because it is the
canonical Clang/lld/wasi-libc distribution and accepts the unresolved-symbol
linker flags CoWasm needs.

The current preferred direction is therefore Zig 0.10.1 to pinned `wasi-sdk`,
with CoWasm-owned Zig implementation code translated to C. This direct
clang/lld plan remains useful as ABI documentation and fallback leverage.

See [`wasi-sdk-modernization-plan.md`](./wasi-sdk-modernization-plan.md) for the
current canonical strategy. The older
[`embrace-modern-zig-plan.md`](./embrace-modern-zig-plan.md) is now a
superseded comparison note.

## Goal

Make CoWasm's toolchain contract explicit enough that Zig becomes an optional backend instead of the conceptual foundation of the build.

The current Zig-based path is valuable because it is the known-good baseline. Do not break it while exploring alternatives. The target is not "rewrite everything in Rust" or "delete Zig immediately"; the target is a reproducible CoWasm WASI/sysroot/dylink contract that can be driven directly by clang/lld and validated package by package.

## Principles

- Keep the pinned Zig path green until a replacement backend passes the same smoke tests.
- Treat `zig cc` as a reference implementation of compiler/linker flags, not as the long-term abstraction.
- Prefer explicit clang/lld commands over hidden wrapper behavior.
- Migrate package classes in increasing order of complexity.
- Do not start with CPython, NumPy, Matplotlib, or SageMath. They exercise too many moving parts at once.
- Use C/C++ for low-level WASI/POSIX/dylink ABI glue unless Rust clearly reduces complexity at a boundary that is not primarily C ABI.

## Phase 0: Document The Current Contract

- Inventory the active tool wrappers:
  - `cowasm-cc`
  - `cowasm-c++`
  - archive tools
  - wasm linker flags
  - sysroot and include paths
  - runtime libraries
- For a few representative packages, record the final compiler and linker invocations:
  - a tiny C package
  - one coreutils binary
  - `dash`
  - one shared library
  - one Python extension module
- Capture which pieces come from Zig:
  - clang
  - wasm-ld/lld
  - libc/sysroot
  - compiler-rt or builtins
  - libc++
  - target defaults

Deliverable: `docs/toolchain-contract.md`. The initial inventory is recorded in
[`docs/toolchain-contract.md`](../docs/toolchain-contract.md).

## Phase 1: Add A Backend Selector

Add an explicit backend switch to the CoWasm wrapper tools:

```sh
COWASM_TOOLCHAIN=zig
COWASM_TOOLCHAIN=clang
```

Initial behavior:

- `zig` remains the default.
- `clang` may fail for most packages at first.
- The wrapper should print or expose enough diagnostics to compare both backends.

Avoid changing package Makefiles broadly in this phase. The wrappers should absorb the backend selection.

Deliverable: wrappers accept the selector and keep current Zig behavior unchanged.

## Phase 2: Build A Direct Clang/Lld Backend For Tiny C Programs

Implement the smallest useful clang backend:

- `clang --target=wasm32-wasi`
- explicit sysroot
- explicit include paths
- explicit library paths
- explicit `wasm-ld` or clang-driver linker invocation
- explicit startup/runtime objects

Start with tiny programs that do not require dynamic libraries:

- hello-world style C program
- basic file IO
- stdout/stderr
- argv/env

Deliverable: a tiny package or test fixture builds and runs with both `COWASM_TOOLCHAIN=zig` and `COWASM_TOOLCHAIN=clang`.

## Phase 3: Port Simple Core Packages

Move from test fixtures to real packages:

- zlib or another small C library
- one simple coreutils binary
- a static library plus executable

Add comparison tests:

- binary runs under Node kernel
- stdout/stderr match
- basic file IO works
- artifact size is recorded

Deliverable: at least two real packages build with both backends.

## Phase 4: Shared Libraries And Dylink

This is the first serious gate. CoWasm depends heavily on shared modules and explicit dynamic linking behavior.

Validate direct clang/lld for:

- `-fPIC`
- shared wasm modules
- exported symbol lists
- GOT/data relocations
- function-table relocations
- side modules loaded by `core/dylink`
- C++ exception/runtime symbols where applicable

Do not move CPython here yet. Use a small C shared module and a small C++ shared module first.

Deliverable: focused dynamic-linking smoke tests pass under the clang backend.

## Phase 5: C++ Runtime Contract

Make libc++/libc++abi/compiler-rt handling explicit:

- identify where each runtime library comes from;
- build or vendor a CoWasm C++ runtime package intentionally;
- define how C++ shared modules resolve exception and RTTI symbols;
- test repeated dlopen/import of C++ modules.

This phase is critical for Matplotlib, kiwisolver, Cython-built C++, and future math packages.

Deliverable: a documented and tested C++ runtime/dylink package that works with the clang backend.

## Phase 6: CPython And Python Extensions

Only after simple C, shared C, and shared C++ work:

- build CPython with `COWASM_TOOLCHAIN=clang`;
- run the supported Python wasm smoke tests;
- build one simple C extension;
- build one Cython extension;
- build NumPy last within this phase.

Deliverable: `python/cpython` can build and pass supported runtime tests with the clang backend.

## Phase 7: Mathematical Dependencies

Use the Sage/Sagelite north star to choose packages:

- PARI/GP first if its existing wasm support gives leverage.
- FLINT/Arb next if the C/C++ runtime path is stable.
- eclib as a focused C++ dependency.
- Singular and GAP later; GAP is likely harder because of its low-level kernel assumptions.

Each package should have a small mathematical smoke test, not just a build test.

Deliverable: one high-value Sage-relevant dependency builds and runs with the clang backend.

## Phase 8: Decide Zig's Long-Term Role

After the clang backend passes real packages:

- keep Zig as an optional backend if it remains useful;
- stop requiring Zig for ordinary builds if clang is reliable;
- remove Zig-language compatibility code only when equivalent C/C++ code exists and tests pass;
- avoid rewriting working low-level runtime code just to change languages.

Success means CoWasm's build is understandable as explicit clang/lld/WASI/dylink machinery, with Zig no longer required to understand or evolve the project.
