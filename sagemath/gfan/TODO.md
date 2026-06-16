# Gfan WASI Port Notes

The `gfan` wasi-sdk standalone smoke builds and runs after:

- renaming the upstream `log2` helper to avoid the C++ standard library name;
- adding the missing `gfan::Matrix<typ>::vectormultiply` implementation used by gfanlib;
- using the upstream clang compile rule for `symmetrictraversal.cpp`;
- building against the existing CoWasm GMP and cddlib ports;
- providing a WASI-local `system()` stub, since gfan only uses it for optional shell integration.
- linking the final program with the pinned wasi-sdk `eh` C++ runtime archives:
  `libc++.a`, `libc++abi.a`, and `libunwind.a`.

The default wasi-sdk C++ driver path resolves the `noeh` archives, so the smoke
discovers the matching `eh` archive directory explicitly. `libunwind.a` is
required for the `__cpp_exception` tag referenced by the exception-enabled
`libc++` and `libc++abi` objects.
