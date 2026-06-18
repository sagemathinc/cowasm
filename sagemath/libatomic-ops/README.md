# libatomic_ops

This package builds libatomic_ops, the portable atomic memory update primitive
library used by Boehm GC, for CoWasm's wasi-sdk standalone toolchain.

The standalone smoke builds the static archive and links a C probe that checks
fetch-add, compare-and-swap, test-and-set, and lock-free stack operations under
the WASI runner.
