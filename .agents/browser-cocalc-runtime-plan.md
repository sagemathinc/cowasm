# Browser-Side CoCalc Runtime Plan

## North Star

Make CoWasm into a browser-side CoCalc project runtime: a WASM userspace that can run a shell, Python, small Unix tools, and eventually Jupyter kernels against a synchronized subset of a CoCalc project filesystem without starting the project backend.

This is not primarily a Pyodide clone.  Pyodide is the reference point for browser Python and scientific packages.  CoWasm should win where CoCalc needs a terminal-shaped, filesystem-shaped, interruptible project runtime in the browser.

## Principles

- Keep the current pinned baseline green before upgrading toolchains.
- Prefer small, independently validated changes over broad rewrites.
- Treat source acquisition as part of the build, not an external assumption.
- Add runtime contract tests for behavior CoCalc depends on: stdin/stdout, pipes, subprocesses, signals, interrupts, filesystem operations, terminal behavior, and cleanup.
- Separate Node runtime success from browser runtime success.  Node tests are necessary, but browser-worker tests are the product gate.

## Phase 0: Preserve The Baseline

Goal: make the revived build reproducible on a clean Linux runner.

- Document the known-good setup:
  - apt packages required by the current build.
  - pinned Zig `0.10.1` bootstrap command.
  - CPython `3.11.2` build and test commands.
- Expand CI from `make core` to a staged baseline:
  - `make -C core/build zig`
  - `make -C core/zlib test`
  - `make -C core/kernel test`
  - `make -C python/cpython pip`
  - `make -C python/cpython test`
- Archive or print enough logs to diagnose failures without exposing secrets.
- Add a short status table in the repo for packages that build, test, fail, or are intentionally disabled.

## Phase 1: Make Upstream Sources Reproducible

Goal: no build should fail because a small upstream tarball disappeared, blocked HTTP, or changed contents silently.

Current audit command: `make audit-sources`.  It fails if a tracked package Makefile defines `URL` and `TARBALL` without `TARBALL_SHA256`, unless that Makefile has an explicit `SOURCE_AUDIT_IGNORE` marker.  As of 2026-06-05, all active tracked package downloads have checksums; `core/luatex` is ignored because the package is disabled and its old branch archive URL is stale.

Current fetch command: `make fetch-sources`.  It runs the audit first, then downloads and verifies each active tracked package tarball without building the packages.

- Add a `make fetch` style target that downloads all upstream tarballs without building.
- Add checksums for every upstream tarball.
- Vendor small tarballs directly when licensing and size make that reasonable.
- Add fallback mirrors for larger sources.
- Fix the current `core/less` failure:
  - `greenwoodsoftware.com` now returns 403 for `less-608.tar.gz`.
  - Find a durable mirror or vendor the exact tarball.
  - Re-run `make -C core/less test`.

## Phase 2: Restore The Terminal Bundle

Goal: make `dash-wasm` a reliable browser-terminal artifact.

- Keep `core/dash` green; it currently builds and passes its package tests.
- Restore `core/dash-wasm test` after fixing `less`.
- Add smoke tests for commands expected in a CoCalc browser terminal:
  - `sh`
  - `python`
  - `sqlite3`
  - `tar`
  - `less`
  - `cat`, `cp`, `ls`, `mkdir`, `rm`, `sort`, `grep`, `wc`
- Record bundle contents and sizes so regressions are visible.
- Verify control-C behavior in the terminal bundle, not only in isolated Python.

## Phase 3: Runtime Contract Tests

Goal: define the behavior CoCalc needs before adding more packages.

- Add focused tests for process behavior:
  - `subprocess.run`
  - `os.spawn*`
  - pipes and redirected stdio
  - fd inheritance and close-on-exec
  - process exit status and signal status
- Add filesystem tests:
  - create/read/write/delete
  - recursive copy
  - symlinks if supported
  - permissions and stat fields where meaningful in WASM
- Add terminal tests:
  - interactive stdin
  - resize events if applicable
  - readline basics
  - interrupting a long-running command
- Keep these tests small and independent of the full CPython test suite.

## Phase 4: Browser Worker Proof

Goal: prove that the runtime works in the environment that matters for CoCalc-ai.

- Create a minimal browser-worker test harness that runs in CI or Playwright.
- Load the terminal bundle and execute a few commands against an in-memory or synced filesystem.
- Test Python startup, file IO, stdout/stderr streaming, and interrupt.
- Explicitly mark which Node runtime behaviors do not exist in the browser and what replaces them.
- Avoid building a polished UI here; this phase is about runtime correctness.

## Phase 5: CoCalc-ai Integration Spike

Goal: run one useful CoCalc workflow in the browser without starting a project backend.

- Use `/home/user/cocalc-ai` as the integration reference when developing locally.
- Start with a small read/write filesystem subset, not full project sync.
- Evaluate `reflect-sync` for synchronizing selected files into the browser runtime.
- Prototype:
  - open a project file in the browser runtime,
  - run Python or shell command against it,
  - write a result file,
  - sync the result back.
- Only after that, prototype a browser-side Jupyter kernel.

## Phase 6: Scientific Stack

Goal: move toward useful Python package coverage after the runtime is stable.

- Keep CPython `3.11.2` green first.
- Then try low-risk Python package refreshes:
  - `mpmath`
  - `sympy`
  - `numpy`
- Treat `scipy`, `pandas`, and `matplotlib` as later milestones because they can consume a lot of build-system time.
- Keep Sagelite-in-WASM as a long-term target, not an early gate.

## Toolchain Upgrade Strategy

Upgrade one axis at a time.

- Zig:
  - Keep `0.10.1` as the known-good compiler until CI is reliable.
  - Add an experimental Zig upgrade branch or make target.
  - Expect churn in WASI libc, linker flags, warnings, and stdlib patching.
  - Do not rewrite Zig code before measuring how much actually depends on Zig language internals versus `zig cc`.
- Python:
  - Try latest `3.11.x` first.
  - Then `3.12`.
  - Only then `3.13+`.
  - Watch frozen modules, `_posixsubprocess`, WASI configure behavior, and extension builds.

## First Useful Commits

1. Add baseline build documentation and CI commands for the currently green CPython path.
2. Add source checksums and fix/vendor `less-608.tar.gz`.
3. Restore `make -C core/dash-wasm test`.
4. Add a small runtime contract test file for subprocess, pipes, and interrupt behavior.
5. Add a package status table generated or updated from actual build/test results.
