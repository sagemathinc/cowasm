# Package Status

This table records observed build/test status for the revived baseline.  Unknown means not checked in the current revival pass.

Last updated: 2026-06-05.

| Package | Build Status | Test Status | Last Checked | Notes |
| --- | --- | --- | --- | --- |
| `core/build` | pass | n/a | 2026-06-05 | Pinned Zig `0.10.1` bootstraps with `make -C core/build zig`. |
| `core/zlib` | pass | pass | 2026-06-04 | `make -C core/zlib test` passed. |
| `core/kernel` | pass | pass | 2026-06-05 | `make -C core/kernel test` passed. |
| `core/dash` | pass | pass | 2026-06-05 | Raw WASM dash builds and passes package tests. |
| `core/less` | fail | blocked | 2026-06-05 | Historical upstream URL for `less-608.tar.gz` returns 403 HTML. |
| `core/dash-wasm` | blocked | blocked | 2026-06-05 | Blocked by `core/less` source acquisition. |
| `python/cpython` | pass | pass | 2026-06-05 | `make -C python/cpython pip` and `make -C python/cpython test` pass; CPython reports all 279 supported tests OK. |
| `python/py-mpmath` | unknown | unknown | n/a | Not checked in the current revival pass. |
| `python/py-sympy` | unknown | unknown | n/a | Not checked in the current revival pass. |
| `python/py-numpy` | unknown | unknown | n/a | Not checked in the current revival pass. |
| `python/py-pandas` | unknown | unknown | n/a | Not checked in the current revival pass. |
| `python/py-matplotlib` | unknown | unknown | n/a | Not checked in the current revival pass. |

## Baseline Commands

The currently preserved baseline is documented in [docs/baseline-build.md](../docs/baseline-build.md).

