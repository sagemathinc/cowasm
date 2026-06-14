# Superseded: Embrace Modern Zig Plan

This plan has been superseded by
[`wasi-sdk-modernization-plan.md`](./wasi-sdk-modernization-plan.md).

The earlier investigation showed that modern Zig can build CoWasm-compatible
`wasm32-wasi -fPIC -shared` side modules, but the later `wasi-sdk` investigation
found a better long-term path:

- use pinned `wasi-sdk` as the canonical Clang/lld/wasi-libc provider;
- translate CoWasm-owned Zig implementation code to C;
- keep modern Zig only as a comparison or fallback toolchain probe.

Modern Zig remains useful evidence that newer LLVM/lld behavior can support
CoWasm's dylink model, but the project strategy is now Zig 0.10.1 to
`wasi-sdk`, not Zig 0.10.1 to modern Zig.
