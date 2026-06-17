# SACLIB for CoWasm

This package builds the SageMath SACLIB 2.2.8 source archive as a static
WASI library.

The current smoke test verifies that the archive builds, installs headers, and
links into a WASI executable. SACLIB's GC-backed list and polynomial routines
still need targeted WASI stack/root handling before they can be treated as
runtime-ready.
