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

Current status as of 2026-06-05:

- `dash-wasm` can run bundled WASM executables from the shell via the CoWasm `execve` path.
- Smoke coverage includes Python, sqlite3, tar, less, core file commands, redirection, and basic pipelines.
- Basic pipelines are implemented with a CoWasm-only sequential temp-file fallback because native `fork()` is not viable in the browser runtime.
- Command substitution remains open.  Two approaches were tested and rejected:
  - evaluating the backquoted AST in the current shell corrupts dash's expansion state;
  - rendering the command and recursively running `/cowasm/usr/bin/sh -c ...` hangs when re-entering the same dash WASM module through `PosixContext.run`.
- The likely durable fix is to run command substitution in an isolated runtime instance or to add a narrow non-recursive command runner for simple commands.  Do not revive the in-process AST shortcut without also isolating dash's parser/expansion globals.

## Phase 3: Runtime Contract Tests

Goal: define the behavior CoCalc needs before adding more packages.

Current status as of 2026-06-05:

- `python/cpython/src/runtime_contract_tests.py` is the focused contract suite.
- `make -C python/cpython test-runtime-contracts` covers:
  - `subprocess.run` stdout/stderr capture, stdin pipes, regular-file redirection, cwd/env propagation, and nonzero exit status;
  - `os.spawnl` successful file-writing children and nonzero exit status;
  - explicit `subprocess(pass_fds=...)` inheritance and close-on-exec behavior for inherited fds when `close_fds=True`;
  - filesystem create/read/write/delete, recursive copy/remove, stat size/mode, and symlinks.
- `subprocess(pass_fds=...)` now passes.  The fix passes CPython's keep-fd list into the CoWasm fork/exec bridge, includes those fds in `WASI_FD_INFO`, initializes inherited fds in `wasi-js`, and prevents inherited non-directory fds from being misreported as WASI preopens.
- `python/python-wasm/src/test/no-stdio.test.ts` covers the in-memory Python terminal path with `noStdio: true` and `fs: "bundle"`:
  - stdout/stderr event capture from the REPL;
  - multiline REPL input with continuation prompts;
  - Ctrl-C delivered through `kernel.writeToStdin("\u0003")`, interrupting `while True: pass` and surfacing `KeyboardInterrupt`.
- Focused validation passes with `pnpm exec tsc && pnpm exec jest --no-watchman --runInBand ./dist/test/no-stdio.test.js` after building `python/python-wasm/dist/python.wasm`, `python-readline.zip`, and `python-stdlib.zip`.
- The full `python-wasm` Jest suite passes with `pnpm exec tsc && pnpm exec jest --no-watchman --runInBand ./dist` after generating `python-everything.zip` and the `hello` extension artifact from existing package outputs.

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
  - interactive stdin: covered for Python `noStdio`
  - resize events if applicable
  - readline basics: covered for Python multiline REPL continuation
  - interrupting a long-running command: covered for Python terminal Ctrl-C via `writeToStdin`
- Keep these tests small and independent of the full CPython test suite.

## Phase 4: Browser Worker Proof

Goal: prove that the runtime works in the environment that matters for CoCalc-ai.

Current status as of 2026-06-05:

- `web/browser` now uses the workspace `python-wasm` package instead of the published npm package, so browser tests exercise the repo under development.
- `make -C web/browser test` runs a headless Chromium smoke test:
  - prepares the local `python-wasm` browser assets needed by webpack;
  - prepares the local `dash-wasm` terminal bundle assets needed by webpack;
  - builds a dedicated smoke bundle with `COWASM_BROWSER_SMOKE=1`;
  - serves the bundle with COOP/COEP headers for `SharedArrayBuffer`;
  - starts Chromium and polls the page through the Chrome DevTools Protocol;
  - initializes Python in the browser worker path, creates `/tmp`, writes and reads a file, checks stdout/stderr event streaming, interrupts `while True: pass` with SIGINT, and checks a Python result.
  - initializes the dash terminal bundle in the browser worker path, runs `sh -c`, creates files with bundled shell and Python commands, and verifies them through shell exit status.
- This is intentionally not a UI test.  It is the first product-gate proof that the browser worker runtime can start Python and perform filesystem IO in a real browser.
- `wasi-js` now implements `fd_renumber(from, to)` in the correct direction, moving `from` onto `to` and closing the old `to`.  This fixes a real WASI fd-table semantics bug found while investigating browser dash redirection.
- Browser dash stdout and redirection output are not yet stable enough for the product gate.  `echo ... > /tmp/dash-smoke; cat /tmp/dash-smoke` can pass after allowing virtual `dup`/`dup2` and fixing `fd_renumber`, but repeated smoke runs still show missing output.  Keep captured terminal output as a focused follow-up.

- Create a minimal browser-worker test harness that runs in CI or Playwright: covered for headless Chromium without adding Playwright.
- Load the terminal bundle and execute a few commands against an in-memory or synced filesystem: covered for shell command execution, basic file commands, and bundled Python execution; browser dash captured output remains open.
- Test Python startup, file IO, stdout/stderr streaming, and interrupt: covered for Python in the browser worker smoke test.
- Explicitly mark which Node runtime behaviors do not exist in the browser and what replaces them: covered in `docs/browser-runtime-contracts.md`.
- Avoid building a polished UI here; this phase is about runtime correctness.

## Phase 5: CoCalc-ai Integration Spike

Goal: run one useful CoCalc workflow in the browser without starting a project backend.

- Use `/home/user/cocalc-ai` as the integration reference when developing locally:
  initial findings and the first spike shape are documented in
  `docs/cocalc-ai-browser-runtime-spike.md`.
- Start with a small read/write filesystem subset, not full project sync.
- Evaluate `reflect-sync` for synchronizing selected files into the browser runtime.
- Prototype:
  - open a project file in the browser runtime,
  - run Python or shell command against it,
  - write a result file,
  - sync the result back.
- Only after that, prototype a browser-side Jupyter kernel.

Current status as of 2026-06-05:

- The relevant CoCalc AI integration surfaces are Conat filesystem RPCs
  (`readFile`, `writeFile`, `writeFileDelta`, `watch`, `syncFsWatch`) and the
  SyncDoc/Patchflow live document layer.
- The first MVP should import an explicit project file subset into a CoWasm
  `/project` mount, run one Python or shell command in the browser worker,
  diff changed files, then export selected outputs with base-aware conflict
  handling.
- `web/browser/src/smoke.ts` now includes an in-CoWasm `/project` fixture that
  imports text files, runs a Python script, detects changed files by comparing
  hashes to the base snapshot, and verifies the output file.
- `web/browser/src/project-files.ts` is the first reusable project-subset
  adapter.  It loads selected files into a Python worker mount and exports
  changed files with base hashes, sha256 hashes, base64 bytes, and UTF-8 text
  when available.
- The browser smoke covers nested binary import/export and rejects unsafe
  project paths such as `../escape.txt` before they reach the runtime mount.
- Full recursive sync, project-host terminal parity, browser Jupyter kernels,
  and scientific package expansion are intentionally out of scope for this
  spike.

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
