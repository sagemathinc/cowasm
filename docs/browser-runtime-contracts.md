# Browser Runtime Contracts

This document records the current browser-side runtime contract for CoWasm.  The goal is to make differences from the Node runtime explicit before using CoWasm as a browser-side CoCalc project runtime.

Last verified locally: 2026-06-05 with `make -C web/browser test`.

## Product Gate

The current browser product gate is:

```sh
make -C web/browser test
```

That command builds a dedicated smoke bundle, serves it with cross-origin isolation headers, launches headless Chromium, and polls the page through the Chrome DevTools Protocol.

The smoke currently verifies:

- Python starts in a browser worker.
- Browser Python can create `/tmp`, write and read a file, stream stdout/stderr events, and handle SIGINT for a long-running `exec`.
- Browser Python can import and use the scientific package bundles for
  `mpmath`, `sympy`, `numpy`, and `pandas`.
- Browser Python can run a bounded selected-file `/project` workflow, export
  changed files, reject unsafe paths, and enforce import/export/runtime/output
  quotas.
- The dash terminal bundle loads in a browser worker.
- Browser dash can run `sh -c`, create files with bundled shell and Python commands, and verify them through shell exit status.

## Current Browser Measurements

Observed locally on 2026-06-05 with `make -C web/browser test`:

| Artifact or Step | Size or Time |
| --- | ---: |
| `python.wasm` | 4.6M |
| `python-minimal.zip` | 10K |
| `python-readline.zip` | 383K |
| `python-stdlib.zip` | 6.4M |
| `python-everything.zip` | 22M |
| `mpmath.tar.xz` | 523K |
| `sympy.tar.xz` | 6.1M |
| `numpy.tar.xz` | 2.3M |
| `pandas.tar.xz` | 3.7M |
| `Cython.tar.xz` | 1.5M |
| `pytz.tar.xz` | 125K |
| `dateutil.tar.xz` | 248K |
| `six.tar.xz` | 16K |
| Browser Python init | 776ms |
| Browser `mpmath` smoke | 183ms |
| Browser `sympy` smoke | 2480ms |
| Browser `numpy` smoke | 843ms |
| Browser `pandas` smoke | 1966ms |

## Runtime Differences

| Behavior | Node Runtime | Browser Runtime |
| --- | --- | --- |
| Filesystem | Can use native filesystem mounts. | Uses bundled zip files plus an in-memory/dev filesystem. CoCalc project sync must be layered on top. |
| Python startup | `python-wasm` can run through sync or async Node kernels. | Browser uses the async worker kernel only. |
| Standard IO | Node can inherit process stdio or use no-stdio event capture. | Browser uses event capture for stdout/stderr and programmatic stdin. |
| Interrupt | Node can use process signal integration or kernel signal calls. | Browser uses kernel signal delivery through the worker IO path. Python SIGINT is smoke-tested. |
| Shell commands | Node dash can execute bundled commands and has broader package tests. | Browser dash can execute the bundled shell path covered by `web/browser` smoke tests. |
| Native POSIX | `posix-node` can bridge selected host POSIX functions. | Native POSIX does not exist. The browser path must use WASI fd-table behavior and browser-specific shims. |
| Subprocesses | Python subprocess and spawn behavior are covered by CPython runtime contracts in Node. | Browser Python subprocess behavior is not yet a product contract. Bundle-level command execution is currently covered through dash. |
| CoCalc project files | Node can read/write local project files directly. | Browser needs an explicit sync layer, likely starting with selected files via `reflect-sync` or equivalent. |

## Open Browser Work

- Add a browser-side project filesystem adapter for a small synced file subset.
- Stabilize browser dash stdout and redirection output before treating captured terminal output as a product contract.
- Decide which Python subprocess semantics should exist in the browser, if any.
- Add browser tests for terminal stdin when wiring an actual xterm-style frontend.
- Keep bundle-size and startup-time measurements visible as the smoke grows.
