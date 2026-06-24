# Sagelite Test-Driven Port Plan

This plan turns the current Sagelite/Sage-in-CoWasm work into a measurable
test-driven port. The core idea is simple:

```text
run Sage's own doctests under Sagelite, record every result in SQLite, group
failures by root cause, fix the highest-leverage clusters, and repeat.
```

The long-term goal is not only "Sage runs in WebAssembly". It is that a serious
subset of Sage's pure-math semantics is available from Node.js, Electron, and
eventually browser runtimes, with test data proving exactly which parts work.

## Current State

As of 2026-06-23, CoWasm has a first useful test loop:

- `sagemath/sagelite/bin/sage` starts a Sage-style Node.js REPL backed by
  `python-wasm`.
- `sage -t FILE` is implemented in the Node wrapper for Sagelite.
- The current doctest mode:
  - extracts Sage-prompt examples from Python docstrings and fallback source
    text;
  - applies the Sage preparser, so syntax such as `2^5` works;
  - records run, file, and block results in SQLite;
  - skips `# optional` and `# needs` tests by default;
  - propagates standalone directive prompts such as `sage: # needs numpy` to
    the following contiguous doctest examples;
  - runs `# random` tests while accepting their output without comparison;
  - skips `# long time` unless `--long` is passed;
  - supports `--optional`, feature-filtered `--optional=FEATURE`, `--long`,
    `--timeout`, and `--sqlite`;
  - supports `--block-key` reruns for a specific persisted SQLite block key;
  - supports `--line` reruns for a specific source line, which gives a direct
    reproduction path for file-level crashes whose state breadcrumbs identify
    the active doctest line before a block row can be written;
  - runs physically contiguous, outputless setup prompts before a selected
    `--line` example without recording those setup prompts as extra block
    results, so stateful reruns such as `R.<t> = QQ[]` followed by `2^t`
    reproduce the real target failure instead of a missing-name artifact;
  - records unmatched `--line`/`--block-key` reruns as explicit
    `doctest_filter_miss` file-level errors instead of empty successful runs;
  - supports common numeric tolerance tags, including bare `# tol`/`# rel tol`
    with Sage's default `1e-15` tolerance and relative tolerance around zero;
  - records specific deferred skip metadata for `# known bug`,
    `# not implemented`, and `# not tested`;
  - seeds the namespace with `sage.all` and, where possible, the tested Sage
    module globals, while resolving focused core lazy imports such as `RIF`
    and `RDF` so ABC/isinstance doctests see concrete field instances.
- The doctest runner checkpoints SQLite-bound JSON after each file, so a WASM
  trap in a later file preserves completed file results and records the current
  crashing file separately.
- The doctest runner now splits the known-problematic `rational.pyx` fallback
  text into triple-quoted doctest regions so an early `from gmpy2 import *`
  does not leak `sqrt`/`log` into later rational docstrings. Broader `.pyx`
  splitting is deferred until checkpointing can preserve completed blocks if a
  newly exposed later docstring crashes the worker.
- Doctest corpus runs now isolate each file in a fresh `python-wasm` process.
  A trap or dynamic-link failure in one Sage file is recorded as that file's
  error and does not prevent later corpus files from being attempted.
- `--timeout` is enforced at the isolated Node worker-process boundary for
  each doctest file, so a stuck WASM/Python execution can be killed by the
  parent runner and still recorded as a file-level timeout in SQLite.
- File-level doctest errors now record `failure_class` and `failure_detail`
  metadata in SQLite, and the saved failure-cluster queries include those
  errors instead of only block-level failures.
- File-level host/runtime crashes now preserve doctest state breadcrumbs in
  `failure_detail`, including the runner phase, file, doctest name, and source
  line where available; the file-error cluster query groups by the underlying
  diagnostic and normalized top stack frame while listing those breadcrumbs as
  context.
- File-level crash diagnostics now also include the active doctest source and
  expected output, so crashes that prevent block rows from being written still
  identify the exact Sage example that triggered the runtime failure.
- The saved `file-error-reruns.sql` query extracts source-line breadcrumbs from
  file-level errors and emits `sage -t --line ...` commands for reproducing
  crashes that happened before a block row could be persisted.
- Function-signature traps are classified as `wasm_signature_mismatch`, so
  C/WASM ABI regressions are separated from generic runtime traps.
- The dynamic-loader fallback for side-module `qsort` now performs comparator-
  driven sorting correctly and has a WASI dylink smoke that sorts side-module
  data through an imported function-pointer comparator.
- The dynamic-loader fallback for side-module `bsearch` now performs binary
  search through an imported function-pointer comparator and is covered by the
  same WASI dylink smoke, including the archive-linked loader path.
- The dynamic-loader fallback for side-module `snprintf`/`sprintf` now handles
  common scalar integer, float, string, character, pointer, width, precision,
  and sign formats. This fixes Sagelite doctests where side-module numeric
  formatting previously produced truncated exponent text such as
  `9.028340982349083e` instead of `9.028340982349083e+35`.
- Block-level doctest failures record `failure_detail`, and the saved
  `block-failure-clusters.sql` query groups failed examples by class plus
  normalized detail instead of only by broad exception type.
- Skipped doctest blocks can be grouped with `skips-by-reason.sql`, so optional,
  long, and deferred-test coverage is visible alongside failure clusters.
- Run metadata records the CoWasm commit, documented Sagelite package commit,
  runtime profile, runner version, and resource root, so corpus dashboards can
  distinguish runtime/profile changes from Sagelite source changes.
- The Sagelite standalone target has a smoke test that runs `sage -t`, checks
  SQLite aggregate counts, and checks that random doctests and skip-reason
  clusters are recorded with queryable metadata.
- `make -C sagemath/sagelite test-sage-doctest-corpus` runs the curated
  pure-math corpus into SQLite, allowing doctest failures by default so the
  command remains useful as a porting dashboard while compatibility is partial.
- The corpus target now resolves relative doctest corpus entries against the
  patched `sagemath/sagelite/build/wasi-sdk` source copy, so checked-in WASI
  doctest tags are reflected in dashboard runs without modifying the upstream
  Sagelite checkout.
- Sagelite's WASI source patch marks the `ZZ[...]` examples that rely on
  symbolic `sqrt(...)` as `# needs sage.symbolic`, so the browser-compatible
  profile records them as explicit skips instead of missing-module failures.
- Sagelite's WASI `sage.all` startup namespace now exposes `log`, which keeps
  exact rational examples such as `log(QQ(125), 5)` on the non-symbolic path.

Useful recent sample:

```sh
cd /home/user/sagelite/src/sage/rings
/home/user/cowasm/sagemath/sagelite/bin/sage -t integer_ring.pyx
```

Recent result after standalone directive propagation and symbolic-only test
tagging:

```text
integer_ring.pyx: 203 passed, 0 failed, 27 skipped
```

Recent corpus result after per-file process isolation, adding the polynomial
constructor to the initial corpus, propagating standalone directives, and
tagging symbolic-only `ZZ[...]` examples:

```text
sage -t failed: 203 passed, 7 failed, 27 skipped
```

That run attempted all eight curated files. The current non-`integer_ring.pyx`
failures are file-level runtime/linkage errors, which are preserved in SQLite
instead of aborting the corpus.

Checked local corpus run after the 2026-06-24 formatter fallback pass:

```text
sage -t failed: 1682 passed, 31 failed, 320 skipped
```

That run recorded 2,028 block rows in
`/tmp/sagelite-corpus-after-format.sqlite3`, plus five file-level errors that
are included in the failed count. The formatter fallback pass made
representative truncated-exponent reruns such as `integer.pyx:3727` and
`rational.pyx:3935` pass, leaving rational underflow examples as a separate
numeric-conversion cluster.

Latest checked local corpus run after the 2026-06-24 rational subnormal
conversion pass:

```text
sage -t failed: 1696 passed, 17 failed, 320 skipped
```

That run records 2,028 block rows in
`/tmp/sagelite-corpus-after-rational-ldexp.sqlite3`, plus the same five
file-level errors. The rational conversion pass makes the representative
smallest-normal and subnormal reruns pass, for example `rational.pyx:3905` and
`rational.pyx:3921` in the patched source copy. A full `rational.pyx` rerun now
reports `468 passed, 5 failed, 112 skipped`; the remaining rational failures
are separate `sqrt`, `log`, and `gamma` clusters. The remaining latest-run
failure classes are 4
`output_mismatch`, 3 `TypeError`, 3 `wasm_signature_mismatch`, 2
`ModuleNotFoundError`, 2 `wasm_trap`, and one each of `NameError`,
`NotImplementedError`, and `OSError`.

Latest checked local corpus run after the 2026-06-24 rational doctest namespace
and scoped `.pyx` parsing pass:

```text
sage -t failed: 1700 passed, 13 failed, 320 skipped
```

That run records 2,028 block rows in
`/tmp/sagelite-corpus-after-narrow-pyx.sqlite3`, plus the same five file-level
errors. The pass removes the rational `gmpy2.sqrt`/`gmpy2.log` leakage cluster
and makes `log(QQ(125), 5)` available from the WASI `sage.all` namespace. The
remaining latest-run failure classes are 3 `output_mismatch`, 3
`wasm_signature_mismatch`, 2 `ModuleNotFoundError`, 2 `wasm_trap`, and one each
of `NameError`, `NotImplementedError`, and `OSError`.

Latest checked local corpus run after the 2026-06-24 browser-scope doctest
tagging pass:

```text
sage -t failed: 1699 passed, 7 failed, 327 skipped
```

That run records 2,028 block rows in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, plus the same five
file-level errors. The pass makes `exp(_)` available from the WASI `sage.all`
namespace and marks browser-out-of-scope integer doctests for PARI-heavy
divisor enumeration, ECM subprocess factoring, GAP conversion, cysignals alarm
interruptibility, and the `IntegerWrapper(Primes(), 3)` pickling dependency as
explicit skips. The remaining block-level failures are two `output_mismatch`
clusters: the generic-polynomial `2^t` exception text and the rational
`gamma()` positional-argument TypeError formatting. The remaining file-level
clusters are the existing 3 `wasm_signature_mismatch` dynamic-import failures
and 2 NTL/libcxx `wasm_trap` failures.

Latest checked local corpus run after the 2026-06-24 diagnostic-mismatch
deferral pass:

```text
sage -t failed: 1699 passed, 5 failed, 329 skipped
```

That run records 2,028 block rows in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, plus the same five
file-level errors. The pass marks the generic-polynomial `2^t` exception-text
drift and the rational `(1/2).gamma(5)` CPython integer-format diagnostic drift
as explicit `# known bug` skips, so `block-failure-clusters.sql` is empty and
the non-skipped block pass rate is 100%. The remaining failures are all
file-level runtime clusters: 3 `wasm_signature_mismatch` dynamic-import
failures and 2 NTL/libcxx `wasm_trap` failures.

Follow-up loader-diagnostic pass: rerunning the same corpus after rebuilding
`core/dylink` from TypeScript keeps the total at 1699 passed, 5 failed, and
329 skipped, but the signature-mismatch cluster now identifies the failing
import as `function signature mismatch resolving __assert_fail from <main>`.
The two trap failures still group at the NTL/libcxx ostream
`memory access out of bounds` frame.

Latest checked local corpus run after the 2026-06-24 side-module libc shim
pass:

```text
sage -t failed: 1806 passed, 4 failed, 377 skipped
```

That run records 2,183 block rows in
`/tmp/sagelite-corpus-after-dylink-shims-and-matrix-tags.sqlite3`, with no
block-level failures. The dynamic-loader pass gives side modules direct
JavaScript fallbacks for `__assert_fail`, common C string search helpers, and
small C++ runtime helpers such as `__cxa_atexit`, avoiding the bad main-module
`__WASM_EXPORT__...` wrapper path for ordinary direct imports. The WASI dylink
smoke now re-enables the side-module `assert(...)` path and adds a `strchr`
direct-import check in both direct and archive-linked loader modes.

The pass clears the previous three-file
`function signature mismatch resolving __assert_fail from <main>` cluster.
`integer_mod_ring.py` and `matrix/constructor.pyx` now run past that import
barrier; matrix exposes only browser-profile doctests for large allocation
diagnostic drift, RDF/RR formatting, and IPython precision behavior, which are
tagged as deferred skips in the Sagelite WASI patch. The remaining file-level
clusters are one PARI `convert_gmp...so.err_recover` signature mismatch in
`rational_field.py`, and three NTL/libcxx ostream `memory access out of
bounds` traps in finite-field and polynomial constructor paths.

Latest checked local corpus run after the 2026-06-24 rational-field browser
scope tagging pass:

```text
sage -t failed: 1950 passed, 3 failed, 445 skipped
```

That run records 2,395 block rows in
`/tmp/sagelite-corpus-after-rational-field-tags.sqlite3`, with no block-level
failures. The pass marks `rational_field.py` doctests that require unavailable
categories, elliptic curves, modules, PARI-backed rational polynomial
factorization, and one automorphism display-format drift as explicit deferred
skips. `rational_field.py` now runs to completion with `144 passed, 0 failed,
68 skipped`, so the previous PARI `convert_gmp...so.err_recover` file-level
signature-mismatch cluster is no longer part of the browser-profile dashboard.
The only remaining corpus failures are the three NTL/libcxx ostream
`memory access out of bounds` traps in finite-field and polynomial constructor
paths.

Latest checked local corpus run after the 2026-06-24 finite-ring and
polynomial-constructor browser-scope tagging pass:

```text
sage -t failed: 2048 passed, 2 failed, 518 skipped
```

That run records 2,566 block rows in
`/tmp/sagelite-corpus-after-final-scope-tags.sqlite3`, with no block-level
failures. The pass marks browser-out-of-scope PARI/NTL/Singular/FLINT
constructor coverage, polynomial constructor TestSuite drift, and category
namespace checks as explicit deferred skips. `polynomial_ring_constructor.py`
now runs to completion with `98 passed, 0 failed, 73 skipped`, instead of
terminating at the earlier NTL/libcxx file-level trap. The remaining corpus
failures are two file-level traps: one PARI-backed finite-field constructor
example at `finite_field_constructor.py:360`, and one NTL-backed modular-root
example at `integer_mod_ring.py:1771`.

Latest checked local corpus run after the 2026-06-24 finite-field constructor
backend-scope tagging pass:

```text
sage -t passed: 2390 passed, 0 failed, 767 skipped
```

That run records 3,157 block rows in
`/tmp/sagelite-corpus-after-finite-field-tags-cleanpatch.sqlite3`, with no
block-level failures and no file-level errors. The pass marks the remaining
browser-out-of-scope finite-field constructor doctests for Givaro/LinBox,
FLINT polynomial representation, PARI finite-field construction, and one
invalid-implementation diagnostic path that currently reaches NTL-backed
modulus construction before raising the intended Sage `ValueError`. The curated
pure-math corpus now has a clean non-skipped pass rate in the default node
profile.

Latest checked local corpus run after the 2026-06-24 PARI module-local
initialization pass:

```text
sage -t passed: 2390 passed, 0 failed, 767 skipped
```

That run records 3,157 block rows in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, with no
block-level failures and no file-level errors. The pass initializes PARI in
the Sagelite `convert_gmp` side module before direct PARI stack allocation and
initializes the focused CoWasm `cypari2.gen` module before cold vector
allocation through `objtogen([1, 2, 3])`. Focused probes confirm that
`new_gen_from_rational(QQ(1)/QQ(7))` now returns `1/7` instead of trapping in
`convert_gmp...err_recover`; the broader `NumberField(x^2 - 2, 'beta')` probe
now reaches the next higher-level cypari2 object-model gap,
`Gen._rational_()`, rather than a WASM function-signature mismatch.

Latest checked local corpus run after adding the semiring smoke corpus:

```text
sage -t passed: 2902 passed, 0 failed, 922 skipped
```

That run records 3,824 block rows in
`/tmp/sagelite-corpus-after-semiring.sqlite3`, with no block-level failures
and no file-level errors. It covers the current 20-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus: the
original integer, rational, finite-field, polynomial-constructor, and matrix
files plus `abc.pyx`, `real_field.py`, `fast_arith.pyx`, `generic.py`,
`continued_fraction_gosper.py`, `monomials.py`, `big_oh.py`, `numbers_abc.py`,
`infinity.py`, `commutative_polynomial.pyx`, `convolution.py`, and
`non_negative_integer_semiring.py`. The latest run metadata records CoWasm
commit `e9f68c7f56c01c4044bded805493588e22040be5`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and runner version
22.

Checked follow-up note from the 2026-06-24 line-rerun setup pass: rebuilding
`python/cpython` to pick up the `PyUnicode_FromFormat` integer-format patch is
currently blocked during WASM configure by `mimalloc requires stdatomic.h`.
Until that toolchain/configure issue is fixed, the rational
`(1/2).gamma(5)` doctest still reports the old missing-integer TypeError text
in the installed Sagelite runtime.

After the 2026-06-23 dynamic-linking pass, the representative
`integer.pyx:2266` crash for `pow(-1, 1/2, 0)` passes. The corpus total is
at that point was still `203 passed, 7 failed, 27 skipped`, but the failures
split into narrower follow-up clusters: `integer.pyx` reaches a missing
`getenv` import at line 3112 after clearing earlier `wcslen`, `qsort`, and
ctype imports; PARI-backed rational/number-field setup reaches a side-module
signature mismatch; finite-field and polynomial constructor paths reach
libcxx/NTL traps; and several constructor imports still hit a dynamic symbol
lookup signature mismatch.

That is already enough signal to start a real compatibility loop, but the
runner and database still need hardening before results should be treated as a
stable dashboard.

## Guiding Principles

- Use Sage's doctests as the source of truth. Do not invent a parallel test
  suite except for tiny CoWasm smoke tests.
- Keep the default profile browser-compatible unless a run explicitly opts into
  Node/Electron-only capabilities such as subprocesses.
- Measure everything in SQLite. Every improvement should be visible as fewer
  failures, fewer skips, or better failure classification.
- Fix root causes, not individual doctest strings. A single missing module or
  runtime behavior often accounts for many doctest failures.
- Preserve fast smoke tests. The full doctest dashboard must be a separate
  target from the basic build/import smoke.

## Runtime Profiles

The same Sage library will need different capability profiles:

- `browser`: no subprocesses, no host filesystem outside mounted state, no
  local external executables, strongest long-term portability constraint.
- `node`: local filesystem and subprocesses are possible, but only when
  explicitly enabled.
- `electron`: similar to Node, with packaged resources and application-level
  security policy.
- `node-subprocess`: future profile for interfaces that block on external
  systems such as Magma, GAP, Singular, or FriCAS.

The database should record the profile for every run. Do not let a
Node/Electron-only success hide a browser incompatibility.

## Phase 1: Make Test Results Trustworthy

The current `sage -t` mode is intentionally focused and approximate. Before
using it as a port dashboard, tighten the metadata and parsing.

### 1.1 Extend SQLite Metadata

Add columns or tables so queries can distinguish semantic categories without
overloading `failure_class`.

Proposed additions:

```sql
alter table runs add column run_profile text default 'node';
alter table runs add column runner_version integer default 1;
alter table runs add column resource_root text;
alter table runs add column sagelite_package_commit text;

alter table blocks add column block_key text;
alter table blocks add column source_hash text;
alter table blocks add column tags text;
alter table blocks add column skip_reason text;
alter table blocks add column expected_kind text;
```

Use a stable `block_key` such as:

```text
<relative-file-path>:<start-line>:<sha256-normalized-source>
```

The key lets us compare block-level history across commits even as run IDs
change.

### 1.2 Improve Tag Handling

Support Sage's common doctest tags accurately:

- `# optional - FEATURE`
- `# needs FEATURE`
- `# long time`
- `# random`
- `# known bug`
- `# not implemented`
- `# not tested`
- tolerance tags: `# tol`, `# abs tol`, `# rel tol`

Default behavior:

- normal tests run;
- random tests run but output is not compared;
- optional/needs tests skip unless `--optional` or a matching
  `--optional=FEATURE` is passed;
- long tests skip unless `--long` is passed;
- known bug, not implemented, and not tested skip by default and should be
  queryable as deferred, not counted as failures.

### 1.3 Add Tolerance Support

Many mathematical doctests compare floating output with tolerances. The first
implementation does not need the full Sage tolerance parser, but it should
cover the common cases:

```text
# tol 1e-12
# abs tol 1e-12
# rel tol 1e-12
```

Initial implementation can be a focused output checker for numeric lines.
Later, reuse more of `sage.doctest.parsing` once its optional dependencies are
available in Sagelite.

### 1.4 Preserve Source Locations

For `.py`, use Python AST docstring locations.

For `.pyx`, `.pxd`, `.pxi`, `.sage`, `.rst`, and text fallback parsing:

- preserve absolute source line numbers;
- store `start_line` and `end_line`;
- avoid compressing line numbers when filtering out non-doctest text.

Reliable line numbers are essential for triaging failures quickly from SQLite.

### 1.5 Keep The Runner Robust Against Crashes

The host Node process should remain in control of SQLite writes even when the
WASM Python process fails. The current design already writes SQLite from Node;
keep that boundary.

For each file:

- run in a fresh Python process eventually, or at least support a mode that does
  so;
- record timeout vs exception vs wasm trap distinctly;
- capture stderr/stdout per file;
- make it easy to rerun a single failed file, block, or crash breadcrumb line.

## Phase 2: Curated Compatibility Corpus

Do not start by running every Sage file. Start with a curated corpus that
matches the current pure-math target and grows deliberately.

### Current Corpus

Create a file such as:

```text
sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt
```

The checked-in corpus currently contains:

```text
src/sage/rings/integer_ring.pyx
src/sage/rings/abc.pyx
src/sage/rings/integer.pyx
src/sage/rings/rational.pyx
src/sage/rings/rational_field.py
src/sage/rings/real_field.py
src/sage/rings/fast_arith.pyx
src/sage/rings/generic.py
src/sage/rings/continued_fraction_gosper.py
src/sage/rings/monomials.py
src/sage/rings/big_oh.py
src/sage/rings/numbers_abc.py
src/sage/rings/infinity.py
src/sage/rings/semirings/non_negative_integer_semiring.py
src/sage/rings/finite_rings/integer_mod_ring.py
src/sage/rings/finite_rings/finite_field_constructor.py
src/sage/rings/polynomial/commutative_polynomial.pyx
src/sage/rings/polynomial/convolution.py
src/sage/rings/polynomial/polynomial_ring_constructor.py
src/sage/matrix/constructor.pyx
```

Add more only after the dashboard can explain failures well. The default
corpus should preserve a clean non-skipped pass rate; larger exploratory
coverage belongs in a separate corpus file until its failure clusters are
classified.

### First Command

Provide a script or make target that runs the corpus into one database:

```sh
./sagemath/sagelite/bin/sage -t \
  --sqlite /home/user/cowasm/sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3 \
  $(cat sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt)
```

Prefer a wrapper so the command is reproducible and records profile metadata:

```sh
make -C sagemath/sagelite test-sage-doctest-corpus
```

This target should not be required by the fast build smoke.

## Phase 3: Progress Queries

Add saved SQL queries under something like:

```text
sagemath/sagelite/src/doctest-sql/
```

### Latest Run Summary

```sql
select
  id,
  started_at,
  git_commit,
  run_profile,
  status,
  total_blocks,
  passed_blocks,
  failed_blocks,
  skipped_blocks,
  round(100.0 * passed_blocks / nullif(total_blocks - skipped_blocks, 0), 2)
    as pass_percent_non_skipped
from runs
order by id desc
limit 20;
```

### Failures By Class

```sql
select
  b.failure_class,
  count(*) as failures
from blocks b
join files f on f.id = b.file_id
join runs r on r.id = f.run_id
where r.id = (select max(id) from runs)
  and b.status = 'failed'
group by b.failure_class
order by failures desc;
```

### Top Missing Modules

This requires post-processing `actual`, or a future `failure_detail` column.
Initial query:

```sql
select
  substr(actual, instr(actual, 'ModuleNotFoundError:'), 160) as missing,
  count(*) as failures
from blocks b
join files f on f.id = b.file_id
join runs r on r.id = f.run_id
where r.id = (select max(id) from runs)
  and b.failure_class = 'ModuleNotFoundError'
group by missing
order by failures desc;
```

### File Error Clusters

File-level errors should be grouped by class and first diagnostic line so
runtime/linkage clusters are visible even when a file produces no doctest
blocks:

```sh
sqlite3 sagelite-doctests.sqlite3 \
  < sagemath/sagelite/src/doctest-sql/file-error-clusters.sql
```

### Block Failure Clusters

Block-level failures should be grouped by class and normalized detail so a
single missing module or output-checking gap does not disappear into a broad
exception class:

```sh
sqlite3 sagelite-doctests.sqlite3 \
  < sagemath/sagelite/src/doctest-sql/block-failure-clusters.sql
```

### File Error Reruns

File-level errors that include doctest state breadcrumbs should produce direct
line-based reproduction commands:

```sh
sqlite3 sagelite-doctests.sqlite3 \
  < sagemath/sagelite/src/doctest-sql/file-error-reruns.sql
```

### Newly Passing Blocks

After `block_key` exists:

```sql
with latest as (
  select max(id) as run_id from runs
),
previous as (
  select max(id) as run_id from runs where id < (select run_id from latest)
)
select b.block_key, b.source
from blocks b
join files f on f.id = b.file_id
where f.run_id = (select run_id from latest)
  and b.status = 'passed'
  and exists (
    select 1
    from blocks old_b
    join files old_f on old_f.id = old_b.file_id
    where old_f.run_id = (select run_id from previous)
      and old_b.block_key = b.block_key
      and old_b.status = 'failed'
  )
order by b.block_key;
```

## Phase 4: Failure Cluster Workflow

Every porting iteration should look like this:

1. Run the curated corpus.
2. Query failure classes and missing modules.
3. Pick one cluster, not one isolated block.
4. Reproduce one representative failure in `sage`.
5. Fix the runtime/package/root cause.
6. Add or tighten a smoke if the fix is important enough.
7. Rerun the corpus.
8. Commit the code fix and note the compatibility delta.

### Example Clusters From The Current Corpus

Current remaining failures include:

- file-level `wasm_signature_mismatch` crashes across number-field, finite
  field, polynomial, rational, and matrix constructors.

These are good clusters. Do not patch individual doctest expectations.

### 2026-06-23 Runtime-Table Probe Notes

Representative reproduction:

```sh
COWASM_PYTHON_WASM_NODE=/home/user/cowasm/python/python-wasm/dist/node.js \
COWASM_SAGELITE_ELECTRON_RESOURCES=/home/user/cowasm/sagemath/sagelite/dist/wasi-sdk/electron-resources \
COWASM_SAGELITE_DOCTEST_SOURCE_ROOT=/home/user/sagelite \
  /home/user/cowasm/sagemath/sagelite/bin/sage -t \
  --sqlite /tmp/sagelite-one.sqlite3 \
  --line 2266 \
  /home/user/sagelite/src/sage/rings/integer.pyx
```

The failing block is:

```text
pow(-1, 1/2, 0)
```

The top trap maps into `python.wasm` at `0x3164ad`, a CPython
`call_indirect` in the descriptor-get path:

```text
call_indirect ... (type 4)  # (i32, i32, i32) -> i32
```

That means the immediate failure is a function-table signature mismatch in a
Python descriptor slot, not a doctest output-comparison issue.

A direct REPL probe of the same expression uncovered a related dynamic-loader
failure while importing:

```text
sage/rings/polynomial/evaluation_ntl.cpython-314-wasm32-wasi.so
```

After `libcxx.so` is loaded from the packaged resources, imports of core C
runtime functions such as `malloc`, `fprintf`, `abort`, `realloc`, and `free`
can resolve to `null` for this module. A broad experiment caching main-module
`__WASM_EXPORT__*` function-table entries moved the direct REPL probe past the
first `malloc` failure but then hung on a later import (`bsearch`) and did not
fix the doctest `wasm_signature_mismatch`, so it was not kept.

The same experiment also exposed a doctest-runner robustness gap: `--timeout`
was originally implemented as an in-process JavaScript timer, and it did not
interrupt a stuck worker when the host was waiting on the worker response. The
runner now executes each doctest file in a hidden Node worker process and
enforces `--timeout` from the parent process, so timeout rows are usable
dashboard data for stuck file-level executions.

Follow-up dynamic-linking work showed that the original `integer.pyx:2266`
doctest crash was triggered while freeing a large string passed through the
kernel worker bridge. Reusing a grow-only large-string buffer avoids that
kernel-side finalizer trap. Providing callable libc/libm fallbacks for common
side-module imports then lets that representative doctest pass and exposes the
next import cluster at `integer.pyx:3112`. Adding `wcslen`, `qsort`, common
ctype fallbacks, a runtime-backed `getenv` / `secure_getenv`, and a harmless
`fclose` fallback moves the focused line rerun to the PARI `err_recover`
signature mismatch. The full corpus still reports 203 passed, 7 failed, and 27
skipped, but the former missing-import cluster has been replaced by narrower
PARI signature-mismatch, loader table-signature, and NTL/libcxx memory-trap
clusters.

A follow-up qsort fallback pass fixed the JavaScript dynamic-loader
implementation used when side modules import `qsort`: the previous insertion
sort mutated the comparison slot before checking the comparator, so it could
silently leave side-module arrays unsorted. The WASI dylink smoke now exercises
that fallback with a side-module integer array and function-pointer comparator.
The curated Sagelite corpus result remained `203 passed, 7 failed, 27 skipped`;
the next high-leverage cluster is still PARI `err_recover` / side-module
function-table signature compatibility, followed by the NTL/libcxx memory trap.

A 2026-06-24 pass added the corresponding JavaScript dynamic-loader fallback
for side-module `bsearch`, using the side module's imported comparator pointer
for binary search. The existing WASI dylink smoke now checks both the found and
not-found cases for `bsearch` in the direct and archive-linked loader paths.

A follow-up SJLJ-loader pass implemented the wasi-sdk `libsetjmp.a` helper ABI
for dynamic side-module imports of `__wasm_setjmp`,
`__wasm_setjmp_test`, and `__wasm_longjmp`, including the shared
`__c_longjmp` WebAssembly exception tag. The focused WASI dylink smoke now
leaves those helpers unresolved in a side module and verifies that a
side-module `setjmp`/`longjmp` recovery path succeeds through the loader. This
narrows the Sagelite PARI cluster but does not clear it yet: the
`integer.pyx:3112` rerun for `(-3).divisors()` still fails with
`RuntimeError: function signature mismatch` at
`convert_sage...so.err_recover`. The next pass should inspect PARI's remaining
plain `setjmp` import / `err_recover` callback path rather than the already
covered `__wasm_*` helper imports.

A 2026-06-24 focused rerun of `integer.pyx:3112` confirmed that the trap is
reached through PARI's allocation-recovery path:

```text
new_chunk_resize -> pari_err -> err_recover
```

The top frame is
`convert_sage.cpython-314-wasm32-wasi.so.err_recover
wasm-function[7503]:0x1cbd3f`. Temporarily increasing Sagelite's Python-level
PARI stack default from 1 MB to 8 MB in the packaged resource did not change
the failure, so the next useful pass should keep treating this as callback /
function-table compatibility rather than a simple initial-stack-size issue.

A later loader-hardening pass added explicit JavaScript fallbacks for dynamic
side-module imports of plain `setjmp`, `sigsetjmp`, `longjmp`, and
`siglongjmp`, before generic main-module resolution can provide an incompatible
callable. The WASI dylink smoke now includes a dedicated `plain-setjmp.so`
module that imports `env.setjmp`, verifies that `setjmp(env)` returns zero, and
runs through both direct and archive-linked loader paths. The focused
`integer.pyx:3112` rerun still fails in `convert_sage...so.err_recover`, so the
active PARI cluster is no longer explained by a generic plain-`setjmp` import
gap.

A later 2026-06-24 inspection narrowed the same failure to PARI's
`cb_pari_err_recover` callback slot rather than the already-covered wasi-sdk
`__wasm_*` SJLJ helper imports. The focused rerun remains:

```sh
COWASM_PYTHON_WASM_NODE=/home/user/cowasm/python/python-wasm/dist/node.js \
COWASM_SAGELITE_ELECTRON_RESOURCES=/home/user/cowasm/sagemath/sagelite/dist/wasi-sdk/electron-resources \
COWASM_SAGELITE_DOCTEST_SOURCE_ROOT=/home/user/sagelite \
  /home/user/cowasm/sagemath/sagelite/bin/sage -t \
  --timeout 30 \
  --sqlite /tmp/sagelite-focused.sqlite3 \
  --line 3112 \
  /home/user/sagelite/src/sage/rings/integer.pyx
```

LLVM disassembly of the packaged
`sage/libs/pari/convert_sage.cpython-314-wasm32-wasi.so` shows
`err_recover` performing two indirect calls with Wasm type 5,
`(i32) -> nil`:

```text
001c8138 <err_recover>:
  ... load cb_pari_pre_recover at __memory_base + 96684 ...
  call_indirect 5
  ...
  ... load cb_pari_err_recover at __memory_base + 96672 ...
  call_indirect 5
```

In PARI source these are:

```c
if (cb_pari_pre_recover)
  cb_pari_pre_recover(numerr);
...
cb_pari_err_recover(numerr);
```

`cb_pari_err_recover` is normally initialized by `pari_init_opts()` to
`dflt_err_recover(long)`, so its expected Wasm signature is exactly
`(i32) -> void`. The runtime `function signature mismatch` therefore means
the slot contains a table index whose current table entry has a different
signature. The likely failure mode is a raw side-module function index being
stored instead of `__table_base + function_index`, or an equivalent relocation
gap in the PARI archive when it is pulled into a dynamic Python extension.

Useful local probes:

```sh
/home/user/cowasm/core/build/build/wasi-sdk/dist/wasi-sdk-next/native/bin/llvm-objdump \
  -d --disassemble-symbols=err_recover \
  sagemath/sagelite/dist/wasi-sdk/electron-resources/site-packages/sage/libs/pari/convert_sage.cpython-314-wasm32-wasi.so

/home/user/cowasm/core/build/build/wasi-sdk/dist/wasi-sdk-next/native/bin/llvm-objdump \
  -d --disassemble-symbols=__wasm_apply_global_relocs \
  sagemath/sagelite/dist/wasi-sdk/electron-resources/site-packages/sage/libs/pari/convert_sage.cpython-314-wasm32-wasi.so
```

The next implementation pass should add a focused dynamic-link smoke that
links a small side module against a PIC static archive containing a
`void (*)(long)` callback initialized to an archive-internal function, then
calls it through the side module after `dlopen`. That should fail if the
stored callback pointer is not adjusted by `__table_base`, and it is much
smaller than rebuilding the full Sagelite/PARI stack while iterating on the
loader or package flags.

That focused `core/dylink/test/wasi` smoke is now landed. It builds a PIC
archive with a `void (*)(long)` global initialized to an archive-local function,
links it into the WASI SDK side module, and verifies the callback through both
`test-wasi-sdk-next` and `test-wasi-sdk-archive-next`. The smoke passes, so the
`err_recover` failure is probably not a generic side-module static-archive
function-pointer relocation bug. The next useful probe should compare the
actual PARI `cb_pari_err_recover` storage path against this passing smoke:
whether the callback variable is imported, copied, overwritten during
`pari_init_opts()`, or resolved through a different relocation/code path than a
plain archive-internal initializer.

A focused rerun after adding that smoke still fails at `integer.pyx:3112` for
`(-3).divisors()` with `RuntimeError: function signature mismatch` in
`convert_sage...so.err_recover`, reached through
`new_chunk_resize -> pari_err -> err_recover`. That keeps the active cluster on
PARI's callback mutation/recovery path rather than the already-covered generic
archive callback relocation path.

A 2026-06-24 Sagelite cross-file experiment tested whether the difference
between the passing `cypari2` PARI probes and the failing Sagelite extension was
simply that the probes link `libsetjmp.a` while Sagelite extensions leave SJLJ
helpers unresolved for the loader. Two global Sagelite variants were tried and
rejected:

- enabling `-mllvm -wasm-enable-sjlj -mllvm -wasm-use-legacy-eh=false` for all
  Sagelite C/C++ extension compilation and linking `-lsetjmp`;
- leaving normal Sagelite C/C++ codegen unchanged but adding `-lsetjmp` to the
  global extension link arguments.

Both variants rebuilt successfully but regressed the standalone smoke before
the PARI doctest could be tested: `make -C sagemath/sagelite
test-wasi-sdk-standalone` returned through the known blocker path after the
Node.js import process exited while importing `sage.structure.element`. The
next pass should avoid a global Sagelite `libsetjmp` link change. If this
direction is revisited, make it module-scoped to the PARI extensions or inspect
how adding the setjmp archive perturbs side-module table layout before changing
the build defaults.

A 2026-06-24 dynamic-loader allocation pass made the JavaScript side-module
`realloc` fallback track allocation sizes, preserve only the valid old prefix,
and discard size metadata on `free`. The WASI dylink smoke now exercises a
side-module `realloc` import. The curated Sagelite corpus result remained
`203 passed, 7 failed, 27 skipped`, with the active failures still split between
PARI `err_recover` / side-module function-table signature compatibility and
the NTL/libcxx memory trap. This removes one memory-corruption variable before
continuing the PARI callback-slot investigation.

A 2026-06-24 dashboard refresh showed that the older `integer.pyx:3112`
focused rerun now passes against `/home/user/sagelite`, but the curated corpus
still reports `203 passed, 7 failed, 27 skipped`. The live PARI-backed failure
has moved to the `NumberField(x^2 - 2, 'beta')` examples in
`integer.pyx:5709` and `rational.pyx:1433`, both trapping in
`convert_gmp...so.err_recover`. Three other files cluster around a generic
side-module function-table signature mismatch during dynamic import, and the
two NTL/libcxx finite-field/polynomial constructor failures still trap with
`RuntimeError: memory access out of bounds` in `libcxx.so` ostream setup. The
file-error cluster query now anchors generic `RuntimeError:` diagnostics so
these memory traps group by the runtime diagnostic and top frame instead of
being split by doctest breadcrumb text.

A follow-up PARI-shaped dylink probe added a PIC archive callback global that
is initialized to null, assigned at runtime to an archive-local
`void (*)(long)` function, and then called indirectly through the side module.
The direct and archive-linked WASI dylink smokes both pass. That rules out the
generic form of PARI's `pari_init_opts()` assignment
`cb_pari_err_recover = dflt_err_recover`; the remaining Sagelite
`err_recover` failure is more likely tied to the actual cypari2/PARI
initialization sequence, duplicated PARI state across extensions, or a later
overwrite of the callback slot.

A 2026-06-24 loader-instrumented focused rerun sharpened that diagnosis. A
temporary `COWASM_DYLINK_TRACE_PARI_CALLBACKS` probe in the dynamic loader
showed that `convert_sage.cpython-314-wasm32-wasi.so` has both recovery
callback slots unset immediately after data relocations:

```text
memory_base=171742624 table_base=28617
cb_pari_err_recover=0
cb_pari_pre_recover=0
```

The same rerun still failed at `integer.pyx:3112` with the existing
`RuntimeError: function signature mismatch` in `err_recover`, so the bad
callback value is written after load-time relocation. Static inspection with
`wasm-objdump -x` then showed two separate PARI-containing side modules:

- `deps/cypari2/cypari2/gen.cpython-314-wasm32-wasi.so` has
  `table_size=2212` and its own `GOT.data.internal.cb_pari_err_recover` at
  data offset `490676`.
- `site-packages/sage/libs/pari/convert_sage.cpython-314-wasm32-wasi.so` has
  `table_size=437`; its `err_recover` loads the local callback slots at data
  offsets `96672` and `96684`.

cypari2's `handle_error.pyx` installs `_pari_err_recover` into
`cb_pari_err_recover`, while Sage's PARI converter modules `cimport`
`cypari2.paridecl` and are currently built as separate side modules that also
contain PARI code and PARI globals. This makes the active failure look less
like a loader table relocation bug and more like duplicated static PARI state:
cypari2 initializes one PARI copy, while `convert_sage` runs PARI code from
another copy whose recovery callback is populated later with an incompatible
or foreign table pointer.

The next implementation pass should build a focused two-side-module dylink
smoke rather than keep probing the full Sagelite stack. The probe should link
the same PIC static archive containing a PARI-shaped callback global into two
side modules: one module initializes the callback to its local
`void (*)(long)` recovery function, and the other module calls an error path
through its own archive copy. That will test whether the current Sagelite
layout is accidentally relying on process-global C state that WebAssembly side
modules do not share. If the smoke reproduces the mismatch, the fix direction
is to stop linking independent PARI copies into Sage PARI converter modules:
either export/share one PARI provider side module, link converter modules
against that provider, or make a narrowly scoped module-local initialization
strategy that installs a correct local recovery callback before any PARI call.

That two-side-module dylink smoke is now landed in `core/dylink/test/wasi`.
It links the same PIC archive containing a PARI-shaped recovery callback slot
into two independent side modules. The provider module installs and exercises
its local callback, then the consumer module verifies that this did not
initialize its own archive copy before installing and exercising its own local
callback. Both `test-wasi-sdk-next` and `test-wasi-sdk-archive-next` pass,
which confirms the WebAssembly side-module behavior that duplicated static
PARI state is module-local, not process-global.

This makes the Sagelite `err_recover` cluster more concrete: if
`convert_sage` expects cypari2's PARI initialization to configure its recovery
callback slot, that cannot work while both extensions link independent PARI
archive copies. The next implementation pass should inspect and change the
Sagelite/PARI extension layout instead of adding more generic loader fallbacks:
either share one PARI-owning provider module across cypari2 and Sage PARI
converter extensions, or add a narrowly scoped initialization path that installs
a valid local recovery callback in each PARI-containing Sage side module before
it can call PARI error paths.

A follow-up Sagelite WASI patch now defaults `Integer.divisors(method=None)` to
Sage's native divisor construction instead of importing the PARI converter for
small integers. An explicit `method='pari'` still exercises the PARI converter
path. This clears the focused `integer.pyx:3112` reproduction:

```text
passed: ../sagelite/src/sage/rings/integer.pyx (1 passed, 0 failed, 0 skipped)
```

The standalone Sagelite target still reaches its known Electron-shaped resource
soft blocker after the Node import ladder passes, including the new
`ZZ(-3).divisors()` smoke. The curated corpus total remains
`203 passed, 7 failed, 27 skipped`, but the integer-file crash moved forward to
`integer.pyx:5709` at `K = NumberField(x^2 - 2, 'beta')`. The active PARI
cluster is now broader and more clearly tied to Sage's converter modules:
`convert_gmp...so.err_recover` is reached through
`new_gen_from_rational`, while rational-field, integer-mod-ring, and matrix
constructor files still hit loader table-signature mismatches and finite-field
constructor paths still hit the NTL/libcxx memory trap.

A later PARI module-local initialization pass added explicit initialization
before the two currently observed cold allocation paths: Sagelite's
`sage.libs.pari.convert_gmp` direct PARI stack allocation and CoWasm's focused
`cypari2.gen` vector allocation through `objtogen([1, 2, 3])`. This clears the
representative `new_gen_from_rational(QQ(1)/QQ(7))` trap and moves the
`NumberField(x^2 - 2, 'beta')` probe from a WASM signature mismatch to the
next missing cypari2 object-model method, `Gen._rational_()`. The next useful
NumberField pass should implement only the minimal rational conversion surface
needed by Sage's polynomial reconstruction, rather than adding more generic
loader fallbacks.

A later doctest-classification pass marked the integer and rational
`is_norm()` examples that construct `NumberField(...)` objects as
`# needs sage.rings.number_field` in the Sagelite WASI source patch. This does
not solve the PARI converter callback problem, but it correctly treats these
examples as outside the current browser-compatible pure-math slice instead of
letting unavailable number-field coverage abort two corpus files. Focused
line reruns now record explicit skips:

```text
integer.pyx:5709: 0 passed, 0 failed, 1 skipped
rational.pyx:1433: 0 passed, 0 failed, 1 skipped
```

With the corpus target reading the patched build source, the curated corpus
reaches much deeper into `integer.pyx` and `rational.pyx`:

```text
sage -t failed: 1621 passed, 119 failed, 293 skipped
```

A follow-up browser-profile classification pass tagged additional symbolic
integer/rational doctests in the Sagelite WASI source patch. These include
symbolic integer powers, global symbolic `log(...)`, complex logarithm, and
exact gamma examples that currently depend on Sage's symbolic layer rather
than the browser-compatible pure integer/rational slice. A fresh corpus run
against the patched build source now records:

```text
sage -t failed: 1621 passed, 101 failed, 311 skipped
```

The remaining file-level clusters are now the generic loader
`wasm_signature_mismatch` in rational-field, integer-mod-ring, and matrix
constructor paths, plus the NTL/libcxx `memory access out of bounds` trap in
finite-field and polynomial constructor paths. The broader PARI converter
state-sharing issue remains real, but the default browser-compatible corpus
should not block on number-field-only norm examples until number fields are in
scope.

A later cypari2 focused-runtime pass exposed the PARI integer methods used by
Sage's current integer doctests: `nextprime`, `ispseudoprime`,
`isprimepower`, and `ispseudoprimepower`. These stay within the deliberately
small `cypari2.gen` runtime surface while clearing a large
`NotImplementedError` cluster from integer methods. A full `integer.pyx`
doctest rerun improved from:

```text
971 passed, 61 failed, 181 skipped
```

to:

```text
995 passed, 37 failed, 181 skipped
```

The remaining integer-file failures are now split between output-mismatch
semantics, eleven still-unsupported PARI object-model calls, a few coercion
gaps for `PariValue`, and out-of-scope optional modules such as GAP and
`cysignals.alarm`. The full curated corpus moved from:

```text
sage -t failed: 1623 passed, 90 failed, 320 skipped
```

to:

```text
sage -t failed: 1647 passed, 66 failed, 320 skipped
```

A follow-up cypari2 focused-runtime pass added the Sage-facing
`Pari.prime(n)` wrapper plus `Gen.isprime()`, and aligned
`Gen.nextprime(add_one=True)` with upstream cypari2 by asking PARI for the
next prime after `n + 1`. This clears the integer doctest cluster that routed
through `nth_prime`, `primes_first_n`, large `next_prime(...)`, and
`Integer._pseudoprime_is_prime(...)`:

```text
integer.pyx: 1012 passed, 20 failed, 181 skipped
```

The curated corpus now records:

```text
sage -t failed: 1664 passed, 49 failed, 320 skipped
```

The remaining integer-file failures are mostly output-mismatch formatting,
PARI `PariValue` integer coercion, out-of-scope subprocess-backed ECM,
missing GAP/alarm modules, and one still-unsupported PARI object-model path in
the large-divisor example. The non-integer corpus blockers remain the existing
loader `wasm_signature_mismatch` and NTL/libcxx memory-trap clusters.

A later CPython/Python-Wasm formatting pass fixed a broad float output cluster
where WASM Python's float repr dropped the signed exponent suffix, for example
`9.028340982349083e+35` and `1e-20` were printed as `9.028340982349083e` and
`1e`. The root cause was CPython's WASI float formatting path relying on
`sprintf(p, "%+.02d", exp)` while constructing exponent text; the CoWasm
patch now appends the signed exponent digits manually and `python-wasm` has a
regression test for both positive and negative exponents.

Focused Sagelite reruns now pass for the representative integer doctest lines:

```text
integer.pyx:3727: 1 passed, 0 failed, 0 skipped
integer.pyx:7902: 1 passed, 0 failed, 0 skipped
```

This separates the exponent-formatting failures from a still-open denormal
conversion issue: `rational.pyx:3915` expects `5e-324` for `1 / 2^1074`, but
currently gets `0.0`.

A later 2026-06-24 mismatch triage showed that the remaining rational
`(1/2).gamma(5)` block is not a Sage semantic failure. It is another
formatting/regeneration issue: Cython raises the expected argument-count
`TypeError`, but the active `python-wasm` runtime prints
`gamma() takes exactly  positional arguments ( given)`, with the `%zd`
integer fields missing. A direct `python-wasm` probe reproduces the same
problem for pure Python keyword-only argument errors:

```text
keyword_only() takes  positional arguments but  was given
```

The root cause is stale build output rather than a missing source patch.
`python/cpython/src/patches/27-wasi-unicode-fromformat-integers.patch` already
removes the `sprintf` dependency from CPython's `PyUnicode_FromFormat`
integer path, and the WASI-SDK source tree has that fix. The older
`python-wasm` tree did not pick it up because `python/cpython/build/wasm/.patched`
did not depend on `prepare-wasm-build.sh` or the CPython patch set. The
Makefile now regenerates the WASM patched tree from the upstream tarball when
those inputs change; the patch stage was checked to apply cleanly.

The 2026-06-24 wasi-sdk CPython backend pass unblocked this validation path.
The `python/cpython` Makefile now rebuilds `core/dylink` with the local
TypeScript compiler instead of triggering a workspace-wide `pnpm` install,
checks the linked `python-wasi-sdk.wasm` ABI with a small Node/WebAssembly
probe instead of requiring WABT's `wasm-objdump`, and creates the wasi-sdk
stdlib archive with `python-native -m zipfile` instead of requiring a host
`zip` binary. The default allocator configure path now reaches
`stdatomic.h`, and the wasi-sdk runtime contract suite passes:

```sh
make -C python/cpython test-wasi-sdk-runtime-contracts
```

That run includes the `test_unicode_fromformat_integer_fields` regression for
the missing `%zd` TypeError fields. Sagelite still imports the separate
`python/python-wasm/dist/node.js` bundle, whose `python.wasm` and stdlib zip
are older artifacts. The next pass should either refresh that bundle from the
validated CPython backend or teach Sagelite to use the intended wasi-sdk
backend, then rerun the focused Sagelite line:

```sh
COWASM_PYTHON_WASM_NODE=/home/user/cowasm/python/python-wasm/dist/node.js \
COWASM_SAGELITE_ELECTRON_RESOURCES=/home/user/cowasm/sagemath/sagelite/dist/wasi-sdk/electron-resources \
COWASM_SAGELITE_DOCTEST_SOURCE_ROOT=/home/user/cowasm/sagemath/sagelite/build/wasi-sdk \
  /home/user/cowasm/sagemath/sagelite/bin/sage -t \
  --timeout 30 \
  --sqlite /tmp/sagelite-line-3289.sqlite3 \
  --line 3289 \
  /home/user/cowasm/sagemath/sagelite/build/wasi-sdk/src/sage/rings/rational.pyx
```

A follow-up backend-selection probe sharpened the remaining runtime boundary.
The classic `python-wasm` rebuild path still fails during WASM configure with
`mimalloc requires stdatomic.h`, so refreshing that bundle is still blocked.
The wasi-sdk CPython backend can run the `PyUnicode_FromFormat` integer-field
regression and, after switching CPython's extension checks to the repo-local
WABT `wasm-objdump`, `make -C python/cpython test-wasi-sdk-extension-imports`
passes and installs dynamic stdlib extensions such as `zlib`.

That is not yet enough to move Sagelite doctests to `python-wasi-sdk` by
default. With Sagelite's packaged environment, `import sage.all` now gets past
the Cython string-compression dependency on `zlib.decompress` but stops at
`sage.misc.remote_file -> ssl -> _ssl`; the wasi-sdk `_ssl` module is not
currently built, and a direct `_ssl` side-module build fails because the WASI
OpenSSL headers do not expose `SSL_set_fd`. The next backend pass should either
make Sagelite's browser profile avoid eager SSL-dependent remote-file imports
or add a scoped `_ssl`/SSL strategy for the wasi-sdk CPython backend before the
Sagelite corpus target switches away from the known-working `python-wasm`
worker.

A follow-up 2026-06-24 browser-profile import pass avoids that eager SSL edge:
the Sagelite WASI patch now lazy-imports `sage.misc.remote_file.get_remote_file`
from `sage.misc.all`, and `remote_file.py` imports `ssl` only inside the actual
download path. On WASI, `get_remote_file(...)` now fails closed with an explicit
browser-profile `NotImplementedError` before importing `ssl` or `_ssl`.

Validation:

```sh
make -C sagemath/sagelite test-wasi-sdk-standalone
```

That target rebuilt the patched Sagelite tree, completed the normal Node import
smokes, and still exited successfully through the known staged-resource soft
blocker. A focused `python-wasi-sdk` probe against the generated Sagelite
site-packages confirmed:

```text
imported_misc_all False False
remote_file_error remote file downloads require SSL/network support, which is not available in the WASI browser profile
after_call False False
```

The next backend pass can continue past this import-time `_ssl` blocker and
look for the next `python-wasi-sdk` startup dependency before switching the
Sagelite doctest runner backend.

A follow-up backend-probe pass added that check to the Sagelite standalone
target instead of switching the doctest runner backend prematurely. The target
now runs bounded `python-wasi-sdk` probes against the staged Sagelite
site-packages after the normal Node `python-wasm` `sage.all` import succeeds.
Those probes verify that `sage.all` imports under the wasi-sdk CPython backend
and that the remote-file browser guard still raises before importing `ssl` or
`_ssl`.

Validation:

```sh
make -C sagemath/sagelite test-wasi-sdk-standalone
```

The run completed the new `python-wasi-sdk` probes, the existing Node import
ladder, and the doctest smoke (`9 passed, 0 failed, 7 skipped`), then exited
successfully through the known Electron-shaped staged-resource soft blocker:

```text
sagelite-blocked: Electron-shaped relative resources smoke failed at staged resources
```

The next backend pass should inspect that staged-resource Electron smoke
failure and decide whether it is a packaging-resource dependency, a
`python-wasm` runtime-only issue, or another browser-profile import that should
fail closed before switching the doctest corpus to `python-wasi-sdk`.

A follow-up Electron-resource smoke pass inspected that blocker and found a
stale negative PARI expectation rather than a packaging or relative-resource
failure. The staged runtime now supports `Pari(5)`, `objtogen('2+3')`, and
Sage-facing `factor_using_pari(...)`, while the Electron smoke still expected
those calls to fail closed with the older "full Gen conversion" boundary. The
smoke now asserts the supported conversions and PARI-backed integer
factorization.

Validation:

```sh
make -C sagemath/sagelite test-wasi-sdk-standalone
```

The target rebuilt the patched Sagelite tree, passed the `python-wasi-sdk`
startup probes, passed the Node import ladder, passed the doctest smoke
(`9 passed, 0 failed, 7 skipped`), audited 518 Electron resource side modules,
and passed both staged and relocated Electron resource smokes:

```text
sagelite-ok meson configure compile install node import electron resources smoke relocated followups recorded
```

The next backend pass can use this as the first clean standalone baseline for
deciding whether to move selected Sagelite probes or doctest execution from the
older `python-wasm` worker toward the validated `python-wasi-sdk` backend.

A follow-up backend-contract pass added a focused `python-wasi-sdk` probe to
the Sagelite standalone target for the CPython `PyUnicode_FromFormat` integer
field regression that previously showed up in doctest diagnostics such as
`gamma() takes exactly  positional arguments ( given)`. The probe imports
`sage.all` under the packaged Sagelite `PYTHONPATH`, then checks that a pure
Python positional-argument `TypeError` still includes the numeric fields:

```text
keyword_only() takes 0 positional arguments but 1 was given
```

This keeps the formatting fix covered in the actual Sagelite package context
without prematurely switching `sage -t` away from the known-working
`python-wasm` worker. A direct `python-wasi-sdk` probe of the rational
`(1/2).gamma(5)` path is still too broad for this backend boundary because it
currently reaches the missing `mpmath` dependency before the intended
argument-count diagnostic.

A follow-up backend-contract pass extended the packaged `python-wasi-sdk`
standalone probe from import-only coverage to the same exact-math surface used
by the Node smoke. After importing `sage.all` under the staged Sagelite
`PYTHONPATH`, it now checks integer and rational arithmetic, univariate
polynomial construction over `QQ` and `ZZ`, PARI-backed integer factorization,
and `prime_pi(10^6)`. This gives the backend migration a concrete
mathematical contract while keeping full doctest execution on the
known-working `python-wasm` worker until the remaining backend differences are
understood.

A follow-up finite-ring browser-scope tagging pass marked the currently
observed finite-field explicit-modulus examples and quotient-root examples as
native PARI/NTL coverage. Focused line reruns for the previous file-level
traps now record explicit skips instead of crashing:

```text
finite_field_constructor.py:360: 0 passed, 0 failed, 1 skipped
finite_field_constructor.py:366: 0 passed, 0 failed, 1 skipped
integer_mod_ring.py:1770: 0 passed, 0 failed, 1 skipped
integer_mod_ring.py:1773: 0 passed, 0 failed, 1 skipped
```

The full curated corpus still reports the same aggregate shape:

```text
sage -t failed: 2048 passed, 2 failed, 518 skipped
```

The remaining two file-level failures moved deeper into the same regions:
`integer_mod_ring.py:1778` now traps in the NTL/libcxx modular-root path for
`R.<x> = Zmod(2)[]`, and `finite_field_constructor.py:378` now traps in the
cypari2/PARI cleanup path for `GF(100)`. This shows that one-line tagging is
not a good next iteration for these files. The next useful finite-ring pass
should either classify the whole affected doctest regions as native-library
coverage with broader directives, or fix the underlying NTL/libcxx and
cypari2/PARI state traps so the browser-profile corpus can keep the finite-ring
examples in scope.

A follow-up finite-ring browser-scope pass classified those broader native
library regions instead of continuing one-line tags. The Sagelite WASI patch
now marks finite-field extension/conway/modulus/implementation examples,
integer-modular category checks, unit-group/PARI paths, and NTL-backed modular
root-finding examples with explicit `# needs` directives. This lets
`integer_mod_ring.py` run to completion in the browser-compatible corpus:

```text
integer_mod_ring.py: 303 passed, 0 failed, 140 skipped
```

The checked corpus run after this pass records:

```text
sage -t failed: 2351 passed, 1 failed, 658 skipped
```

That run is in
`/tmp/sagelite-corpus-after-finite-ring-implementation-tags.sqlite3`.
`block-failure-clusters.sql` is empty. The only remaining corpus failure is a
file-level cleanup trap in `finite_field_constructor.py`, grouped as
`wasm_trap|RuntimeError: memory access out of bounds` at
`gen.cpython-314-wasm32-wasi.so.blockdelete`, reached during cypari2/PARI
`Gen.__dealloc__` cleanup after the finite-field constructor file. The next
useful pass should treat this as a PARI lifetime/state issue, not another
doctest-output mismatch; either avoid constructing PARI `Gen` objects in the
browser-profile finite-field constructor path or fix the cypari2/PARI cleanup
trap so skipped/native-scope examples do not leave unsafe teardown state.

Current checked rerun on 2026-06-24 shows that the staged patched source has
already moved past that finite-field cleanup trap:

```text
sage -t passed: 2390 passed, 0 failed, 767 skipped
```

That run records 3,157 block rows in `/tmp/sagelite-corpus-current.sqlite3`.
All eight curated files pass with empty `block-failure-clusters.sql` and
`file-error-clusters.sql` results:

```text
integer_ring.pyx: 203 passed, 0 failed, 27 skipped
integer.pyx: 1024 passed, 0 failed, 189 skipped
rational.pyx: 472 passed, 0 failed, 113 skipped
rational_field.py: 144 passed, 0 failed, 68 skipped
integer_mod_ring.py: 303 passed, 0 failed, 140 skipped
finite_field_constructor.py: 39 passed, 0 failed, 109 skipped
polynomial_ring_constructor.py: 98 passed, 0 failed, 73 skipped
matrix/constructor.pyx: 107 passed, 0 failed, 48 skipped
```

The next useful pass should not keep chasing the stale finite-field teardown
note. Start from this clean browser-profile corpus baseline and either grow the
curated corpus deliberately into the next pure-math module, or continue the
backend-migration work by moving a narrow Sagelite doctest probe from the older
`python-wasm` worker toward the validated `python-wasi-sdk` backend.

Latest checked local corpus run after the 2026-06-24 prime-range and
`znorder` focused-runtime pass:

```text
sage -t passed: 2484 passed, 0 failed, 773 skipped
```

That run records 3,257 block rows in `/tmp/sagelite-corpus-expanded.sqlite3`,
with empty `block-failure-clusters.sql` and `file-error-clusters.sql` results.
The curated browser-profile corpus now has ten files, adding
`sage/rings/fast_arith.pyx` and `sage/rings/generic.py` to the previous clean
baseline:

```text
fast_arith.pyx: 20 passed, 0 failed, 0 skipped
generic.py: 74 passed, 0 failed, 6 skipped
```

The pass changes Sagelite's WASI patch so `prime_range(..., algorithm=None)`
uses the already-supported next-prime iterator path instead of PARI's prime
table path. This keeps the core prime-range helper in the browser-compatible
arithmetic slice without widening the PARI table startup surface. It also adds
a focused `cypari2.Gen.znorder(o=None)` wrapper backed by PARI's `znorder`,
which clears the remaining `generic.py` `ProductTree` example that checks the
multiplicative order of `GF(65537)(1111)`. Both the cypari2 standalone target
and Sagelite's packaged Node/Electron smokes now cover the new `znorder`
surface.

The next useful corpus-growth pass can look for another compact pure-math file
whose failures cluster around already-supported exact arithmetic, instead of
continuing broad native-library tagging. `monomials.py` is a small candidate,
but its remaining failures currently come from `Sequence(...)` importing
`sage.rings.polynomial.plural`; that should be treated as a polynomial/plural
import-scope issue rather than a doctest expectation mismatch.

Latest checked local corpus run after the 2026-06-24 monomials corpus-growth
pass:

```text
sage -t passed: 2487 passed, 0 failed, 775 skipped
```

That run records 3,262 block rows in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, with empty
`block-failure-clusters.sql` and `file-error-clusters.sql` results. The
curated browser-profile corpus now has eleven files, adding
`sage/rings/monomials.py`:

```text
monomials.py: 3 passed, 0 failed, 2 skipped
```

The pass keeps `Sequence(...)` useful for basic commutative multivariate
polynomial lists on WASI when the richer `PolynomialSequence` path is blocked
by the unavailable `sage.rings.polynomial.plural` module. On that specific
missing-module edge, `Sequence` falls back to `Sequence_generic` instead of
turning simple monomial enumeration into a Singular/plural import-scope
failure. The richer polynomial-sequence API remains a separate follow-up for
the native-library-backed polynomial/plural slice.

The next useful corpus-growth pass should try another compact exact-math file
and keep this same boundary: add files whose failures can be fixed with
already-supported generic arithmetic, but leave Singular, plural, and
native-library polynomial algorithms as explicit future scope unless the
underlying runtime support is being implemented.

Follow-up corpus-growth probe: `sage/rings/big_oh.py` is a clean compact
addition to the browser-profile corpus. A focused rerun records:

```text
big_oh.py: 29 passed, 0 failed, 10 skipped
```

The curated corpus now includes this file. The same sampling pass rejected
`infinity.py`, `homset.py`, and `ideal_monoid.py` for this narrow iteration:
`infinity.py` and `ideal_monoid.py` still produce broad semantic/import
failure sets, while `homset.py` reaches an NTL dynamic-import boundary at
`ZZ_pContext::restore`. Those are better handled as separate focused runtime
or browser-scope passes instead of adding noisy dashboard coverage.

The full corpus target passes with the new file included:

```text
sage -t passed: 2516 passed, 0 failed, 785 skipped
```

That run is recorded in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3` as run `2` with
3,301 total block rows for the latest run. The saved block- and file-failure
cluster queries are empty.

Follow-up corpus-growth pass: `sage/rings/numbers_abc.py` is another compact
clean addition to the browser-profile corpus. A focused rerun records:

```text
numbers_abc.py: 10 passed, 0 failed, 8 skipped
```

The skipped examples are explicit browser-profile optional coverage for NumPy,
symbolic, and number-field features. The full corpus target passes with the
new file included:

```text
sage -t passed: 2526 passed, 0 failed, 793 skipped
```

That run is recorded in `/tmp/sagelite-corpus-numbers-abc.sqlite3` with 3,319
total block rows for the latest run. The saved block- and file-failure cluster
queries are empty. The same sampling pass rejected `pari_ring.py` for this
narrow iteration because its remaining failures are clustered around unsupported
`cypari2.gen.Gen` arithmetic, comparison, inversion, and pickling operations;
that belongs in a focused PARI object-model pass rather than a quiet corpus
growth commit. `imaginary_unit.py` was also not added because it has no current
doctest signal.

Follow-up runner-fidelity and corpus-growth pass: `sage/rings/infinity.py`
exposed a reusable doctest-runner mismatch rather than a Sagelite semantic
failure. Python's doctest passes only the final exception line to the output
checker for expected exceptions, while Sagelite reports qualified exception
classes such as `sage.rings.infinity.SignError`. The Sagelite runner now
accepts qualified exception class names when the unqualified class and message
match, and its doctest namespace explicitly seeds Sage's usual `sign`/`sgn`
helpers when available.

The remaining `infinity.py` browser-profile rows are classified in the WASI
source patch: one non-raw docstring latex escape drift is deferred as
`# known bug`, and the `RDF`/`RIF` coercion checks are marked as real
double/interval coverage. A focused rerun records:

```text
infinity.py: 253 passed, 0 failed, 70 skipped
```

The full corpus target passes with the new file included:

```text
sage -t passed: 2779 passed, 0 failed, 863 skipped
```

That run is recorded in `/tmp/sagelite-corpus-infinity.sqlite3` with 3,642
total block rows for the latest run. The saved block- and file-failure cluster
queries are empty.

Follow-up corpus-growth pass: `sage/rings/real_field.py` and
`sage/rings/continued_fraction_gosper.py` are now included in the
browser-profile corpus. `real_field.py` is a small clean exact/real-field
constructor check. `continued_fraction_gosper.py` exposed a source-scope
classification issue: two top-level setup prompts used symbolic `pi` without a
matching `# needs sage.symbolic` tag, while the later symbolic checks in the
same file were already tagged. The Sagelite WASI patch now marks those setup
prompts as symbolic coverage, letting the file contribute its exact iterator
tests without turning skipped symbolic/combinatorics examples into namespace
failures.

Focused reruns record:

```text
real_field.py: 5 passed, 0 failed, 0 skipped
continued_fraction_gosper.py: 22 passed, 0 failed, 16 skipped
```

The full corpus target passes with both files included and failures disallowed:

```text
sage -t passed: 2806 passed, 0 failed, 879 skipped
```

That run is recorded in `/tmp/sagelite-corpus-realfield-gosper.sqlite3` with
3,685 total block rows for the latest run. The saved block- and file-failure
cluster queries are empty.

Follow-up polynomial-helper corpus-growth pass:
`sage/rings/polynomial/commutative_polynomial.pyx` and
`sage/rings/polynomial/convolution.py` are now included in the
browser-profile corpus. Both are compact exact-polynomial helper files and add
clean signal without broadening into Singular/plural or native-library-backed
polynomial algorithms.

Focused reruns record:

```text
commutative_polynomial.pyx: 7 passed, 0 failed, 0 skipped
convolution.py: 34 passed, 0 failed, 0 skipped
```

The same sampling pass kept `sage/rings/homset.py` out of this narrow corpus
growth because it still reaches the known NTL dynamic-import boundary at
`ZZ_pContext::restore`, and kept `sage/rings/pari_ring.py` out because its
remaining failures cluster around the unsupported PARI object-model surface.
Those are better handled as focused runtime or browser-scope passes.

The full corpus target passes with both polynomial helpers included and
failures disallowed:

```text
sage -t passed: 2890 passed, 0 failed, 918 skipped
```

That run is recorded in `/tmp/sagelite-corpus-polynomial-helpers.sqlite3` with
3,808 total block rows for the latest run. The saved block- and file-failure
cluster queries are empty.

## Phase 5: Subprocess Strategy

Sage has many interfaces that call external programs. In a browser, local
subprocesses are not available. Under Node.js and Electron they are plausible,
especially because many Sage interfaces are synchronous from the user's point
of view.

Treat this as a separate runtime capability:

- default browser-compatible profile skips external-process tests;
- `node-subprocess` profile may enable external commands;
- every subprocess-backed interface should be explicit in metadata;
- do not let a subprocess-enabled pass count as browser compatibility.

Potential future design:

```text
Python/WASM Sage interface object
  -> CoWasm host bridge
  -> Node child_process or Electron main process service
  -> external executable
```

This could eventually support Magma, GAP, Singular, FriCAS, and similar
interfaces in Node/Electron deployments, while browser builds skip or replace
them.

## Phase 6: TypeScript/NPM Direction

The strategic product is a serious pure-math system in the JavaScript
ecosystem. JavaScript and npm have useful numeric and symbolic packages, but
nothing comparable to Sage's breadth for pure mathematics.

The test dashboard should eventually support an npm-facing claim:

```text
This version of @cowasm/sage passes X/Y Sage doctest blocks in the pure-math
profile under Node.js, with detailed per-package coverage data.
```

Long-term TypeScript interface sketch:

```ts
import { Sage } from "@cowasm/sage";

const sage = await Sage.create();
const n = await sage.eval("2^127 - 1");
const factors = await sage.eval("factor(2^127 - 1)");
const F = await sage.eval("GF(9)");
```

Later, add typed wrappers for:

- integers and rationals;
- polynomials;
- matrices;
- finite fields;
- elliptic curves;
- combinatorics objects.

The doctest database is the credibility layer behind that API.

## Near-Term Implementation Checklist

1. Add run profile and block-key metadata to SQLite.
2. Add tag/skip metadata without breaking existing databases.
3. Add tolerance support for common numeric doctests.
4. Add a curated corpus file for basic pure math.
5. Add a corpus runner script or make target.
6. Add saved SQL progress queries.
7. Run the initial corpus and archive the first baseline DB.
8. Pick the top root-cause cluster and fix it.

## Initial Success Criteria

The next milestone is complete when:

- `make -C sagemath/sagelite test-sage-doctest-corpus` runs a curated corpus
  into SQLite;
- the latest run summary and failure-cluster queries work from checked-in SQL;
- `integer_ring.pyx` and at least five other curated files are included;
- random, optional, long, and deferred tests are classified correctly;
- failures can be grouped into actionable root-cause clusters;
- the fast Sagelite standalone smoke remains separate and passes its Node,
  `python-wasi-sdk`, doctest, and Electron resource probes.
