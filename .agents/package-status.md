# Package Status

This table records observed build/test status for the revived baseline.  Unknown means not checked in the current revival pass.

Last updated: 2026-06-05.

| Package | Build Status | Test Status | Last Checked | Notes |
| --- | --- | --- | --- | --- |
| `core/build` | pass | n/a | 2026-06-05 | Pinned Zig `0.10.1` bootstraps with `make -C core/build zig`. |
| `core/zlib` | pass | pass | 2026-06-04 | `make -C core/zlib test` passed. |
| `core/kernel` | pass | pass | 2026-06-05 | `make -C core/kernel test` passed. |
| `core/dash` | pass | pass | 2026-06-05 | Raw WASM dash builds and passes package tests. |
| `core/less` | pass | pass | 2026-06-05 | Uses GNU mirror for `less-608.tar.gz` with SHA256 verification. |
| `core/dash-wasm` | pass | pass | 2026-06-05 | `make -C core/dash-wasm test` passed; generated `dist/fs.zip` is 13M and Jest checks the bundle size envelope, expected terminal commands, `factor`, Python, sqlite3, tar, less, and basic file commands through dash. Runtime TODOs remain for `cp` preserving contents, redirection, pipes, and command substitution. |
| `python/cpython` | pass | pass | 2026-06-05 | `pip`, runtime contracts, and supported CPython suite pass; CPython reports all 279 supported tests OK. |
| `python/py-mpmath` | pass | pass | 2026-06-05 | `make -C python/py-mpmath clean-wasm test` passed after patching a Python 3.11 generator `StopIteration` issue; the test target now fails if the upstream runner prints `TEST FAILED`. |
| `python/py-sympy` | pass | pass | 2026-06-05 | `make -C python/py-sympy clean-wasm test` passed; this is the package's small import/basic functionality test, not the full SymPy suite. |
| `python/py-numpy` | pass | pass | 2026-06-05 | `make -C python/py-numpy test` passed after setuptools/distutils compatibility patches. |
| `python/py-pandas` | pass | pass | 2026-06-05 | `make -C python/py-pandas test` passed after setting CPython WASM `LDCXXSHARED` for C++ extension modules; this is the package's trivial import test. |
| `python/py-matplotlib` | disabled | disabled | 2026-06-05 | Makefile says this package does not work yet; `all` is a no-op and `test` now fails explicitly instead of reporting a false pass. |

## Baseline Commands

The currently preserved baseline is documented in [docs/baseline-build.md](../docs/baseline-build.md).
