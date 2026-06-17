# Boehm GC

Boehm-Demers-Weiser GC provides the conservative garbage collector used by
SageMath dependencies such as libhomfly.

This package builds a wasi-sdk standalone static `libgc.a` archive against the
sibling `libatomic-ops` port. The build uses a small WASI `setjmp` compatibility
header because Boehm GC probes stack/register state through platform-specific
setjmp support that is not available in the current WASI libc.

The smoke test links a C probe against the installed archive and checks ordinary
GC allocation, atomic allocation, `GC_REALLOC`, explicit `GC_FREE`, collection,
and finalizer dispatch under the WASI runner.
