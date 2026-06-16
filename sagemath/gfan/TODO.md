# Gfan WASI Port

The package reaches the final `gfan` link with the wasi-sdk backend after:

- renaming the upstream `log2` helper to avoid the C++ standard library name;
- adding the missing `gfan::Matrix<typ>::vectormultiply` implementation used by gfanlib;
- using the upstream clang compile rule for `symmetrictraversal.cpp`;
- building against the existing CoWasm GMP and cddlib ports;
- providing a WASI-local `system()` stub, since gfan only uses it for optional shell integration.

The remaining blocker is C++ exception support in the standalone wasi-sdk C++ link.
With the default `noeh` runtime archives, link fails on `__cxa_allocate_exception`
and `__cxa_throw`. With the `eh` runtime archives, link instead fails on
`__cpp_exception`, which means the gfan objects and/or wrapper need the matching
exception-enabled compile/link contract.

Once exception-enabled C++ standalone linking is available, remove the expected
skip in `src/test-wasi-sdk-standalone.sh` and promote Gfan to the completed
package list in `sagemath/README.md`.
