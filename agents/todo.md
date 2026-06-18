# CoWasm Agent Backlog

This is a working backlog for future agent turns. Prefer small, validated
commits over broad rewrites.

## Toolchain And Zig Reduction

- Audit the remaining `zig` references and classify them as active build
  dependency, historical documentation, source comment, generated artifact, or
  harmless package text.
  - Current snapshot: no `.zig` or `.zon` source files remain.
  - `rg -n "zig" .` reports 437 matching lines.
  - `rg -o "zig" .` reports 493 literal matches.
  - Excluding `pnpm-lock.yaml`, `agents/**`, and `docs/**`, there are 343
    literal matches across 91 files.
- Replace active package-level `make zig`, `zig cc`, `zig ar`, and `zig ranlib`
  uses only after an equivalent `wasi-sdk` or selector-aware target is already
  green for that package.
- Keep the pinned Zig backend as the known-good default until `make
  test-wasi-sdk` and a browser runtime smoke are both strong enough to justify
  a default flip.
- Split real work from cleanup:
  - active build commands and wrappers first;
  - source comments second;
  - README and historical docs last.
- Rename or relocate `core/build/src/zig/bin/zig_cowasm_compiler.py` only after
  the default backend is no longer Zig. Until then, avoid churn in wrapper
  names.

## No-Zig `cowasm.sh` Track

- Build a `web/cowasm.sh` variant whose bundled runtime artifacts are produced
  from the `wasi-sdk` package path instead of the default Zig path.
- Start by identifying the runtime inputs that the current webpack build pulls
  through `dash-wasm`, `core/kernel`, `python-wasm`, `sqlite`, and package
  dist directories.
- Add an opt-in make target, for example `make -C web/cowasm.sh
  test-wasi-sdk`, instead of changing the default site build immediately.
- Validate in layers:
  - package-level `make test-wasi-sdk`;
  - `pnpm --filter cowasm-sh build`;
  - `pnpm --filter cowasm-sh test`;
  - browser smoke for shell startup, command execution, filesystem persistence,
    Python startup, SQLite startup, and interrupt behavior.
- Keep the default deployed `cowasm.sh` path on the known-good build until the
  opt-in variant has repeatable browser coverage.

## WASI SDK Package Hardening

- [x] Harden FLINT's standalone smoke with bundled Arb hypergeometric coverage:
  - exact `gamma(5) = 24`;
  - `erf(0) = 0`;
  - `J_0(0) = 1`.
- [x] Promote PARI's `wasi-sdk` smoke from "interesting probe" to a regression
  target with explicit error-recovery coverage:
  - GP kernel banner;
  - arithmetic smoke;
  - `1/0`, `break`, then another successful computation to prove
    setjmp/longjmp recovery still works.
- Try real setjmp/longjmp support in packages that currently carry local
  setjmp shims:
  - `core/qhull`;
  - `core/lua`;
  - `core/dash`;
  - `core/freetype`;
  - `core/less`.
- For dynamic side-module work, do not assume standalone SJLJ behavior carries
  over automatically. Add a side-module fixture before enabling SJLJ across
  CPython extension modules.
- Reduce duplicated compatibility headers in package smoke scripts by extracting
  tiny shared helpers only after two or three packages need the same real code.

## Python And Runtime

- Keep expanding the `wasi-sdk` CPython supported suite deliberately. Add tests
  only when failures are understood as real runtime coverage, not noisy
  unsupported-platform expectations.
- Revisit `_ssl` under the SDK path after socket and entropy behavior are
  clear. Treat `_hashlib` as separate from socket-enabled TLS.
- Revisit full `_ctypes` after the C callback and dynamic-symbol contracts are
  explicit. Do not let `_ctypes` block the default toolchain transition.
- Add browser-level validation for the SDK Python runtime before any default
  flip, especially interrupt behavior and dynamic extension imports.

## SageMath Direction

- Treat Sagelite as the practical bridge to SageMath-in-Wasm, not as a side
  quest. Prefer dependencies that unlock visible Sage/Sagelite features.
- Near-term candidates after GMP, MPFR, MPC, and PARI:
  - Keep expanding FLINT/Arb coverage around high-value number theory,
    exact/ball arithmetic, and special functions;
  - cysignals, because Sage error/interrupt semantics will need deliberate
    runtime integration;
  - Cython package hardening, because much of Sage's Python/C boundary depends
    on it.
- Current cysignals `wasi-sdk` side-module smoke covers import, guard cleanup,
  normal and no-except guard strings, signal-to-exception mapping, custom
  handler registration, and the interrupt-safe memory allocation helpers that
  downstream Sage Cython modules cimport. A bounded `sig_retry()` probe
  currently traps with `RuntimeError: unreachable` in the side module; keep
  that as a focused runtime/toolchain follow-up instead of enabling it in the
  smoke yet.
- Delay very broad systems such as GAP, Singular, and full Sage until the
  smaller math dependency layer and runtime error/interrupt behavior are
  stronger.
- Prefer mathematical smokes over build-only success:
  - exact integer arithmetic;
  - rational arithmetic;
  - polynomial arithmetic;
  - factorization;
  - error recovery after invalid mathematical input.

## Documentation Cleanup

- Update README language after, not before, the default backend changes. The
  README can mention the active `wasi-sdk` gate, but should not imply Zig has
  been removed while it remains the default build path.
- Keep `docs/toolchain-contract.md` as the exact source of truth for compiler,
  linker, archive, and runtime contracts.
- Keep `agents/wasi-sdk-modernization-plan.md` as a closed record. Put new
  work in focused backlog files or new transition plans.
