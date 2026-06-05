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
| `core/dash-wasm` | pass | pass | 2026-06-05 | `make -C core/dash-wasm test` passed; generated `dist/fs.zip` is 13M and Jest checks the bundle size envelope, expected terminal commands, `factor`, Python, sqlite3, tar, less, redirection, pipes, and basic file commands through dash. Runtime TODO remains for command substitution. |
| `python/cpython` | pass | pass | 2026-06-05 | `pip`, runtime contracts, and supported CPython suite pass; CPython reports all 279 supported tests OK. |
| `python/py-setuptools` | pass | pass | 2026-06-05 | `make -C python/py-setuptools test` passed. |
| `python/py-pip` | pass | pass | 2026-06-05 | `make -C python/py-pip test` passed. |
| `python/py-cython` | pass | pass | 2026-06-05 | `make test-python` reached this package and passed the import check plus Cython demo extension builds/runs. |
| `python/py-mpmath` | pass | pass | 2026-06-05 | `make -C python/py-mpmath test` passed the full upstream mpmath suite. |
| `python/py-sympy` | pass | pass | 2026-06-05 | `make -C python/py-sympy test` passed; this is the package's small import/basic functionality test, not the full SymPy suite. |
| `python/py-numpy` | pass | pass | 2026-06-05 | `make -C python/py-numpy test` passed; this is the package's smoke test. |
| `python/py-pandas` | pass | pass | 2026-06-05 | `make -C python/py-pandas test` passed; this is the package's trivial import test. |
| `python/python-wasm` | pass | pass | 2026-06-05 | `make -C python/python-wasm test` passed 14 Jest suites, with 2 suites intentionally skipped. |
| `python/bench` | pass | pass | 2026-06-05 | `make test-python` ran the benchmark target successfully, but it uses `pnpm dlx python-wasm`, so this is not a pure local workspace validation. |
| `python/py-matplotlib` | disabled | disabled | 2026-06-05 | Makefile says this package does not work yet; `all` is a no-op and `test` fails explicitly. This is the reason aggregate `make test-python` stops after the earlier Python tests pass. |

## Aggregate Python Commands

Observed on 2026-06-05:

- `make python` passed for all Python packages.
- `make test-python` passed through `python/cpython` and `python/py-cython`, then stopped at `python/py-matplotlib` because that package intentionally fails its test target.
- `make test-python-supported` passed.  It excludes `python/py-matplotlib` and
  is the supported-stack green target.
- After the aggregate stop, focused tests passed for `python/py-mpmath`, `python/py-numpy`, `python/py-pandas`, `python/py-sympy`, and `python/python-wasm`.

## Baseline Commands

The currently preserved baseline is documented in [docs/baseline-build.md](../docs/baseline-build.md).
