# SACLIB for CoWasm

This package builds the SageMath SACLIB 2.2.8 source archive as a static
WASI library.

The current smoke test verifies that the archive builds, installs headers, and
links into a WASI executable. The WASI executable exercises scalar helpers,
GC-backed list and array allocation, univariate integer polynomial evaluation,
truncated multiplication, full multiplication, and polynomial gcd/cofactor
recovery.
