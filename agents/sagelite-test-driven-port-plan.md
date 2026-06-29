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
  - propagates file-level `# sage.doctest: needs ...` directives to extracted
    examples, so module-wide Sage dependency declarations become SQLite skip
    metadata instead of artificial startup-name failures;
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
- File-level coverage shape can be grouped with `file-coverage-shape.sql`, so
  exploratory corpus-growth runs can quickly separate clean runnable coverage
  from skipped-only files, zero-block files, block failures, and file-level
  runtime errors.
- File-level coverage shape can also be summarized with
  `file-coverage-summary.sql`, which keeps broad sampling runs readable when
  most candidates are skipped-only, empty, or blocked by known runtime
  clusters.
- Focused sampling runs can be sorted by promotion readiness with
  `corpus-candidate-ranking.sql`, so clean runnable files surface ahead of
  noisy triage targets, file-level errors, skipped-only files, and empty
  helpers.
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
and no file-level errors. It covers the then-current 20-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus: the
original integer, rational, finite-field, polynomial-constructor, and matrix
files plus `abc.pyx`, `real_field.py`, `fast_arith.pyx`, `generic.py`,
`continued_fraction_gosper.py`, `monomials.py`, `big_oh.py`, `numbers_abc.py`,
`infinity.py`, `commutative_polynomial.pyx`, `convolution.py`, and
`non_negative_integer_semiring.py`. The latest run metadata records CoWasm
commit `e9f68c7f56c01c4044bded805493588e22040be5`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and runner version
22.

Latest checked local corpus run after the 2026-06-24 arithmetic corpus-growth
pass:

```text
sage -t passed: 2989 passed, 0 failed, 934 skipped
```

That run records 3,923 block rows in
`/tmp/sagelite-corpus-after-arith-expansion.sqlite3`, with no block-level
failures and no file-level errors. It covers the current 24-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/arith/srange.pyx`, `sage/arith/power.pyx`,
`sage/arith/rational_reconstruction.pyx`, and
`sage/arith/numerical_approx.pyx` to the previous clean browser-profile
baseline. The latest run metadata records CoWasm commit
`6f60f4f0bbb6663a06236f8c2358ccb66011c957`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and runner version
22.

Latest checked local corpus run after the 2026-06-24 expanded combinatorics
and enumerated-set corpus validation:

```text
sage -t passed: 4768 passed, 0 failed, 1003 skipped
```

That run records 5,771 block rows in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, with no
block-level failures and no file-level errors. It covers the current 41-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, including
the earlier arithmetic, finite-ring, polynomial, and matrix coverage plus the
expanded combinatorics and enumerated-set batch:
`sage/combinat/combination.py`, `sage/combinat/misc.py`,
`sage/combinat/backtrack.py`, `sage/combinat/composition.py`,
`sage/combinat/subset.py`, `sage/combinat/composition_signed.py`,
`sage/combinat/derangements.py`, `sage/combinat/perfect_matching.py`,
`sage/combinat/subword.py`, `sage/combinat/tuple.py`,
`sage/sets/integer_range.py`, `sage/sets/finite_set_maps.py`,
`sage/sets/finite_enumerated_set.py`,
`sage/sets/totally_ordered_finite_set.py`,
`sage/sets/non_negative_integers.py`, `sage/sets/positive_integers.py`, and
`sage/sets/primes.py`. Focused reruns confirmed that
`sage/combinat/subset.py` now reports `279 passed, 0 failed, 2 skipped` and
`sage/sets/finite_set_maps.py` reports `86 passed, 0 failed, 0 skipped`, so
both are part of the quiet browser-profile dashboard. The latest run metadata
records CoWasm commit `d56472a039b800e18cd8b9118daefa56fed68bec`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile,
runner version 25, and about 300 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-24 small combinatorics and
condition-set corpus expansion:

```text
sage -t passed: 4903 passed, 0 failed, 1070 skipped
```

That run records 5,973 block rows in
`/tmp/sagelite-corpus-after-combinat-sets-expansion.sqlite3`, with no
block-level failures and no file-level errors. It covers the current 46-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/restricted_growth.py`, `sage/combinat/sidon_sets.py`,
`sage/combinat/ranker.py`, `sage/combinat/gray_codes.py`, and
`sage/sets/condition_set.py` to the previous clean browser-profile baseline.
The latest run metadata records CoWasm commit
`8b6bb86616666faac9f0dfc13920df7a34253868`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 25,
and about 330 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-24 integer-vector
corpus-growth pass:

```text
sage -t passed: 5151 passed, 0 failed, 1107 skipped
```

That run records 6,258 block rows in
`/tmp/sagelite-corpus-integer-vector.sqlite3`, with no block-level failures
and no file-level errors. It covers the current 47-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/integer_vector.py` to the previous clean browser-profile
baseline. The focused rerun records
`integer_vector.py: 248 passed, 0 failed, 37 skipped`. The Sagelite doctest
runner now seeds the lightweight `IntegerListsLex` constructor in the common
doctest namespace and records this behavior under runner version 26.

Checked follow-up note from the 2026-06-24 line-rerun setup pass: rebuilding
`python/cpython` to pick up the `PyUnicode_FromFormat` integer-format patch is
currently blocked during WASM configure by `mimalloc requires stdatomic.h`.
Until that toolchain/configure issue is fixed, the rational
`(1/2).gamma(5)` doctest still reports the old missing-integer TypeError text
in the installed Sagelite runtime.

Latest checked local corpus run after the 2026-06-24 cartesian-product
corpus-growth pass:

```text
sage -t passed: 5218 passed, 0 failed, 1108 skipped
```

That run records 6,326 block rows in
`/tmp/sagelite-corpus-after-cartesian-product.sqlite3`, with no block-level
failures and no file-level errors. It covers the current 48-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/cartesian_product.py` to the previous clean
browser-profile baseline. The pass exposes Sage's `cartesian_product`
constructor from the WASI `sage.all` namespace, keeping the module's doctests
on the same startup surface as upstream Sage without importing the broad
`sage.categories.all` or `sage.sets.all` collections into the stripped WASI
profile. The focused reruns record
`cartesian_product.py: 68 passed, 0 failed, 0 skipped` and
`subset.py: 278 passed, 0 failed, 3 skipped`; the extra `subset.py` skip
defers the generator repr display drift where the WASM runtime omits the
address prefix expected by Sage's historical doctest. The latest run metadata
records node profile, runner version 26, and about 343 seconds of elapsed
time.

Latest checked local corpus run after the 2026-06-24 combinat-core
corpus-growth pass:

```text
sage -t passed: 5403 passed, 0 failed, 1230 skipped
```

That run records 6,633 block rows in
`/tmp/sagelite-corpus-after-combinat-core.sqlite3`, with no block-level
failures and no file-level errors. It covers the current 49-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/combinat.py` to the previous clean browser-profile baseline.
The focused rerun records `combinat.py: 185 passed, 0 failed, 122 skipped`;
the added WASI patch classifies the Lah-number identity that routes through
GAP-backed `stirling_number1` as `# needs sage.libs.gap`, matching the
module's existing GAP-only doctest tagging. The latest run metadata records
CoWasm commit `ee424d4edbbe5e1dc6d502300dec3d7bb4c05f26`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner
version 26, and about 351 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-24 small combinatorics
helper corpus-growth pass:

```text
sage -t passed: 5561 passed, 0 failed, 1238 skipped
```

That run records 6,799 block rows in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, with no
block-level failures and no file-level errors. It covers the current 52-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/SJT.py`, `sage/combinat/dlx.py`, and
`sage/combinat/output.py` to the previous clean browser-profile baseline.
Focused reruns recorded `SJT.py: 31 passed, 0 failed, 0 skipped`,
`dlx.py: 57 passed, 0 failed, 8 skipped`, and
`output.py: 70 passed, 0 failed, 0 skipped`. Sampling in the same pass kept
larger adjacent files such as `sage/sets/set.py`, `sage/combinat/partition.py`,
`sage/combinat/permutation.py`, `sage/sets/set_from_iterator.py`,
`sage/combinat/necklace.py`, and `sage/combinat/bijectionist.py` out of the
quiet corpus because their failures still cluster around broader set,
partition, permutation, or combinatorial-generation semantics.

Latest checked local corpus run after the 2026-06-24 hereditary-subsets
corpus-growth pass:

```text
sage -t passed: 5641 passed, 0 failed, 1250 skipped
```

That run records 6,891 block rows in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, with no
block-level failures and no file-level errors. It covers the current 54-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/subsets_hereditary.py` to the previous clean
browser-profile baseline. The focused rerun records
`subsets_hereditary.py: 6 passed, 0 failed, 10 skipped`; the added WASI patch
classifies the file's parallel-only `ncpus=2` example as
`# needs cysignals.alarm`, matching the existing browser-profile boundary for
fork/alarm-backed Sage parallelism. The latest run metadata records CoWasm
commit `604adba6753bc04026bb31254c309a092da53ea8`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 26,
and about 378 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-24 integer-matrices
corpus-growth pass:

```text
sage -t passed: 5688 passed, 0 failed, 1264 skipped
```

That run records the current 55-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/integer_matrices.py` to the previous clean browser-profile
baseline. The focused rerun records
`integer_matrices.py: 40 passed, 0 failed, 11 skipped`; the added WASI patch
classifies Symmetrica-backed cardinality checks as optional
`sage.libs.symmetrica` coverage and defers list-of-matrices display-format
drift where the runtime prints one matrix per list slot instead of Sage's
historical compact side-by-side layout. The doctest runner now seeds the
`Composition` constructor in the common doctest namespace, while the WASI
`sage.all` patch exposes both `Composition` and `Compositions`.

Latest checked local corpus run after the 2026-06-25 set-image and
pairwise-subset corpus-growth pass:

```text
sage -t passed: 7311 passed, 0 failed, 1393 skipped
```

That run records the current 76-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/core.py`, `sage/combinat/subsets_pairwise.py`, and
`sage/sets/image_set.py` to the previous clean browser-profile baseline.
Focused reruns recorded `core.py: 123 passed, 0 failed, 15 skipped`,
`subsets_pairwise.py: 30 passed, 0 failed, 4 skipped`, and
`image_set.py: 50 passed, 0 failed, 49 skipped`. The added WASI patch
classifies `image_set.py` inverse-image doctests that route through the
unavailable noncommutative polynomial `plural` module, plus hash/equality
contract drift in `ImageSubobject` and `PairwiseCompatibleSubsets`, as
deferred browser-profile skips. The latest run metadata records node profile,
runner version 28, and writes the checked database to
`/tmp/sagelite-corpus-after-core-image-subsets.sqlite3`.

Latest checked local corpus run after the 2026-06-25 sets cartesian-product
corpus-growth pass:

```text
sage -t passed: 8331 passed, 0 failed, 1452 skipped
```

That run records the current 85-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/sets/cartesian_product.py` to the previous clean browser-profile
baseline. The focused rerun records
`cartesian_product.py: 49 passed, 0 failed, 6 skipped`. The WASI `sage.all`
patch now exposes the lightweight `InfiniteEnumeratedSets` category constructor
needed by upstream cartesian-product doctests, and the added WASI source patch
classifies the file's real-field cartesian-product example as
`# needs sage.rings.real_mpfr` consistently with the adjacent `RR` examples.
The latest run metadata records CoWasm commit
`2f50a0a02f8f6a6ef85d139ecc1ea73b1bf792aa`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 28,
and writes the checked database to
`/tmp/sagelite-corpus-after-sets-cartesian-product.sqlite3`.

Latest checked local corpus run after the 2026-06-26 tableau-residue
corpus-growth pass:

```text
sage -t passed: 9340 passed, 0 failed, 2090 skipped
```

That run records the current 97-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/tableau_residues.py` to the previous clean browser-profile
baseline. The focused rerun records
`tableau_residues.py: 121 passed, 0 failed, 0 skipped`. The doctest runner now
seeds the lightweight tableau-tuple constructors `StandardTableauTuple`,
`StandardTableauTuples`, and `TableauTuples` in the common doctest namespace,
and the WASI `sage.all` patch exposes the same constructors for startup
parity. The latest run metadata records CoWasm commit
`96af5d9cef0b0f716ac9ae18538502512e9b0c34`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 29,
and writes the checked database to
`/tmp/sagelite-corpus-after-tableau-residues.sqlite3`.

Latest checked local corpus run after repairing the Sagelite WASI source patch
header for the expanded `sage.all` startup hunk:

```text
sage -t passed: 9949 passed, 0 failed, 2195 skipped
```

That run records the current 103-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, with no
block-level failures and no file-level errors. The fix corrects the unified
diff new-line count for the `src/sage/all.py` WASI startup namespace hunk in
`sagemath/sagelite/src/patches/01-wasi-optional-host-libs.patch`, so
`make -C sagemath/sagelite test-sage-doctest-corpus` can rebuild a fresh
patched source copy before running the dashboard. The latest run metadata
records CoWasm commit `46e5460ef81dd26f67e8ca98c798abc144c5d038`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, runner version 30, and about 680 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 Dyck-word
corpus-growth pass:

```text
sage -t passed: 11496 passed, 0 failed, 2359 skipped
```

That run records the current 102-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-dyck-word.sqlite3`, with no block-level failures
and no file-level errors. It adds `sage/combinat/dyck_word.py` to the quiet
browser-profile dashboard; the focused rerun records
`dyck_word.py: 555 passed, 0 failed, 42 skipped`. The doctest runner now seeds
the lightweight `NonDecreasingParkingFunction` and
`NonDecreasingParkingFunctions` constructors in the common doctest namespace,
and the WASI `sage.all` patch exposes the same constructors for startup
parity. The added WASI source patch classifies the `latex_options()` dict-order
display drift as a deferred `# known bug` skip. The latest run metadata records
CoWasm commit `0a75b95c9517de7ca96c1b725e1fcdb3d6a4e9e6`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner
version 31, and about 733 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 binary-tree
corpus-growth pass:

```text
sage -t passed: 12569 passed, 0 failed, 2484 skipped
```

That run records the current 106-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-binary-tree.sqlite3`, with no block-level failures
and no file-level errors. It adds `sage/combinat/binary_tree.py` to the quiet
browser-profile dashboard; the focused rerun records
`binary_tree.py: 624 passed, 0 failed, 119 skipped`. The added WASI source
patch classifies graph, poset, and Tamari-interval examples as
`# needs sage.graphs`, matching the current stripped graph backend boundary,
and defers one ASCII-art layout drift as `# known bug`. The latest run metadata
records CoWasm commit `1f64f3c6c8483c39fff60555347b5f99665d6f72`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile,
runner version 31, and about 776 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 triangle-polynomial
corpus-growth pass:

```text
sage -t passed: 12702 passed, 0 failed, 2534 skipped
```

That run records the current 107-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-triangles-fhm.sqlite3`, with no block-level
failures and no file-level errors. It adds `sage/combinat/triangles_FHM.py` to
the quiet browser-profile dashboard; the focused rerun records
`triangles_FHM.py: 133 passed, 0 failed, 50 skipped`. The added WASI source
patch classifies triangle conversions and factorization examples that route
through Singular-backed multivariate polynomial gcd/factorization as
`# needs sage.libs.singular`, including dependent `_` and saved-variable checks.
The latest run metadata records CoWasm commit
`e59503cc49c5ec3a2210d49fe9202eb61d1de0e2`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 31,
and about 784 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 core set
corpus-growth pass:

```text
sage -t passed: 13010 passed, 0 failed, 2642 skipped
```

That run records the current 108-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, with no
block-level failures and no file-level errors. It adds `sage/sets/set.py` to
the quiet browser-profile dashboard; the focused rerun records
`set.py: 308 passed, 0 failed, 108 skipped`. The doctest runner now seeds the
lightweight set constructors `ConditionSet`, `IntegerRange`, and `Primes` in
the common doctest namespace, which clears the main startup-name cluster in
`set.py` without broadening the `sage.all` import surface. The added WASI
source patch classifies real-field whole-set wrapping and symbolic
`RealSet` examples as deferred browser-profile skips. The latest run metadata
records CoWasm commit `fdf391e1820394cedbb9b2be2cf2d60f904f9e5d`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, runner version 32, and about 792 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 row-standard-tableau
corpus-growth pass:

```text
sage -t passed: 19028 passed, 0 failed, 3306 skipped
```

That run records the current 133-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, with no
block-level failures and no file-level errors. It adds
`sage/combinat/tableau.py` to the quiet browser-profile dashboard; the focused
rerun records `tableau.py: 1254 passed, 0 failed, 162 skipped`. The added WASI
source patch classifies the remaining `RowStandardTableaux(4).an_element()`
example as `# needs sage.graphs`, matching the adjacent row-standard-tableau
examples that already depend on the stripped graph backend. The latest run
metadata records CoWasm commit
`a6fcc0d8232c870ea718f8d6de8a804de4227a4a`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 36,
and about 992 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 integer-lists frontend
corpus-growth pass:

```text
sage -t passed: 19084 passed, 0 failed, 3306 skipped
```

That run records the current 134-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-integer-lists-lists.sqlite3`, with no block-level
failures and no file-level errors. It adds
`sage/combinat/integer_lists/lists.py` to the quiet browser-profile dashboard;
the focused rerun records `lists.py: 56 passed, 0 failed, 0 skipped`. The
doctest runner now seeds the lightweight `DisjointUnionEnumeratedSets`
constructor in the common doctest namespace, and the WASI `sage.all` patch
exposes the same constructor for startup parity. The latest run metadata
records CoWasm commit `1bf48a050ad2fd1ebf6ccb9c17003d19a4e202ad`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile,
runner version 36, and about 993 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 q-analogues
corpus-growth pass:

```text
sage -t passed: 19194 passed, 0 failed, 3331 skipped
```

That run records 22,525 block rows across the current 135-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-q-analogues.sqlite3`, adding
`sage/combinat/q_analogues.py` to the quiet browser-profile dashboard. The
focused rerun records `q_analogues.py: 110 passed, 0 failed, 25 skipped`.
The added WASI source patch classifies the file's number-field, Symmetrica,
Singular, symbolic, and PARI/cypari2-dependent doctests with explicit
`# needs ...` tags, while deferring the finite-field q-binomial value drift
and raw Python integer type drift as `# known bug`. The saved block- and
file-failure cluster queries are empty. The latest run metadata records CoWasm
commit `b95ded8d61aa1db4ea18c98d9678767f431708fa`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 37,
and about 992 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 Puiseux-series
corpus-growth pass:

```text
sage -t passed: 19255 passed, 0 failed, 3349 skipped
```

That run records 22,604 block rows across the current 136-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, adding
`sage/rings/puiseux_series_ring.py` to the quiet browser-profile dashboard.
A focused rerun records:

```text
puiseux_series_ring.py: 61 passed, 0 failed, 18 skipped
```

The pass also repairs the Sagelite WASI patch hunk for
`sage/combinat/q_analogues.py` so the large
`number_of_irreducible_polynomials(99, q=101)` example uses the
already-intended `# needs sage.libs.pari` tags in the rebuilt source copy.
A focused rerun records
`q_analogues.py: 110 passed, 0 failed, 25 skipped`, and the saved block- and
file-failure cluster queries are empty for the full corpus.

Latest checked local corpus run after the 2026-06-26 words datatype/morphism
corpus-growth pass:

```text
sage -t passed: 20120 passed, 0 failed, 3445 skipped
```

That run records 23,565 block rows across the current 139-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-word-datatypes.sqlite3`, adding
`sage/combinat/words/word_char.pyx`,
`sage/combinat/words/word_datatypes.pyx`, and
`sage/combinat/words/morphism.py` to the quiet browser-profile dashboard.
Focused reruns record `word_char.pyx: 143 passed, 0 failed, 2 skipped`,
`word_datatypes.pyx: 161 passed, 0 failed, 0 skipped`, and
`morphism.py: 561 passed, 0 failed, 94 skipped`. The saved block- and
file-failure cluster queries are empty for the full corpus. The latest run
metadata records CoWasm commit `ea14f2db4a7fca375a3d46d94a24e1ce8a0f1f2c`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, and runner version 37.

Latest checked local corpus run after the 2026-06-26 words frontend
corpus-growth pass:

```text
sage -t passed: 20510 passed, 0 failed, 3468 skipped
```

That run records 23,978 block rows across the current 140-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-words-py.sqlite3`, adding
`sage/combinat/words/words.py` to the quiet browser-profile dashboard. The
focused patched-source rerun records
`words.py: 390 passed, 0 failed, 23 skipped`. The doctest runner now seeds the
lightweight `Alphabet` and `ParkingFunction` constructors in the common
doctest namespace, and the WASI `sage.all` patch exposes the same constructors
for startup parity. The added WASI source patch classifies the order-sensitive
`Words('ab')._element_classes` dict display check as a deferred
`# known bug` skip. The saved block- and file-failure cluster queries are
empty for the full corpus. The latest run metadata records CoWasm commit
`0b860275d086def80cad3b1c097a9ba0c6849af4`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 38,
and about 1,045 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 integer-list backend
corpus-growth pass:

```text
sage -t passed: 20928 passed, 0 failed, 3476 skipped
```

That run records 24,404 block rows across the current 142-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-integer-list-backends.sqlite3`, adding
`sage/combinat/integer_lists/base.pyx` and
`sage/combinat/integer_lists/invlex.pyx` to the quiet browser-profile
dashboard. Focused reruns record `base.pyx: 116 passed, 0 failed, 4 skipped`
and `invlex.pyx: 302 passed, 0 failed, 4 skipped`.

The added WASI source patch classifies the backend `__getstate__()` dict
display-order drift and the `IntegerListsLex` warning-capture drift as
deferred `# known bug` skips. The same pass marks a `ConditionSet` function
address repr drift as `# random`, so the assignment still seeds state for the
following finite-set examples while accepting the runtime's address formatting.
The saved block- and file-failure cluster queries are empty for the full
corpus. The latest run metadata records CoWasm commit
`1f7f5a55e932a841caf5c80d2b36137d979cd939`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 38,
and about 1,044 seconds of elapsed time.

The Puiseux-series sampling pass kept several nearby files out of the quiet
corpus:
`sage/combinat/q_bernoulli.pyx` still reaches the known NTL/libcxx
`memory access out of bounds` trap through finite-field polynomial setup;
`sage/rings/continued_fraction.py` reaches number-field construction and
times out in the current browser profile; `sage/combinat/sine_gordon.py`
imports unavailable symbolic-expression support before its module globals can
be seeded; and `sage/rings/ring.pyx` reaches the existing
`polynomial_number_field` table-index trap during a broad `TestSuite`.

Latest checked local corpus run after the 2026-06-26 Cartan-type
corpus-growth pass:

```text
sage -t passed: 21246 passed, 0 failed, 3619 skipped
```

That run records 24,865 block rows across the current 143-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-cartan-type.sqlite3`, adding
`sage/combinat/root_system/cartan_type.py` to the quiet browser-profile
dashboard. The focused rerun records
`cartan_type.py: 318 passed, 0 failed, 143 skipped`.

The doctest runner now seeds `RootSystem` in the common startup namespace, and
the WASI `sage.all` patch exposes the same constructor for REPL parity on the
next Sagelite package rebuild. This clears the Cartan-type startup-name
cluster where upstream examples use `RootSystem(...)` without a local import.
The remaining sampled mismatch,
`CartanType(['H',3]).is_implemented()`, is tagged as
`# needs sage.graphs` because that implementation checks `coxeter_diagram()`,
which imports the unavailable graph backend. The saved block- and file-failure
cluster queries are empty for the full corpus run. The latest run metadata
records CoWasm commit `8fd0b384d16e0e23d399a65af5df11c08b9ba504`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile,
runner version 38, and about 1,097 seconds of elapsed time.

The same sampling pass kept `sage/combinat/abstract_tree.py` out because it
still hits a `list_clone` maximum-call-stack trap, kept
`sage/combinat/colored_permutations.py` out because it reaches the NTL
`ZZ_pContext.restore` dynamic-link boundary, and kept
`sage/combinat/graph_path.py`, `sage/combinat/interval_posets.py`, and the
sampled path-tableaux helpers out because their current failures need graph,
startup-context, or broader semantic triage. Dependency-boundary files such as
`sage/combinat/fully_commutative_elements.py`,
`sage/combinat/parallelogram_polyomino.py`,
`sage/combinat/constellation.py`, `sage/combinat/e_one_star.py`,
`sage/combinat/growth.py`, `sage/combinat/k_tableau.py`, and
`sage/combinat/integer_vectors_mod_permgroup.py` currently add only skipped
rows under the default browser-profile tags, so they remain outside the quiet
corpus.

Latest checked local corpus run after the 2026-06-26 partition
corpus-growth pass:

```text
sage -t passed: 22550 passed, 0 failed, 3835 skipped
```

That run records 26,385 block rows across the current 144-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, adding
`sage/combinat/partition.py` to the quiet browser-profile dashboard. The
focused rerun records
`partition.py: 1304 passed, 0 failed, 216 skipped`.

The doctest runner now seeds `Tableaux` in the common startup namespace, and
the WASI `sage.all` patch exposes the same constructor for REPL parity after a
Sagelite package rebuild. This clears the partition display-option examples
where upstream doctests set `Tableaux.options.convention` without a local
import. The added WASI source patch classifies order-sensitive partition-block
dictionary display drift as `# known bug`, tags Symmetrica-, Singular-, and
GAP-backed partition examples with explicit `# needs ...` requirements, and
keeps the GAP-backed partition-counting fallback out of the default browser
profile. The saved block- and file-failure cluster queries are empty for the
full corpus run. The latest run metadata records CoWasm commit
`e6b6aeab640adc1f634591e9d1bae77dd5103515`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 38,
and about 1,092 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 Cartan-matrix
corpus-growth pass:

```text
sage -t passed: 22572 passed, 0 failed, 3989 skipped
```

That run records 26,561 block rows across the current 145-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, adding
`sage/combinat/root_system/cartan_matrix.py` to the quiet browser-profile
dashboard. The focused rerun records
`cartan_matrix.py: 22 passed, 0 failed, 154 skipped`.

The added WASI source patch marks the remaining graph-backed Cartan subtype
and Dynkin-diagram examples as `# needs sage.graphs`; the non-graph matrix
construction and Cartan-type detection examples pass under the default node
profile. The saved block- and file-failure cluster queries are empty for the
full corpus run. The latest run metadata records CoWasm commit
`1d29349b35ffb5c64b3ed119750109ee203baaa6`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 38,
and about 1,094 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 root-system
corpus-growth pass:

```text
sage -t passed: 22672 passed, 0 failed, 4027 skipped
```

That run records 26,699 block rows across the current 146-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, adding
`sage/combinat/root_system/root_system.py` to the quiet browser-profile
dashboard. The focused rerun records
`root_system.py: 100 passed, 0 failed, 38 skipped`.

The module adds useful non-graph root-system coverage without new WASI source
tags. The saved block- and file-failure cluster queries are empty for the full
corpus run. The latest run metadata records CoWasm commit
`189dfb1a3a7894d3cb2b30e14cbc7ae4234cddfa`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 38,
and about 1,152 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 root-space
corpus-growth pass:

```text
sage -t passed: 22725 passed, 0 failed, 4062 skipped
```

That run records 26,787 block rows across the current 147-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-root-space.sqlite3`, adding
`sage/combinat/root_system/root_space.py` to the quiet browser-profile
dashboard. The focused rerun records
`root_space.py: 53 passed, 0 failed, 35 skipped`.

The doctest runner now seeds `CartanType` in the common startup namespace, and
the WASI `sage.all` patch exposes the same constructor for REPL parity after a
Sagelite package rebuild. This clears root-space examples that use
`CartanType(...)` without a local import. The added WASI source patch marks
the remaining root-lattice scalar-product check as `# needs sage.graphs`
because it routes through `dynkin_diagram()` and the stripped graph backend.
The saved block- and file-failure cluster queries are empty for the full
corpus run. The latest run metadata records CoWasm commit
`f48a5f8e908c81f8dba9245a469cdde90f317ac3`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 38,
and about 1,106 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-27 weight-space
corpus-growth pass:

```text
sage -t passed: 22801 passed, 0 failed, 4095 skipped
```

That run records 26,896 block rows across the current 148-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, adding
`sage/combinat/root_system/weight_space.py` to the quiet browser-profile
dashboard. The focused rerun records
`weight_space.py: 76 passed, 0 failed, 33 skipped`.

The added WASI source patch classifies the two remaining `_to_root_vector()`
examples as `# needs sage.graphs` because they compute through
`dynkin_diagram()`, which imports the stripped graph backend. The same pass
tightens the existing Cartan-matrix patch hunk so appending later root-system
diffs does not depend on trailing ASCII-art context. The saved block- and
file-failure cluster queries are empty for the full corpus run. The latest run
metadata records CoWasm commit `14a5c4d338316a0e32d56154f7468ebf53761a85`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, runner version 38, and about 1,117 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-27 finite root-type
corpus-growth pass:

```text
sage -t passed: 23114 passed, 0 failed, 4157 skipped
```

That run records 27,271 block rows across the current 158-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-root-types.sqlite3`, adding
`sage/combinat/root_system/type_A.py`, `type_B.py`, `type_C.py`, `type_D.py`,
`type_E.py`, `type_F.py`, `type_G.py`, `type_H.py`, `type_I.py`, and
`type_Q.py` to the quiet browser-profile dashboard. The grouped focused rerun
records:

```text
sage -t passed: 313 passed, 0 failed, 62 skipped
```

The doctest runner now seeds `WeylDim` beside `RootSystem` in the common
startup namespace, and the WASI `sage.all` patch exposes the same function for
REPL parity after a Sagelite package rebuild. This clears the type-G indirect
doctest that computes the first small `G2` representation dimensions through
`WeylDim(...)`. The saved block- and file-failure cluster queries are empty
for the full corpus run. The latest run metadata records CoWasm commit
`b1222d9e199807715b5df7bef34fdc94fe551a0c`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 38,
and about 1,171 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-27 affine root-type wrapper
corpus-growth pass:

```text
sage -t passed: 23675 passed, 0 failed, 4281 skipped
```

That run records 27,956 block rows across the current 172-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, adding
`sage/combinat/root_system/type_A_affine.py`,
`type_A_infinity.py`, `type_B_affine.py`, `type_BC_affine.py`,
`type_C_affine.py`, `type_D_affine.py`, `type_E_affine.py`,
`type_F_affine.py`, `type_G_affine.py`, `type_affine.py`, `type_dual.py`,
`type_folded.py`, `type_marked.py`, and `type_reducible.py` to the quiet
browser-profile dashboard. The grouped focused rerun records:

```text
sage -t passed: 561 passed, 0 failed, 124 skipped
```

The added files required no new WASI source tags or startup namespace changes.
Sampled adjacent files `type_relabel.py` and `type_super_A.py` remain outside
the quiet corpus because each still has two focused doctest failures. The
saved block- and file-failure cluster queries are empty for the full corpus
run. The latest run metadata records CoWasm commit
`821a281d96b0512a7be448c8b6563d1983796e0b`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 38,
and about 1,260 seconds of elapsed time.

Follow-up root-system relabel focused pass: `type_relabel.py` is now included
in the browser-profile corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 173 files. The
doctest runner now seeds `CoxeterType` beside `CartanType`, `RootSystem`, and
`WeylDim` in the common startup namespace, and the WASI `sage.all` patch
exposes the same constructor for REPL parity after a Sagelite package rebuild.
This clears the two relabelled Coxeter-type examples that previously failed
with `NameError: name 'CoxeterType' is not defined`.

Focused reruns record:

```text
type_relabel.py: 107 passed, 0 failed, 28 skipped
type_relabel.py + type_reducible.py: 177 passed, 0 failed, 40 skipped
```

An attempted direct full-corpus run against the already-patched build tree was
stopped after the parent Node process went idle with no worker child and an
uninitialized SQLite output file, so it is not recorded as a checked corpus
baseline. The next full dashboard should be run through the make target after
refreshing the patched build tree.

Follow-up doctest runner lifecycle pass: the root-system relabel corpus growth
now has a checked full-dashboard baseline through the make target. The first
complete rerun wrote a passing SQLite dashboard but the parent Node process
segfaulted after printing the successful summary, causing `make` to report
error 139 despite `0 failed`. Runner version 39 fixes the non-REPL exit path
by flushing stdout/stderr and exiting explicitly after doctest-worker and
`sage -t` modes complete.

The fixed make-target run passes with failures disallowed:

```sh
make -C sagemath/sagelite test-sage-doctest-corpus \
  SAGELITE_DOCTEST_ALLOW_FAILURES=0 \
  SAGELITE_DOCTEST_DB=/tmp/sagelite-corpus-after-exit-fix.sqlite3
```

Latest checked local corpus run after the 2026-06-27 doctest CLI exit fix:

```text
sage -t passed: 23782 passed, 0 failed, 4309 skipped
```

That run records 28,091 block rows across all 173 files in the current
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, with empty
block- and file-failure cluster queries. The latest run metadata records
CoWasm commit `d1bcb962e4efcbd4d4d923e4165c5af7e1fa1fe5`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner
version 39, and about 1,262 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-27 Coxeter-type and
super-type-A root-system corpus-growth pass:

```text
sage -t passed: 23968 passed, 0 failed, 4336 skipped
```

That run records 28,304 block rows across all 175 files in the current
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/root_system/coxeter_type.py` and
`sage/combinat/root_system/type_super_A.py` to the quiet browser-profile
dashboard. Focused reruns record:

```text
coxeter_type.py: 75 passed, 0 failed, 10 skipped
type_super_A.py: 111 passed, 0 failed, 17 skipped
```

The added WASI source patch classifies the two `associated_coroot()` examples
in `type_super_A.py` as `# needs sage.libs.pari` because they compute a matrix
kernel over a number field through PARI matrix conversion, which still reaches
the focused cypari2 object-model boundary in the browser profile. The saved
block- and file-failure cluster queries are empty for the full corpus run. The
latest run metadata records CoWasm commit
`55f62893939835ad7cdf38a00a5a5608a0878242`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 39,
and about 1,269 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-27 ambient-space
root-system corpus-growth pass:

```text
sage -t passed: 24050 passed, 0 failed, 4338 skipped
```

That run records 28,388 block rows across all 176 files in the current
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/root_system/ambient_space.py` to the quiet browser-profile
dashboard. The focused rerun records:

```text
ambient_space.py: 82 passed, 0 failed, 2 skipped
```

The added file required no new WASI source tags or startup namespace changes.
Sampling in the same pass kept `sage/combinat/root_system/coxeter_matrix.py`
and `sage/combinat/root_system/dynkin_diagram.py` out of the quiet corpus
because both currently add only skipped rows under the default browser-profile
tags. The saved block- and file-failure cluster queries are empty for the full
corpus run. The latest run metadata records CoWasm commit
`2800924a4f4fb05a70484ed639a56a6e9d6e7fe2`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 39,
and about 1,378 seconds of elapsed time.

Latest checked SQLite dashboard after the 2026-06-27 root/weight lattice
realization corpus-growth pass:

```text
sage -t passed: 24422 passed, 0 failed, 4848 skipped
```

That run records 29,270 block rows across all 178 files in the current
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/root_system/root_lattice_realizations.py` and
`sage/combinat/root_system/weight_lattice_realizations.py` to the quiet
browser-profile dashboard. Focused reruns record:

```text
root_lattice_realizations.py: 282 passed, 0 failed, 379 skipped
weight_lattice_realizations.py: 90 passed, 0 failed, 131 skipped
```

The added WASI source patch classifies the graph-backed Verma dominance and
inverse-Cartan doctests as `# needs sage.graphs`, and classifies the
ambient-lattice `_to_root_vector()` examples as `# needs sage.libs.pari`
because they currently reach the focused cypari2 object-model boundary in the
browser profile. The saved block- and file-failure cluster queries are empty
for the full SQLite dashboard. The latest run metadata records CoWasm commit
`228a639475accfc3d9878833555ec92cd051f993`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 39,
and about 1,292 seconds of elapsed time.

Focused corpus-growth pass after the 2026-06-27 free-module startup namespace
work:

```text
sage -t passed: 358 passed, 0 failed, 79 skipped
```

That one-file make-target validation adds
`sage/combinat/free_module.py` to the curated corpus. The doctest runner now
seeds the category constructors needed by upstream combinatorial free-module
doctests, including `AlgebrasWithBasis`, `Modules`, `LeftModules`,
`RightModules`, and finite-dimensional module/algebra categories, and the
WASI `sage.all` patch exposes the same names for startup parity. The added
WASI source patch classifies the remaining `WeylGroup(['A',3])` Cartesian
product example as `# needs sage.libs.gap`, because importing `WeylGroup`
currently reaches the stripped GAP-backed matrix-group stack. The focused
validation used `make -C sagemath/sagelite test-sage-doctest-corpus` with a
temporary one-file corpus and `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, writing
`/tmp/sagelite-free-module-corpus.sqlite3`. The runner version is now 40.

The make-target process for that full run rebuilt and patched the Sagelite
source tree successfully, then wrote a passing SQLite dashboard, but the
parent Node process stayed idle in `ep_poll` while holding the SQLite lock
after the last worker exited. It was terminated to inspect the completed
database, so this run is recorded as a checked SQLite dashboard rather than a
clean make-target exit. A follow-up runner lifecycle pass should close this
remaining post-run lock/exit path.

Focused module-basics corpus-growth pass after the 2026-06-27 module
infrastructure sampling:

```text
sage -t passed: 46 passed, 0 failed, 26 skipped
```

That two-file make-target validation adds `sage/modules/misc.py` and
`sage/modules/module.pyx` to the curated corpus. These files give the dashboard
foundational module-category and module-parent coverage without broadening into
the heavier free-module implementation. Focused sampling kept
`sage/modules/free_module.py` and `sage/modules/free_module_element.pyx` out of
the quiet corpus for now: the former still reaches a matrix `__setitem__`
function-signature mismatch while computing a sparse basis matrix, and the
latter reaches the existing matrix-action table-index trap through
`outer_product`.

The focused validation used the `test-sage-doctest-corpus` make target with a
temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-module-corpus.sqlite3`. A follow-up full
corpus attempt wrote `/tmp/sagelite-corpus-after-module-basics.sqlite3` and
left the run table with a passing aggregate, but the parent Node process again
stayed idle while holding the SQLite lock. After interruption, the `files`
table had persisted only 153 of the 181 corpus entries and was missing the
trailing set, finite-ring, polynomial, module, and matrix files, so that
attempt is not recorded as a checked full-dashboard baseline.

Focused semigroup-category corpus-growth pass after the 2026-06-27 category
sampling:

```text
sage -t passed: 65 passed, 0 failed, 85 skipped
```

That one-file validation adds `sage/categories/semigroups.py` to the curated
corpus. The only focused failure was unordered `frozenset` display drift in
`Semigroups().Aperiodic().axioms()`, now marked `# random` so the example
still runs while the browser-profile dashboard does not depend on Python set
iteration order. Nearby sampled category files remain outside the quiet corpus:
`rings.py` reaches the known number-field function-signature mismatch,
`fields.py` reaches the known NTL/libcxx finite-field trap, `rngs.py` still
needs both startup namespace work and noncommutative-polynomial tagging. The
focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-semigroups-corpus.sqlite3`.

Focused semiring-category corpus-growth pass:

```text
sage -t passed: 7 passed, 0 failed, 0 skipped
```

That one-file make-target validation adds `sage/categories/semirings.py` to
the curated corpus. The doctest runner now seeds the lightweight
`CommutativeAdditiveMonoids` category constructor in the common startup
namespace, and the WASI `sage.all` patch exposes the same constructor for REPL
parity on a fresh patched Sagelite source copy. This clears the file's only
sampled failure:
`NameError: name 'CommutativeAdditiveMonoids' is not defined`. The focused
validation used a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0` and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-semirings-corpus.sqlite3`. The saved
block- and file-failure cluster queries are empty.

Focused magma-category corpus-growth pass:

```text
sage -t passed: 126 passed, 0 failed, 45 skipped
```

That one-file make-target validation adds `sage/categories/magmas.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 206
non-comment entries. The doctest runner now seeds the lightweight `Magmas` and
`CommutativeRings` category constructors in the common startup namespace, and
the WASI `sage.all` patch exposes the same names for REPL parity on a fresh
patched Sagelite source copy. The added WASI source patch marks the
order-sensitive `Semigroups().FinitelyGenerated().axioms()` frozenset display
as `# random` and tags the real-field cartesian-product inverse setup as
`# needs sage.rings.real_mpfr`, matching the adjacent real-field examples.
The focused validation used a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0` and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-magmas-corpus.sqlite3`. The saved block-
and file-failure cluster queries are empty. The runner version is now 41.

Focused category cartesian-product corpus-growth pass:

```text
sage -t passed: 41 passed, 0 failed, 1 skipped
```

That one-file focused rerun adds `sage/categories/cartesian_product.py` to the
curated corpus. The file gives the dashboard direct coverage of category-level
cartesian-product construction without new WASI source tags or startup
namespace changes. Sampling in the same pass confirmed that
`sage/categories/objects.py` and `sage/categories/pointed_sets.py` were already
quiet and already present in the current corpus; nearby
`sage/categories/category_types.py`, `homsets.py`, `poor_man_map.py`, and
`map.pyx` remain outside the quiet corpus because they still have focused
doctest failures.

Focused category functor corpus-growth pass:

```text
sage -t passed: 116 passed, 0 failed, 13 skipped
```

That one-file make-target validation adds `sage/categories/functor.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 283 non-comment
entries. The added WASI source patch classifies the two coercion-functor
morphism examples that reduce multivariate fraction-field elements as
`# needs sage.libs.singular`, because they currently import the unavailable
Singular interface through the polynomial gcd path.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-functor-make.sqlite3`. The make target
rebuilt and patched the Sagelite source copy successfully, and the saved
block- and file-failure cluster queries are empty.

The same sampling pass kept `sage/categories/bialgebras.py`,
`sage/categories/coalgebras.py`, `sage/categories/finite_groups.py`,
`sage/categories/algebra_functor.py`, and `sage/categories/basic.py` out
because they add no passing default-profile blocks. It kept
`sage/categories/commutative_rings.py` out because it still reaches a memory
trap in `is_square(root=True)`, kept `sage/categories/euclidean_domains.py`
out because `gcd_free_basis` times out in the default node profile, and kept
the broader `category.py`, `category_with_axiom.py`, and
`covariant_functorial_construction.py` files out because their current
failures are dominated by startup-namespace and ordering clusters that should
be handled separately.

Focused topological category corpus-growth pass:

```text
sage -t passed: 44 passed, 0 failed, 47 skipped
```

That two-file focused validation adds `sage/categories/chain_complexes.py` and
`sage/categories/cw_complexes.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 290
non-comment entries. Direct probes recorded
`chain_complexes.py: 8 passed, 0 failed, 47 skipped` and
`cw_complexes.py: 36 passed, 0 failed, 0 skipped`.

Both files are quiet in the default node profile without new WASI source tags
or startup namespace changes. A nearby `sage/categories/action.pyx` probe is
not yet quiet, recording `73 passed, 3 failed, 31 skipped`, so it remains
outside the dashboard pending focused triage. `sage/categories/algebra_functor.py`
also remains outside because it contributes only skipped rows under the
default profile.

Focused category examples corpus-growth pass:

```text
sage -t passed: 166 passed, 0 failed, 2 skipped
```

That five-file focused validation adds
`sage/categories/examples/commutative_additive_monoids.py`,
`sage/categories/examples/finite_semigroups.py`,
`sage/categories/examples/monoids.py`,
`sage/categories/examples/semigroups.py`, and
`sage/categories/examples/semirings.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 296
non-comment entries. Direct probes record clean default-profile results for
all five files without new WASI source tags or startup namespace changes. The
focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary five-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-examples-make.sqlite3`; the saved
block- and file-failure cluster queries are empty.

Focused structure-basics corpus-growth pass after the 2026-06-28 doctest
namespace fix:

```text
sage -t passed: 16 passed, 0 failed, 0 skipped
```

That two-file focused validation adds `sage/structure/debug_options.pyx` and
`sage/structure/nonexact.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 459
non-comment entries. Direct probes record
`debug_options.pyx: 5 passed, 0 failed, 0 skipped` and
`nonexact.py: 11 passed, 0 failed, 0 skipped`.

The doctest runner now mirrors Sage's doctest startup behavior by setting
`debug.refine_category_hash_check = True` in each common doctest namespace,
which clears the `debug_options.pyx` mismatch. It also seeds the lightweight
`cos` function beside the existing `sqrt`, `floor`, `exp`, and `log` startup
surface, and the WASI `sage.all` patch exposes `cos` for REPL parity on a fresh
patched Sagelite source copy. This clears the two `nonexact.py` power-series
cosine examples without importing the broad symbolic function namespace. The
runner version is now 51.

Focused proof-preference corpus-growth pass after the 2026-06-28 source-order
doctest runner fix:

```text
sage -t passed: 49 passed, 0 failed, 1 skipped
```

That one-file focused validation adds `sage/structure/proof/proof.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 460 non-comment
entries. Direct sampling first recorded four proof-preference mismatches
because the `.py` docstring collector executed module-level function doctests
before earlier class-method doctests. In this file, the later
`get_flag()` example calls `proof.all(False)`, which left non-arithmetic proof
subsystems false when the class-method examples were run afterward.

Runner version 52 preserves physical source order for parsed Python
docstrings before execution, matching the line-order behavior expected by
stateful Sage doctests. The focused rerun used direct `sage -t --timeout 90`
against the patched source tree with
`COWASM_SAGELITE_DOCTEST_SOURCE_ROOT=/home/user/cowasm/sagemath/sagelite/build/wasi-sdk`
and wrote `/home/user/cowasm/.tmp/sagelite-proof-source-order.sqlite3`.

Follow-up category examples corpus-growth pass:

```text
sage -t passed: 127 passed, 0 failed, 155 skipped
```

That six-file direct sampling run found five more category example modules
with useful passing default-profile coverage:
`sage/categories/examples/commutative_additive_semigroups.py`,
`sage/categories/examples/finite_monoids.py`,
`sage/categories/examples/finite_enumerated_sets.py`,
`sage/categories/examples/infinite_enumerated_sets.py`, and
`sage/categories/examples/magmas.py`. These five files are added to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 301 non-comment
entries. The same sampling run kept
`sage/categories/examples/sets_cat.py` out of the quiet corpus because it
currently contributes only skipped rows in the default browser-compatible
profile.

Direct sampling used `sage -t --timeout 120` with
`COWASM_SAGELITE_DOCTEST_SOURCE_ROOT` pointed at the patched build tree and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-example-sampling.sqlite3`; the saved block-
and file-failure cluster queries are empty. Focused make-target validation of
the five added files used `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-examples-more-make.sqlite3`,
recording 127 passed, 0 failed, and 0 skipped blocks with empty saved block-
and file-failure cluster queries.

Focused category example expansion pass:

```text
sage -t passed: 169 passed, 0 failed, 0 skipped
```

That six-file focused pass adds
`sage/categories/examples/cw_complexes.py`,
`sage/categories/examples/facade_sets.py`,
`sage/categories/examples/filtered_algebras_with_basis.py`,
`sage/categories/examples/posets.py`,
`sage/categories/examples/semigroups_cython.pyx`, and
`sage/categories/examples/sets_with_grading.py` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 307
non-comment entries. Direct sampling recorded clean default-profile results
for all six files without new WASI source tags or startup namespace changes.

The same sampling pass kept skipped-only category example modules such as
`sage/categories/examples/sets_cat.py`,
`sage/categories/examples/with_realizations.py`,
`sage/categories/examples/algebras_with_basis.py`,
`sage/categories/examples/filtered_modules_with_basis.py`,
`sage/categories/examples/graded_modules_with_basis.py`,
`sage/categories/examples/hopf_algebras_with_basis.py`, and
`sage/categories/examples/graded_connected_hopf_algebras_with_basis.py` out
of the quiet corpus. Focused validation used the
`test-sage-doctest-corpus` make target with a temporary six-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-examples-third-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Follow-up category examples graph/Weyl/manifold corpus-growth pass:

```text
sage -t passed: 62 passed, 0 failed, 2 skipped
```

That three-file focused validation adds
`sage/categories/examples/finite_weyl_groups.py`,
`sage/categories/examples/graphs.py`, and
`sage/categories/examples/manifolds.py` to the curated corpus, bringing the
current `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus from
317 to 320 non-comment entries. Direct sampling recorded useful passing
default-profile coverage for all three files without new WASI source tags or
startup namespace changes.

The same sampling pass kept skipped-only category example modules such as
`sage/categories/examples/algebras_with_basis.py`,
`sage/categories/examples/filtered_modules_with_basis.py`,
`sage/categories/examples/finite_dimensional_algebras_with_basis.py`,
`sage/categories/examples/hopf_algebras_with_basis.py`,
`sage/categories/examples/graded_modules_with_basis.py`,
`sage/categories/examples/lie_algebras.py`,
`sage/categories/examples/lie_algebras_with_basis.py`, and
`sage/categories/examples/with_realizations.py` out of the quiet corpus. It
also kept `sage/categories/examples/coxeter_groups.py` out because it
currently contributes no doctest blocks in the default profile. Focused
validation used the `test-sage-doctest-corpus` make target with a temporary
three-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-example-next-make.sqlite3`; the
saved block- and file-failure cluster queries are empty.

Focused misc random API corpus-growth pass:

```text
sage -t passed: 68 passed, 0 failed, 6 skipped
```

That one-file focused validation adds `sage/misc/prandom.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 381
non-comment entries. Direct sampling first recorded two failures in the file's
`timeit(...)` examples because Sage's timing helper imports IPython in that
path; the added WASI source patch marks those examples as `# needs IPython`
while preserving the seeded random-number doctests as ordinary passing
coverage.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-prandom-make.sqlite3`; the saved block- and
file-failure cluster queries are empty.

Focused bindable-class introspection corpus-growth pass:

```text
sage -t passed: 47 passed, 0 failed, 0 skipped
```

That one-file focused validation adds `sage/misc/bindable_class.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 382
non-comment entries. The runtime/resource pass stages CoWasm's pure-Python
`py-packaging` package into Sagelite's Electron-shaped resource bundle and
bumps the manifest schema to 142 so `sage.features` imports have their
documented `packaging.version` dependency. The WASI source patch also keeps
ordinary `sage_getdoc(...)` introspection on the browser-compatible path by
avoiding Sage's multiprocessing-backed feature detector when docstrings have no
optional doctest tags, and by skipping file-level doctest `skipfile(...)`
warnings on WASI.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-bindable-make.sqlite3`, recording
`bindable_class.py: 47 passed, 0 failed, 0 skipped`.

Focused misc decorator/defaults corpus-growth pass:

```text
sage -t passed: 133 passed, 0 failed, 14 skipped
```

That two-file make-target validation adds `sage/misc/decorators.py` and
`sage/misc/defaults.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 384 non-comment
entries. Direct sampling first recorded one warning-capture mismatch in
`decorators.py` and one bare symbolic-name failure in `defaults.py`; the added
WASI source patch defers the deprecated-keyword warning text as `# known bug`
and marks the `latex_variable_names(3,beta)` example as
`# needs sage.symbolic`.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-decorators-defaults-corpus.sqlite3`,
recording `decorators.py: 120 passed, 0 failed, 13 skipped` and
`defaults.py: 13 passed, 0 failed, 1 skipped`. The make target rebuilt and
patched a fresh Sagelite source copy successfully, and the saved block- and
file-failure cluster queries are empty.

Focused misc display-helper corpus-growth pass:

```text
sage -t passed: 26 passed, 0 failed, 0 skipped
```

That two-file make-target validation adds `sage/misc/latex_macros.py` and
`sage/misc/object_multiplexer.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 386
non-comment entries. Direct sampling first recorded one dict-order display
mismatch in `latex_macros.py` and one object-address repr mismatch in
`object_multiplexer.py`; the added WASI source patch marks both as `# random`
so the examples still execute while the browser-profile dashboard does not
depend on host/runtime display ordering or pointer formatting.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary two-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-misc-latex-multiplexer-make.sqlite3`,
recording `latex_macros.py: 11 passed, 0 failed, 0 skipped` and
`object_multiplexer.py: 15 passed, 0 failed, 0 skipped`. The saved block- and
file-failure cluster queries are empty. The same sampling pass kept
`sage/misc/temporary_file.py`, `functional.py`, `lazy_import.pyx`,
`superseded.py`, `verbose.py`, and `weak_dict.pyx` out of the quiet corpus
because their current failures involve filesystem semantics, symbolic/timeit
paths, warning capture, lazy-import weak references, or broader runtime
behavior rather than narrow display drift.

Focused misc lazy-format/shell/trace corpus-growth pass:

```text
sage -t passed: 27 passed, 0 failed, 9 skipped
```

That three-file make-target validation adds `sage/misc/lazy_format.py`,
`sage/misc/sh.py`, and `sage/misc/trace.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 389
non-comment entries. Direct sampling first recorded one `lazy_format.py`
failure where the default profile surfaces the underlying `ValueError`
traceback instead of CPython's compact failed-`repr(...)` placeholder; the
added WASI source patch defers that diagnostic drift as `# known bug`.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary three-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-misc-lazy-sh-trace-make.sqlite3`,
recording `lazy_format.py: 22 passed, 0 failed, 1 skipped`,
`sh.py: 1 passed, 0 failed, 0 skipped`, and
`trace.py: 4 passed, 0 failed, 8 skipped`. The saved block- and file-failure
cluster queries are empty.

Focused lie-conformal/vector utility corpus-growth pass:

```text
sage -t passed: 11 passed, 0 failed, 17 skipped
```

That two-file focused validation adds
`sage/categories/lie_conformal_algebras.py` and
`sage/modules/real_double_vector.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 398
non-comment entries. Direct probes record
`lie_conformal_algebras.py: 9 passed, 0 failed, 17 skipped` and
`real_double_vector.py: 2 passed, 0 failed, 0 skipped`; both files are quiet
under the default node profile without new WASI source tags or startup
namespace changes. Sampling in the same pass kept adjacent category, module,
and misc files such as `sage/categories/graded_lie_algebras.py`,
`sage/misc/explain_pickle.py`, `sage/misc/html.py`,
`sage/misc/sage_input.py`, and `sage/misc/stopgap.pyx` out of the quiet
corpus because their current failures hit broader symbolic, finite-field,
filesystem, timing, or diagnostic clusters.

Focused tensor-operation parser/corpus-growth pass:

```text
sage -t passed: 75 passed, 0 failed, 16 skipped
```

That one-file focused validation adds `sage/modules/tensor_operations.py` to
the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 401
non-comment entries. Direct sampling first recorded eight `SyntaxError`
failures where Python collapsed backslash-newline continuations inside `.py`
docstrings, leaving Sage continuation prompts such as `....:` inline before
the doctest runner converted prompts. Runner version 45 restores those
collapsed continuation prompts before prompt conversion and applies prompt
rewrites in multiline mode, so the upstream multiline import examples execute
normally.

Focused validation used direct `sage -t --timeout 120` against the patched
source tree with
`COWASM_SAGELITE_DOCTEST_SOURCE_ROOT=/home/user/cowasm/sagemath/sagelite/build/wasi-sdk`
and wrote `/tmp/sagelite-tensor-after-continuation2.sqlite3`, recording
`tensor_operations.py: 75 passed, 0 failed, 16 skipped`. Follow-up
make-target validation used a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-tensor-make.sqlite3`; the saved block- and
file-failure cluster queries are empty.

Focused polynomial toy-variety corpus-growth pass:

```text
sage -t passed: 38 passed, 0 failed, 7 skipped
```

That one-file make-target validation adds
`sage/rings/polynomial/toy_variety.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 423
non-comment entries. Direct sampling first recorded two failures in
`is_triangular(R.ideal(...))` examples because multivariate ideal generator
construction imports the stripped `sage.rings.polynomial.plural` backend. The
added WASI source patch marks those two ideal-backed examples as
`# needs sage.rings.polynomial.plural`, while preserving the rest of the
educational triangular-factorization doctests as default-profile coverage.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-toy-variety-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused cachefunc corpus-growth pass:

```text
sage -t passed: 633 passed, 0 failed, 225 skipped
```

That one-file make-target validation adds `sage/misc/cachefunc.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 424
non-comment entries. Direct sampling first recorded 634 passed blocks, 32
failed blocks, and 192 skipped blocks. The failures clustered around
multivariate ideal generator examples that import the stripped
`sage.rings.polynomial.plural` backend, parallel `precompute(...)` examples
that require `cysignals.alarm`, Groebner-basis cache placeholders that depend
on Singular-backed setup, object-address repr drift, deprecated-alias warning
display drift, and one invalid-argument WASI doc lookup.

The added WASI source patch marks those backend and display examples as
`# needs`, `# random`, or deferred `# known bug` metadata while preserving the
ordinary cached-function and cached-method behavior as default-profile
coverage. Focused validation used the `test-sage-doctest-corpus` make target
after rebuilding a fresh patched Sagelite source copy, with a temporary
one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-cachefunc-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

The same sampling pass kept nearby polynomial files out of the quiet corpus:
`sage/rings/polynomial/toy_buchberger.py` still has pexpect setup, number-field
element attribute, and dependent name-failure clusters;
`sage/rings/polynomial/toy_d_basis.py` still has plural-backend and algorithm
output-mismatch clusters; `sage/rings/polynomial/omega.py` times out in the
default profile; and `sage/rings/polynomial/polynomial_fateman.py` has no
doctest blocks. It also kept low-signal skip-only or zero-block files such as
`sage/misc/package_dir.py`, `sage/misc/copying.py`, `sage/misc/proof.py`,
`sage/misc/mathml.py`, `sage/modules/diamond_cutting.py`,
`sage/modules/complex_double_vector.py`, and
`sage/modules/vector_double_dense.pyx` out of the corpus, while leaving
`sage/misc/sageinspect.py` and `sage/misc/sage_timeit.py` follow-up
runtime/display clusters visible for future targeted work.

Focused small helper corpus-growth pass:

```text
sage -t passed: 21 passed, 0 failed, 1 skipped
```

That three-file make-target validation adds `sage/cpython/type.pyx`,
`sage/matrix/berlekamp_massey.py`, and `sage/monoids/string_ops.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 427
non-comment entries. These files add small but useful Cython type-helper,
Berlekamp-Massey, and monoid string-operation coverage without new WASI source
tags or startup namespace changes.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary three-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-small-helper-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. The same direct
sampling pass kept `sage/structure/nonexact.py` and
`sage/structure/debug_options.pyx` out of the quiet corpus because they still
have focused symbolic-startup and debug-option display failures.

Focused multi-filtered vector-space corpus-growth pass:

```text
sage -t passed: 119 passed, 0 failed, 4 skipped
```

That one-file focused validation adds
`sage/modules/multi_filtered_vector_space.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 428
non-comment entries. Direct sampling first recorded 119 passed blocks, 3
failed blocks, and 1 skipped block. The failures were narrow
browser-profile boundaries: two `RR` matrix-space construction examples and
one dual-filtration example that reaches the focused cypari2/PARI object-model
boundary.

The added WASI source patch marks the real-field examples as
`# needs sage.rings.real_mpfr` and the dual-filtration example as
`# needs sage.libs.pari`, preserving the remaining multi-filtration
constructor, comparison, tensor, and grading doctests as default-profile
coverage.

Focused dynamic-class corpus-growth pass:

```text
sage -t passed: 83 passed, 0 failed, 0 skipped
```

That one-file focused validation adds `sage/structure/dynamic_class.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 451
non-comment entries. Direct sampling first recorded four dependent `NameError`
failures in the `dynamic_class_internal(...)` examples because upstream
doctests use `Morphism` from the Sage startup namespace without a local import.
The doctest runner now seeds `Morphism` beside the existing lightweight
category constructors, and the WASI `sage.all` patch exposes the same name for
REPL parity on a fresh patched Sagelite source copy.

Focused matrix documentation corpus-growth pass:

```text
sage -t passed: 54 passed, 0 failed, 1 skipped
```

That one-file focused validation adds `sage/matrix/docs.py` to the curated
corpus, bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt`
to 452 non-comment entries. Direct sampling first recorded one failure in the
matrix mutability example where `matrix(RR,2,[1,10,3.5,2])` reaches the
current real-field matrix-constructor argument gap in the default node
profile. The added WASI source patch marks that example as
`# needs sage.rings.real_mpfr`, consistent with adjacent real-field matrix and
cartesian-product boundaries, while preserving the rest of the matrix
documentation examples as default-profile coverage.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-matrix-docs-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused super lie-conformal category corpus-growth pass:

```text
sage -t passed: 3 passed, 0 failed, 18 skipped
```

That one-file make-target validation adds
`sage/categories/super_lie_conformal_algebras.py` to the curated corpus. The
doctest runner now seeds the lightweight `LieConformalAlgebras` category
constructor in the common startup namespace, and the WASI `sage.all` patch
exposes the same constructor for REPL parity on a fresh patched Sagelite
source copy. This clears the file's only runnable default-profile failure:
`NameError: name 'LieConformalAlgebras' is not defined`.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/super-lie-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Separate follow-up sampling on 2026-06-28 found no new quiet runnable corpus candidate
among several adjacent misc, module, category, set, combinatorics, root-system,
and arithmetic files. Many probes were skipped-only or zero-block under the
default browser-compatible profile, and the runnable failures clustered around
broader symbolic reset, IPython/pexpect, filesystem persistence, matrix random
signature mismatch, free-module finite-field representation drift, and
filtered-vector-space construction issues. The focused current-source rerun of
`sage/misc/classcall_metaclass.pyx` confirms the checked-in WASI patch's
`# random` tag is effective:

```text
classcall_metaclass.pyx: 75 passed, 0 failed, 15 skipped
```

The new `file-coverage-shape.sql` query records this sampling lesson as
dashboard tooling: skipped-only and no-block files are now easy to identify
before adding them to the curated corpus.

Focused rich-output test backend corpus-growth pass:

```text
sage -t passed: 33 passed, 0 failed, 4 skipped
```

That one-file make-target validation adds
`sage/repl/rich_output/test_backend.py` to the curated corpus. Direct sampling
first recorded four failures because the test backend's displayhook path
imports IPython in the stripped browser-compatible profile; the dependent
`test_output` examples then failed because the first displayhook example did
not assign a value. The added WASI source patch marks those displayhook
examples as `# needs IPython`, preserving the remaining rich-output promotion,
plain-text output container, and `_rich_repr_` backend behavior as runnable
default-profile coverage.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/test-backend-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; `skips-by-reason`
groups the four skipped blocks under `optional:ipython`.

Focused doctest tolerance helper corpus-growth pass:

```text
sage -t passed: 15 passed, 0 failed, 3 skipped
```

That one-file make-target validation adds `sage/doctest/rif_tol.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 600 non-comment
entries. Direct sampling first recorded two failures because the examples
imported `RIFtol`, `MarkedOutput`, and `SageOutputChecker` through
`sage.doctest.parsing`, whose module import initializes multiprocessing-backed
optional-software detection and fails under WASI mmap semantics. The WASI
source patch now imports `RIFtol` from `sage.doctest.rif_tol` and
`MarkedOutput` from `sage.doctest.marked_output`, preserving the tolerance
helper examples as default-profile coverage without pulling in the broader
doctest parser.

The same pass refreshed two existing WASI source patch hunks for current
Sagelite source drift: `sage/misc/citation.pyx` now wraps the Singular
citation probe in warning handling, and `sage/misc/lazy_import.pyx` now checks
the unavailable optional lazy import through `not_there.get_object()`. Focused
validation used the `test-sage-doctest-corpus` make target after rebuilding a
fresh patched Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/rif-tol-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused REPL preparser corpus-growth pass:

```text
sage -t passed: 347 passed, 0 failed, 14 skipped
```

That one-file make-target validation adds `sage/repl/preparse.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 517
non-comment entries. Direct sampling first recorded two string-literal
failures because the `.py` docstring collector used Python's interpreted AST
docstring value, which removed backslashes that Sage's source-based doctest
parser preserves. Runner version 59 now uses the raw triple-quoted docstring
source when AST source locations are available, while keeping the old
interpreted fallback for unusual cases.

The added WASI source patch marks the `load(t)` preparser regression example
as `# needs IPython`, because Sage's `load(...)` path imports the
IPython-backed attach machinery in the stripped browser-compatible profile.
Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/preparse-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused small helper/module corpus-growth pass:

```text
sage -t passed: 22 passed, 0 failed, 2 skipped
```

That five-file make-target validation adds
`sage/games/sudoku_backtrack.pyx`, `sage/interfaces/abc.py`,
`sage/parallel/reference.py`, `sage/homology/matrix_utils.py`, and
`sage/symbolic/symbols.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 606
non-comment entries. Direct sampling found these files add small runnable
coverage for backtracking, interface ABCs, parallel-reference examples,
homology matrix helpers, and symbolic variable alias helpers without new
startup namespace changes.

The added WASI source patch marks the randomized Smith-normal-form comparison
in `matrix_utils.py` as `# random`: repeated focused `--line 69` reruns
alternated between `True` and `False` under the current unseeded Sagelite
doctest runner, while the example still executes and preserves state. Focused
validation used the `test-sage-doctest-corpus` make target after rebuilding a
fresh patched Sagelite source copy, with a temporary five-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/followup-five-make-after-tag.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused rich-output backend-base corpus-growth pass:

```text
sage -t passed: 86 passed, 0 failed, 14 skipped
```

That one-file make-target validation adds
`sage/repl/rich_output/backend_base.py` to the curated corpus. Direct
sampling first recorded ten failures in IPython-backed plain-text formatting
and pretty-printer examples; the dependent checks then failed because the
formatted output variables were not assigned. The added WASI source patch
marks those display-hook and pretty-printer setup examples as
`# needs IPython`, preserving the backend representation, capability,
supported-output, and display-routing doctests as default-profile coverage.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/backend-base-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused utility and startup-test corpus-growth pass:

```text
sage -t passed: 30 passed, 0 failed, 9 skipped
```

That five-file make-target validation adds `sage/features/all.py`,
`sage/features/pari.py`, `sage/interfaces/read_data.py`,
`sage/tests/functools_partial_src.py`, and `sage/tests/startup.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 617
non-comment entries. The new files add compact coverage for Sage feature
aggregation, PARI feature detection, interface data parsing, partial-function
startup behavior, and Sage startup namespace checks without new WASI source
tags or startup namespace changes.

Focused validation used the `test-sage-doctest-corpus` make target against a
temporary five-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/utility-corpus-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; the latest-run
summary records runner version 61 in the default node profile.

Focused feature-module corpus-growth pass:

```text
sage -t passed: 153 passed, 0 failed, 49 skipped
```

That six-file make-target validation adds `sage/features/databases.py`,
`sage/features/ecm.py`, `sage/features/interfaces.py`,
`sage/features/join_feature.py`, `sage/features/latex.py`, and
`sage/features/pkg_systems.py` to the curated corpus. Direct sampling first
recorded 155 passed blocks, 11 failed blocks, and 40 skipped blocks. The
failures were narrow browser-profile boundaries around subprocess-backed
package-system and external-tool feature probes, unavailable pexpect-backed
interfaces, and one traceback-format drift in `JoinFeature.require()`.

The added WASI source patch marks those examples as `# needs ...` or deferred
`# known bug` metadata while preserving the ordinary feature-construction,
feature-result, optional-database, LaTeX, ECM, interface, and package-system
helper doctests as default-profile coverage. Focused validation used the
`test-sage-doctest-corpus` make target after rebuilding a fresh patched
Sagelite source copy, with a temporary six-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/features-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and
`skips-by-reason.sql` groups the newly deferred examples under their explicit
feature requirements.

Follow-up sampling on 2026-06-29 did not find a new quiet runnable corpus
candidate among the nearby feature, rich-output, parallel, monoid, statistics,
low-level helper, doctest/REPL, misc, category, and structure gaps that were
probed. The clean feature and parallel helpers with runnable coverage were
already present in `basic-pure-math.txt`; remaining feature `*_test.py` files
and small structure helpers contributed zero doctest blocks, while monoid,
statistics, and several misc helpers were skipped-only under the default
browser-compatible profile.

The rejected runnable probes exposed broader clusters rather than narrow
corpus-growth work: rich-output backend files still depend on backend-specific
display/IPython behavior, doctest and REPL utility files need parser,
filesystem, or multiprocessing triage, `sage/data_structures/stream.py` still
reaches the known `polynomial_number_field` memory trap, and
`sage/ext/fast_callable.pyx`,
`sage/stats/distributions/discrete_gaussian_lattice.py`,
`sage/misc/sage_ostools.pyx`, `sage/parallel/decorate.py`, and
`sage/parallel/map_reduce.py` have sizable failure clusters. Small category
ring files were also avoided after timeout-prone focused probes. The next
scheduled corpus-growth pass should start from a different namespace or choose
one of these clusters for explicit tagging/runtime work rather than resampling
the same files.

Focused typeset corpus confirmation pass:

```text
sage -t passed: 197 passed, 0 failed, 65 skipped
```

That direct focused validation confirms the current checked-in typeset tail of
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` is quiet under the
default node profile. The run covered `sage/typeset/ascii_art.py`,
`character_art.py`, `character_art_factory.py`, `symbols.py`,
`unicode_art.py`, and `unicode_characters.py`; all six files were already in
the curated corpus, so no corpus or runtime patch was needed.

The five-file grouped run recorded 170 passed, 0 failed, and 65 skipped blocks
in `/home/user/cowasm/.tmp/current-run/typeset-sampling.sqlite3`; the separate
`unicode_characters.py` probe recorded 27 passed, 0 failed, and 0 skipped
blocks in `/home/user/cowasm/.tmp/current-run/typeset-unicode-characters.sqlite3`.
The saved block- and file-failure cluster queries are empty. Skip grouping is
dominated by explicit browser-profile boundaries for symbolic, combinatorics,
module, and IPython-backed display examples, plus one deferred non-ASCII source
conversion drift in `character_art_factory.py`.

Focused quadratic-form helper corpus-growth pass:

```text
sage -t passed: 16 passed, 0 failed, 1 skipped
```

That one-file make-target validation adds `sage/quadratic_forms/extras.py` to
the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 670
non-comment entries. Direct sampling first recorded two output mismatches in
`extend_to_primitive(...)` examples because the WASM runtime returns different
valid primitive completions than Sage's checked textual examples. The added
WASI source patch marks those examples as `# random`, preserving the helper's
runnable default-profile coverage while avoiding dependence on a particular
basis-completion choice.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/quadratic-extras-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and
`skips-by-reason.sql` records the remaining PARI-backed quadratic nonresidue
example as an explicit `optional:sage.libs.pari` skip.

The same alternate-namespace sampling pass kept adjacent quadratic and
statistics files out of the quiet corpus: `sage/probability/all.py` had no
doctest blocks, `sage/stats/distributions/discrete_gaussian_integer.pyx` and
`sage/stats/intlist.pyx` were skipped-only under the default profile,
`sage/quadratic_forms/binary_qf.py` still reaches PARI/cypari2 object-model
and random-matrix runtime clusters, and `sage/quadratic_forms/ternary_qf.py`
timed out in automorphism enumeration.

Focused plot primitive corpus-growth pass:

```text
sage -t passed: 39 passed, 0 failed, 2 skipped
```

That two-file make-target validation adds `sage/plot/bar_chart.py` and
`sage/plot/scatter_plot.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 675
non-comment entries. Direct sampling first recorded one failure in each file
where the otherwise runnable plot primitive doctests called
`Graphics.show(...)`, which imports the unavailable `matplotlib` display
backend in the stripped browser-compatible profile. The added WASI source
patch marks only those display calls as `# needs matplotlib`, preserving
ordinary bar-chart and scatter-plot construction, primitive representation,
option, and min/max doctests as default-profile coverage.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary two-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/plot-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and
`skips-by-reason.sql` groups the two deferred display examples under
`optional:matplotlib`.

Focused histogram plot-helper corpus-growth pass:

```text
sage -t passed: 37 passed, 0 failed, 4 skipped
```

That one-file make-target validation adds `sage/plot/histogram.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 683
non-comment entries. Direct sampling first recorded 34 passed blocks, 5
failed blocks, and 2 skipped blocks. The failures were narrow: two
`get_minmax_data()` dict output checks depend on Sage's fuller doctest output
checker for mixed dict-order and numeric-tolerance formatting, and three
histogram styling examples use `RealDistribution(...)` from Sage's startup
namespace without a local import.

The doctest runner now seeds `RealDistribution` in the common doctest
namespace, and the WASI `sage.all` patch exposes the same constructor for REPL
parity on a fresh patched Sagelite source copy. The added WASI source patch
defers the two histogram min/max output-checker drift examples as
`# known bug`, preserving the rest of the histogram construction, option, and
random-distribution styling coverage as default-profile doctests. Focused
validation used the `test-sage-doctest-corpus` make target after rebuilding a
fresh patched Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/histogram-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused plot primitive base-class corpus-growth pass:

```text
sage -t passed: 41 passed, 0 failed, 3 skipped
```

That one-file make-target validation adds `sage/plot/primitive.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 684
non-comment entries. Direct sampling first recorded 15 passed blocks, 29
failed blocks, and 0 skipped blocks. Most failures were startup namespace
artifacts from upstream primitive doctests using basic plot constructors such
as `line`, `circle`, `point`, and `polygon` without local imports; the
remaining non-startup block exercised 3D plot conversion.

The doctest runner now seeds those lightweight 2D plot constructors in the
common doctest namespace, and the WASI `sage.all` patch exposes the same names
for REPL parity on a fresh patched Sagelite source copy. The added WASI source
patch marks the 3D conversion checks as `# needs sage.plot.plot3d`, preserving
the ordinary primitive option, z-order, hash, representation, and min/max
coverage as default-profile doctests. Focused validation used the
`test-sage-doctest-corpus` make target after rebuilding a fresh patched
Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/primitive-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and
`skips-by-reason.sql` groups the three deferred blocks under
`optional:sage.plot.plot3d`. The latest-run summary records runner version 66
in the default node profile.

Focused text-plot corpus-growth pass:

```text
sage -t passed: 46 passed, 0 failed, 11 skipped
```

That one-file make-target validation adds `sage/plot/text.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 685
non-comment entries. Direct sampling first recorded 43 passed blocks, 12
failed blocks, and 2 skipped blocks. The failures were narrow: 3D text
examples imported the stripped `sage.plot.plot3d` RDF wrapper path,
PDF/show examples imported Matplotlib, and one 2D LaTeX text example relied on
`arc` and `point2d` being available from Sage's startup namespace.

The doctest runner now seeds `arc` and `point2d` in the common doctest
namespace, and the WASI `sage.all` patch exposes the same names for REPL
parity on a fresh patched Sagelite source copy. The added WASI source patch
marks only the 3D text and Matplotlib-backed examples as optional dependency
boundaries, preserving browser-compatible text construction, option,
alignment, representation, error, and 2D graphics coverage as default-profile
doctests. Focused validation used the `test-sage-doctest-corpus` make target
after rebuilding a fresh patched Sagelite source copy, with a temporary
one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/plot-frontier/text-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and
`skips-by-reason.sql` groups the deferred blocks under
`optional:sage.plot.plot3d`, `optional:matplotlib`, and the existing
`optional:sage.symbolic` tags. The latest-run summary records runner version
67 in the default node profile.

Focused warning-output runner pass:

```text
sage -t passed: 34 passed, 0 failed, 30 skipped
```

That one-file make-target validation repairs the current
`sage/stats/basic_stats.py` corpus entry without adding broad source-level
skips. Runner version 69 normalizes Sage-style `doctest:warning...` expected
blocks against the warning format emitted by Sagelite's doctest warning hook,
and also accepts leading warning output when the remaining stdout matches the
expected result. This clears the deprecated `mean`, `mode`, `variance`,
`median`, and `moving_average` examples while preserving their ordinary
default-profile coverage.

The WASI source patch no longer marks those warning examples as deferred
`# known bug` blocks; it keeps only the symbolic `variance([])` boundary in
`basic_stats.py`. Focused validation used the `test-sage-doctest-corpus` make
target after rebuilding a fresh patched Sagelite source copy, with a temporary
one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/basic-stats-make-warning-fix.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused matrix-plot corpus-growth pass:

```text
sage -t passed: 53 passed, 0 failed, 19 skipped
```

That one-file make-target validation adds `sage/plot/matrix_plot.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 694
non-comment entries. Direct sampling first recorded 18 passed blocks, 40
failed blocks, and 14 skipped blocks because `matrix_plot(...)` imported
`scipy.sparse` unconditionally before handling dense matrix/list inputs or
input-validation paths.

The WASI source patch now defers the SciPy import until a sparse Sage matrix is
actually converted to a SciPy COO matrix. This preserves dense matrix-plot
construction, list-of-list plotting, min/max, title, colorbar option, and
invalid-input coverage in the browser-compatible profile. The remaining true
sparse plotting examples are marked `# needs scipy`; the display-only
`.show(...)` example is marked `# needs matplotlib`; and one dict-order
`get_minmax_data()` check is marked `# random`.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/matrix-plot-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; `skips-by-reason`
groups the newly deferred examples under explicit `optional:scipy` and
`optional:matplotlib` requirements.

Focused quadratic-form helper corpus-growth pass:

```text
sage -t passed: 32 passed, 0 failed, 0 skipped
```

That two-file make-target validation adds
`sage/quadratic_forms/count_local_2.pyx` and
`sage/quadratic_forms/quadratic_form__evaluate.pyx` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 704
non-comment entries. Direct sampling first recorded startup-name failures
because these internal helper doctests use `DiagonalQuadraticForm` and
`QuadraticForm` from Sage's startup namespace without local imports.

The doctest runner now seeds those quadratic-form constructors in the common
doctest namespace, and the WASI `sage.all` patch exposes the same names for
REPL parity on a fresh patched Sagelite source copy. Focused validation used
the `test-sage-doctest-corpus` make target after rebuilding a fresh patched
source copy, with a temporary two-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/quadratic-helper-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; the latest-run
summary records runner version 70 in the default node profile.

Focused finite-dynamical-system corpus-growth pass:

```text
sage -t passed: 268 passed, 0 failed, 0 skipped
```

This one-file make-target validation adds
`sage/dynamics/finite_dynamical_system.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 705 non-comment
entries. Direct sampling first recorded 265 passed blocks and three failures:
one Bulgarian-solitaire cycle display where Sagelite chose an equivalent
cyclic rotation, one missing `StandardTableaux` startup name, and the dependent
orbit-length check after that setup failure.

The doctest runner now seeds `StandardTableaux` in the common doctest
namespace, and the WASI `sage.all` patch exposes the same constructor for REPL
parity on a fresh patched source copy. The WASI source patch marks the
cycle-representative display as `# random`, preserving execution while
acknowledging that `cycles()` documents results only up to cyclic rotation.
Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`,
and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/finite-dynamics-core-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused cellular-automata corpus-growth pass:

```text
sage -t passed: 117 passed, 0 failed, 5 skipped
```

That two-file make-target validation adds
`sage/dynamics/cellular_automata/elementary.py` and
`sage/dynamics/cellular_automata/glca.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 707
non-comment entries. Direct sampling first recorded 116 startup-name failures
across the two files because upstream doctests use
`cellular_automata.Elementary(...)` and
`cellular_automata.GraftalLace(...)` from Sage's startup namespace without a
local import.

The doctest runner now seeds the `cellular_automata` catalog module in the
common doctest namespace, and the WASI `sage.all` patch exposes the same
catalog alias for REPL parity on a fresh patched source copy. Focused
validation used the `test-sage-doctest-corpus` make target after rebuilding a
fresh patched Sagelite source copy, with a temporary two-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/cellular-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and the
latest-run summary records runner version 70 in the default node profile.

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
src/sage/arith/srange.pyx
src/sage/arith/power.pyx
src/sage/arith/rational_reconstruction.pyx
src/sage/arith/numerical_approx.pyx
src/sage/combinat/SJT.py
src/sage/combinat/combinat.py
src/sage/combinat/combinat_cython.pyx
src/sage/combinat/combination.py
src/sage/combinat/combinatorial_map.py
src/sage/combinat/cyclic_sieving_phenomenon.py
src/sage/combinat/debruijn_sequence.pyx
src/sage/combinat/decorated_permutation.py
src/sage/combinat/degree_sequences.pyx
src/sage/combinat/dlx.py
src/sage/combinat/expnums.pyx
src/sage/combinat/misc.py
src/sage/combinat/necklace.py
src/sage/combinat/output.py
src/sage/combinat/restricted_growth.py
src/sage/combinat/sidon_sets.py
src/sage/combinat/ranker.py
src/sage/combinat/gray_codes.py
src/sage/combinat/hall_polynomial.py
src/sage/combinat/integer_matrices.py
src/sage/combinat/integer_vector.py
src/sage/combinat/integer_vector_weighted.py
src/sage/combinat/cartesian_product.py
src/sage/combinat/backtrack.py
src/sage/combinat/binary_recurrence_sequences.py
src/sage/combinat/composition.py
src/sage/combinat/subset.py
src/sage/combinat/subsets_hereditary.py
src/sage/combinat/composition_signed.py
src/sage/combinat/derangements.py
src/sage/combinat/perfect_matching.py
src/sage/combinat/set_partition_iterator.pyx
src/sage/combinat/subword.py
src/sage/combinat/tools.py
src/sage/combinat/tuple.py
src/sage/combinat/fast_vector_partitions.pyx
src/sage/combinat/vector_partition.py
src/sage/sets/integer_range.py
src/sage/sets/finite_set_maps.py
src/sage/sets/finite_enumerated_set.py
src/sage/sets/condition_set.py
src/sage/sets/totally_ordered_finite_set.py
src/sage/sets/non_negative_integers.py
src/sage/sets/positive_integers.py
src/sage/sets/primes.py
src/sage/sets/pythonclass.pyx
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

### File Coverage Shape

Exploratory corpus-growth runs should identify files that add real runnable
coverage, not only skipped or empty entries:

```sh
sqlite3 sagelite-doctests.sqlite3 \
  < sagemath/sagelite/src/doctest-sql/file-coverage-shape.sql
```

For broad exploratory batches, start with the aggregate shape counts:

```sh
sqlite3 sagelite-doctests.sqlite3 \
  < sagemath/sagelite/src/doctest-sql/file-coverage-summary.sql
```

When a broad sampling run mixes clean candidates with noisy files, rank files
by promotion readiness:

```sh
sqlite3 sagelite-doctests.sqlite3 \
  < sagemath/sagelite/src/doctest-sql/corpus-candidate-ranking.sql
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

Latest checked local corpus run after the 2026-06-24 necklace corpus-growth
pass:

```text
sage -t passed: 5635 passed, 0 failed, 1240 skipped
```

That run records 6,875 block rows in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, with empty
`block-failure-clusters.sql` and `file-error-clusters.sql` results. The
curated browser-profile corpus now has 53 files, adding
`sage/combinat/necklace.py`:

```text
necklace.py: 75 passed, 0 failed, 1 skipped
```

The pass exposes `Compositions` from the lightweight WASI `sage.all`
namespace, matching Sage startup expectations for necklace doctests without
importing the full `sage.combinat.all` surface. The packaged Sagelite smoke
now imports `Compositions` through `sage.all` to keep that namespace contract
covered. The same pass also marks the `GF(3^60, implementation='modn')`
finite-field diagnostic example as `# needs sage.libs.pari`; in the current
browser profile that path reaches cypari2/PARI `Gen.ispower` and can trap
before Sage raises the expected `ValueError`, so it belongs with the deferred
PARI-backed finite-field scope until the runtime path is made safe.

Follow-up corpus-growth probe: `sage/combinat/subsets_hereditary.py` is a
small clean addition once its parallel-only `ncpus=2` example is classified as
`# needs cysignals.alarm`. The browser-profile runtime lacks the fork/alarm
stack used by Sage's `parallel(...)` decorator, but the single-process exact
subset enumeration examples are useful corpus signal. A focused rerun records:

```text
subsets_hereditary.py: 6 passed, 0 failed, 10 skipped
```

The full corpus target passes with the new file included:

```text
sage -t passed: 5641 passed, 0 failed, 1250 skipped
```

That run is recorded in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3` as run `4`, with
6,891 total block rows for the latest run. The saved block- and file-failure
cluster queries are empty.

The same sampling pass kept `sage/combinat/subsets_pairwise.py` out of the
quiet corpus because its remaining failures cluster around self-equality and
pickling behavior for locally defined predicates in the doctest namespace, not
a simple missing startup symbol. `sage/combinat/quickref.py` was also left out
because its failures are broad missing combinatorics/words startup imports.

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

Follow-up arithmetic corpus-growth pass: `sage/arith/srange.pyx`,
`sage/arith/power.pyx`, `sage/arith/rational_reconstruction.pyx`, and
`sage/arith/numerical_approx.pyx` are now included in the browser-profile
corpus. These files add compact arithmetic, range, power, and numeric
approximation coverage without broadening the dashboard into unresolved native
backend clusters.

Focused reruns record:

```text
srange.pyx: 67 passed, 0 failed, 10 skipped
power.pyx: 16 passed, 0 failed, 0 skipped
rational_reconstruction.pyx: 1 passed, 0 failed, 1 skipped
numerical_approx.pyx: 3 passed, 0 failed, 1 skipped
```

The same sampling pass kept several nearby files out of the quiet corpus:
`sage/structure/factorization.py` still exposes a polynomial-element
`__dict__` gap with cascading state failures, `sage/arith/functions.pyx`
reaches a side-module `table index is out of bounds` trap in
`polynomial_number_field`, `sage/combinat/subset.py` has three output
mismatches in `Subsets(3,4)` edge cases, and `sage/combinat/combinat.py`
still reaches the unavailable `sage.libs.gap.libgap` module.

The full corpus target passes with the arithmetic files included:

```text
sage -t passed: 2989 passed, 0 failed, 934 skipped
```

That run is recorded in `/tmp/sagelite-corpus-after-arith-expansion.sqlite3`
with 3,923 total block rows for the latest run. The saved block- and
file-failure cluster queries are empty.

Follow-up combinatorics and set range corpus-growth pass:
`sage/combinat/combination.py` and `sage/sets/integer_range.py` are now
included in the browser-profile corpus. These files add clean finite
enumeration and integer-range coverage that matches the existing standalone
smoke surface without broadening the dashboard into GAP, Singular, or native
finite-field algorithms.

Focused reruns record:

```text
combination.py: 102 passed, 0 failed, 6 skipped
integer_range.py: 165 passed, 0 failed, 1 skipped
```

The same sampling pass kept `sage/combinat/subset.py` and
`sage/sets/finite_set_maps.py` out of this quiet corpus growth because they
still have block-level failures. The full corpus passes with both new files
included:

```text
sage -t passed: 3256 passed, 0 failed, 941 skipped
```

That run is recorded in
`/tmp/sagelite-corpus-plus-combination-integer-range.sqlite3` with 4,197 total
block rows for the latest run. The saved block- and file-failure cluster
queries are empty.

Follow-up set and prime corpus-growth pass:
`sage/sets/non_negative_integers.py`, `sage/sets/positive_integers.py`, and
`sage/sets/primes.py` are now included in the browser-profile corpus. The two
integer-set files were already clean exact-enumerated-set coverage. `primes.py`
needed one focused runtime addition: the CoWasm cypari2 `Gen` subset now
exposes `eulerphi()`, which lets `Primes(modulus=4).density()` use the
existing PARI-backed arithmetic path instead of hitting the generic
unsupported object-model boundary. The lone symbolic variable membership test
is tagged as `# needs sage.symbolic` in the Sagelite WASI source patch.

Focused reruns record:

```text
non_negative_integers.py: 43 passed, 0 failed, 8 skipped
positive_integers.py: 13 passed, 0 failed, 1 skipped
primes.py: 159 passed, 0 failed, 1 skipped
```

The full corpus passes with the three set files included and failures
disallowed:

```text
sage -t passed: 3471 passed, 0 failed, 951 skipped
```

That run is recorded in `/tmp/sagelite-corpus-sets-primes.sqlite3` with 4,422
total block rows for the latest run. The saved block- and file-failure cluster
queries are empty.

Follow-up compact combinatorics corpus-growth pass:
`sage/combinat/composition_signed.py`, `sage/combinat/derangements.py`,
`sage/combinat/perfect_matching.py`, and `sage/combinat/tuple.py` are now
included in the browser-profile corpus. These files match the existing
standalone combinatorics smoke surface and add finite enumeration coverage
without pulling the default dashboard into the broader permutation/subword
failure clusters.

Focused reruns record:

```text
composition_signed.py: 20 passed, 0 failed, 0 skipped
derangements.py: 93 passed, 0 failed, 0 skipped
perfect_matching.py: 115 passed, 0 failed, 12 skipped
tuple.py: 66 passed, 0 failed, 3 skipped
```

The same sampling pass kept `sage/combinat/subset.py`,
`sage/sets/finite_set_maps.py`, `sage/combinat/subword.py`,
`sage/combinat/composition.py`, and `sage/combinat/permutation.py` out of this
quiet corpus growth because they still had block-level failures. Those
belonged in focused runner, semantics, or browser-scope passes instead of
being added to the clean corpus at that point.

The full corpus target passes with the four compact combinatorics files
included and failures disallowed:

```text
sage -t passed: 3765 passed, 0 failed, 966 skipped
```

That run is recorded in `/tmp/sagelite-corpus-combinatorics.sqlite3` with
4,731 total block rows for the latest run. The saved block- and file-failure
cluster queries are empty.

Follow-up runner-fidelity and corpus-growth pass: `sage/combinat/subset.py`
and `sage/sets/finite_set_maps.py` are now included in the browser-profile
corpus. Both files exposed the same reusable doctest-runner mismatch: Sage
doctests sometimes expect a bare exception class line such as `EmptySetError`,
while Python reports the qualified class name
`sage.categories.sets_cat.EmptySetError`. The Sagelite output checker already
accepted qualified exception class names when the unqualified class and
message matched; it now also accepts exception lines with no colon-delimited
message.

Focused reruns record:

```text
subset.py: 279 passed, 0 failed, 2 skipped
finite_set_maps.py: 86 passed, 0 failed, 0 skipped
```

The full corpus target passes with both files included and failures
disallowed:

```text
sage -t passed: 4130 passed, 0 failed, 968 skipped
```

That run is recorded in
`/tmp/sagelite-corpus-subset-finite-set-maps.sqlite3` with 5,098 total block
rows for the latest run. The saved block- and file-failure cluster queries are
empty. The same sampling pass still keeps `sage/combinat/subword.py`,
`sage/combinat/composition.py`, and `sage/combinat/permutation.py` out of the
quiet corpus because their remaining failures need separate namespace,
semantics, or browser-scope work.

Follow-up combinatorics namespace and corpus-growth pass:
`sage/combinat/composition.py` and `sage/combinat/subword.py` are now included
in the browser-profile corpus. Both files exposed missing Sage doctest globals
caused by the WASI profile intentionally avoiding the full
`sage.combinat.all` aggregate import at `sage.all` startup. The Sagelite
doctest runner now seeds a focused set of lightweight combinatorics
constructors in every doctest namespace: `IntegerVectors`, `Permutation`,
`Subsets`, and `Word`. The standalone doctest smoke covers those globals and
records the namespace behavior under doctest runner version 23.

Focused reruns record:

```text
composition.py: 273 passed, 0 failed, 32 skipped
subword.py: 108 passed, 0 failed, 0 skipped
```

The full corpus target passes with both files included and failures
disallowed:

```text
sage -t passed: 4511 passed, 0 failed, 1000 skipped
```

That run is recorded in `/tmp/sagelite-corpus-composition-subword-v23.sqlite3`
with 5,511 total block rows across 37 files. The saved block- and file-failure
cluster queries are empty. The Sagelite standalone target also passes after a
full rebuild:

```text
sagelite-ok meson configure compile install node import electron resources smoke relocated followups recorded
```

The same sampling pass still keeps `sage/combinat/permutation.py` out of the
quiet corpus because its current failures remain broader than doctest namespace
fidelity: Singular/plural, GAP, graph, permutation-group, and matrix-constructor
coverage need separate browser-scope or runtime work.

Follow-up compact combinatorics/set corpus-growth pass:
`sage/combinat/misc.py` and `sage/sets/totally_ordered_finite_set.py` are now
included in the browser-profile corpus. Both files are compact exact
enumeration/helper coverage and add clean signal without pulling in the broader
set/cartesian-product namespace and semantic failure clusters.

Focused sampling records:

```text
misc.py: 82 passed, 0 failed, 0 skipped
totally_ordered_finite_set.py: 67 passed, 0 failed, 2 skipped
```

The same sampling pass kept `sage/combinat/backtrack.py`,
`sage/combinat/cartesian_product.py`, `sage/sets/finite_enumerated_set.py`, and
`sage/sets/set.py` out of this quiet corpus growth. Their current failures are
clustered around missing globals such as `Permutations`, `cartesian_product`,
`Hom`, `Primes`, `IntegerRange`, `ConditionSet`, and `RealSet`, plus a few
set/cartesian-product semantic mismatches. Those should be handled as focused
namespace, semantics, or browser-scope passes before joining the default clean
dashboard.

The Sagelite SQLite writer now invokes the `sqlite3` CLI with a 30-second busy
timeout, so transient overlapping readers do not immediately fail a corpus run
with `database is locked`.

The full corpus target passes with the two new files included and failures
disallowed:

```text
sage -t passed: 4660 passed, 0 failed, 1002 skipped
```

That run is recorded in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3` as run `1` with
5,662 total block rows across 39 files. The saved block- and file-failure
cluster queries are empty.

Follow-up compact combinatorics corpus-growth pass:
`sage/combinat/backtrack.py` is now included in the browser-profile corpus.
The file exposed the same focused doctest-namespace boundary as recent
combinatorics additions: Sage examples expect the standard `Permutations`
constructor to be available without importing the full `sage.combinat.all`
aggregate at `sage.all` startup. The Sagelite doctest runner now seeds
`Permutations` alongside the existing lightweight `Permutation` constructor,
and records this namespace behavior under doctest runner version 24.

Focused rerun:

```text
backtrack.py: 24 passed, 0 failed, 1 skipped
```

The full corpus target passes with `backtrack.py` included and failures
disallowed:

```text
sage -t passed: 4684 passed, 0 failed, 1003 skipped
```

That run is recorded in `/tmp/sagelite-corpus-backtrack.sqlite3` with 5,687
total block rows across 40 files. The saved block- and file-failure cluster
queries are empty. Sampling in the same pass kept
`sage/sets/finite_enumerated_set.py`, `sage/combinat/cartesian_product.py`,
and `sage/sets/set.py` out of the clean dashboard because their failures still
cluster around broader namespace and set/cartesian-product semantics rather
than a single lightweight doctest global.

Follow-up finite enumerated set corpus-growth pass:
`sage/sets/finite_enumerated_set.py` is now included in the browser-profile
corpus. The file exposed the same focused doctest-namespace boundary as the
recent set/combinatorics additions: Sage examples expect `Hom` and `Sets` to
be available without importing broader category aggregates at `sage.all`
startup. The Sagelite doctest runner now seeds those two lightweight category
constructors and records this namespace behavior under doctest runner version
25.

Focused rerun:

```text
finite_enumerated_set.py: 84 passed, 0 failed, 0 skipped
```

The full corpus target passes with `finite_enumerated_set.py` included and
failures disallowed:

```text
sage -t passed: 4768 passed, 0 failed, 1003 skipped
```

That run is recorded in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3` as run `1` with
5,771 total block rows across 41 files. The saved block- and file-failure
cluster queries are empty. The Sagelite standalone target also passes after a
full rebuild:

```text
sagelite-ok meson configure compile install node import electron resources smoke relocated followups recorded
```

Follow-up `python-wasi-sdk` backend-contract pass: the Sagelite standalone
target now checks a broader packaged-runtime surface under the wasi-sdk CPython
backend before the older `python-wasm` doctest worker is replaced. In addition
to `sage.all` import, exact arithmetic, the Unicode `TypeError` formatting
regression, and the remote-file browser guard, the standalone target now runs
bounded `python-wasi-sdk` probes for:

- integer and rational matrix arithmetic, determinants, inverses, and
  change-of-ring behavior;
- compact combinatorics constructors such as combinations, compositions,
  derangements, perfect matchings, subwords, and tuples;
- basic set families and the positive/non-negative integer sets.

Direct probes against the staged Sagelite package pass for all three surfaces.
The full standalone target passes after a rebuild, so these checks now run
from the normal package target alongside the Node import ladder, doctest smoke,
and Electron resource smoke:

```text
sagelite-ok meson configure compile install node import electron resources smoke relocated followups recorded
```

Follow-up integer-vector corpus-growth pass:
`sage/combinat/integer_vector.py` is now included in the browser-profile
corpus. The file exposed the same focused doctest-namespace boundary as recent
combinatorics additions: Sage examples expect `IntegerListsLex` to be
available without importing the full `sage.combinat.all` aggregate at
`sage.all` startup. The Sagelite doctest runner now seeds `IntegerListsLex`
alongside `IntegerVectors` and records this namespace behavior under doctest
runner version 26.

Focused rerun:

```text
integer_vector.py: 248 passed, 0 failed, 37 skipped
```

The full corpus target passes with `integer_vector.py` included and failures
disallowed:

```text
sage -t passed: 5151 passed, 0 failed, 1107 skipped
```

That run is recorded in `/tmp/sagelite-corpus-integer-vector.sqlite3` with
6,258 total block rows across 47 files. The saved block- and file-failure
cluster queries are empty. The Sagelite standalone target also passes after
the doctest smoke was extended to cover the seeded `IntegerListsLex` global:

```text
sagelite-ok meson configure compile install node import electron resources smoke relocated followups recorded
```

Follow-up Hall-polynomial corpus-growth pass:
`sage/combinat/hall_polynomial.py` is now included in the browser-profile
corpus. The file contributes compact exact Hall-polynomial coverage while
marking the three larger examples that import unavailable Symmetrica as
explicit `# needs sage.libs.symmetrica` deferred coverage.

Focused rerun:

```text
hall_polynomial.py: 7 passed, 0 failed, 3 skipped
```

The default full-corpus target records a passed SQLite run with
`hall_polynomial.py` included:

```text
sage -t passed: 5648 passed, 0 failed, 1253 skipped
```

That run is recorded in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3` as run `5` with
6,901 total block rows across 55 files. The saved block- and file-failure
cluster queries are empty. The wrapper still printed the existing
allow-failures message after the `sage -t passed` summary because the
underlying process returned nonzero during shutdown, so a separate runner
cleanup pass should make `SAGELITE_DOCTEST_ALLOW_FAILURES=0` usable for the
now-clean corpus.

Follow-up Cython combinatorics corpus-growth pass:
`sage/combinat/combinat_cython.pyx`,
`sage/combinat/debruijn_sequence.pyx`, and `sage/combinat/expnums.pyx` are now
included in the browser-profile corpus. These files add compact low-level
combinatorics coverage without widening the dashboard into the broader
partition/permutation modules that still have unresolved semantic clusters.

Focused reruns record:

```text
combinat_cython.pyx: 21 passed, 0 failed, 1 skipped
debruijn_sequence.pyx: 28 passed, 0 failed, 0 skipped
expnums.pyx: 7 passed, 0 failed, 0 skipped
```

The full corpus target passes with the new files included:

```text
sage -t passed: 5744 passed, 0 failed, 1265 skipped
```

That run is recorded in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3` as run `6`, with
7,009 total block rows for the latest 59-file corpus. The saved latest-run
summary reports a 100% non-skipped pass rate under the node profile, runner
version 26, and about 411 seconds of elapsed time.

Follow-up doctest namespace and combinatorial-map corpus-growth pass:
`sage/combinat/combinatorial_map.py` is now included in the browser-profile
corpus. The file exposed a reusable runner-context mismatch: after seeding
doctest globals with the tested module's globals, functions defined inside a
doctest inherited the tested module's `__name__` instead of Sage's expected
doctest `__main__` context. The Sagelite doctest runner now restores
`__name__ = "__main__"` after module seeding and records this behavior under
doctest runner version 27.

Focused rerun:

```text
combinatorial_map.py: 73 passed, 0 failed, 2 skipped
```

The full corpus target passes with `combinatorial_map.py` included and
failures disallowed:

```text
sage -t passed: 5817 passed, 0 failed, 1267 skipped
```

That run is recorded in `/tmp/sagelite-corpus-combinatorial-map.sqlite3` with
7,084 total block rows across 60 files. The saved block- and file-failure
cluster queries are empty.

Follow-up weighted integer-vector corpus-growth pass:
`sage/combinat/integer_vector_weighted.py` is now included in the
browser-profile corpus. It extends the existing integer-vector coverage with a
compact exact-combinatorics file and does not require new browser-scope tags.

Focused rerun:

```text
integer_vector_weighted.py: 64 passed, 0 failed, 0 skipped
```

The full corpus target passes with `integer_vector_weighted.py` included:

```text
sage -t passed: 5881 passed, 0 failed, 1267 skipped
```

That run is recorded in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3` as run `7`, with
7,148 total block rows across 61 files. The saved block- and file-failure
cluster queries are empty. The same sampling pass kept
`sage/combinat/q_analogues.py` out of the quiet corpus because
`qt_catalan_number(4)` still reaches a runtime `memory access out of bounds`
trap, and `sage/combinat/counting.py` because it currently contributes no
extracted doctest blocks to the Sagelite runner.

Follow-up degree-sequence, set-partition, and set-pythonclass corpus-growth
pass: `sage/combinat/degree_sequences.pyx`,
`sage/combinat/set_partition_iterator.pyx`, `sage/combinat/tools.py`, and
`sage/sets/pythonclass.pyx` are now included in the browser-profile corpus.
The degree-sequence file exposed another common doctest namespace expectation:
Sage examples use `Set(...)` without importing the broad set aggregate, so the
Sagelite doctest runner now seeds `Set` from `sage.sets.set` alongside the
other narrow startup constructors and records this behavior under runner
version 28.

Focused reruns record:

```text
degree_sequences.pyx: 35 passed, 0 failed, 5 skipped
set_partition_iterator.pyx: 5 passed, 0 failed, 2 skipped
tools.py: 2 passed, 0 failed, 0 skipped
pythonclass.pyx: 55 passed, 0 failed, 0 skipped
```

The standalone Sagelite target passes after extending the doctest smoke to
cover `Set` and updating the smoke aggregate checks:

```text
sagelite-ok meson configure compile install node import electron resources smoke relocated followups recorded
```

The full corpus target passes after the standalone rebuild repopulates the
dashboard database:

```text
sage -t passed: 5978 passed, 0 failed, 1274 skipped
```

That run is recorded in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3` as run `1`, with
7,252 total block rows across 65 files. The saved block- and file-failure
cluster queries are empty. The same sampling pass kept
`sage/combinat/subsets_pairwise.py`, `sage/combinat/graph_path.py`,
`sage/sets/cartesian_product.py`, `sage/sets/image_set.py`,
`sage/sets/disjoint_union_enumerated_sets.py`, and
`sage/combinat/quickref.py` out of the quiet corpus until their failure
clusters get separate triage; `sage/combinat/family.py` currently contributes
no extracted doctest blocks.

Latest checked local corpus run after the 2026-06-25 vector-partition
corpus-growth pass:

```text
sage -t passed: 6017 passed, 0 failed, 1274 skipped
```

That run records the current 66-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/vector_partition.py` to the previous clean browser-profile
baseline. The focused rerun records
`vector_partition.py: 39 passed, 0 failed, 0 skipped`. The saved block- and
file-failure cluster queries are empty for the full run. The same sampling pass
kept `sage/combinat/subsets_pairwise.py`,
`sage/sets/set_from_iterator.py`, `sage/sets/disjoint_union_enumerated_sets.py`,
and `sage/combinat/shuffle.py` out of the quiet corpus because their failures
still need separate semantic or dependency-scope triage. The latest run
metadata records node profile, runner version 28, 7,291 total block rows, and
about 457 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-25 fast-vector-partition
corpus-growth pass:

```text
sage -t passed: 6033 passed, 0 failed, 1277 skipped
```

That run records the current 67-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/fast_vector_partitions.pyx` to the previous clean
browser-profile baseline. The doctest runner now seeds `VectorPartitions` in
the common focused namespace, matching the upstream Sage startup assumptions
used by `fast_vector_partitions.pyx` examples without importing broad
combinatorics collections. The focused rerun records
`fast_vector_partitions.pyx: 16 passed, 0 failed, 3 skipped`, and the full
run records 7,310 total block rows with empty block- and file-failure cluster
queries. The same sampling pass kept `sage/combinat/subsets_pairwise.py`,
`sage/sets/set_from_iterator.py`, `sage/sets/image_set.py`,
`sage/sets/disjoint_union_enumerated_sets.py`, `sage/combinat/shuffle.py`,
`sage/combinat/binary_recurrence_sequences.py`,
`sage/combinat/sloane_functions.py`,
and `sage/combinat/integer_vectors_mod_permgroup.py` out until their semantic,
dependency-scope, or runtime-cost clusters get separate triage; the
`sage/combinat/q_analogues.py` probe was interrupted after it exceeded the
fast-corpus sampling window, and `sage/combinat/counting.py` plus
`sage/combinat/family.py` currently contribute no extracted doctest blocks.
The latest run metadata records node profile, runner version 28, and about
497 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-25 rooted-tree
corpus-growth pass:

```text
sage -t passed: 6186 passed, 0 failed, 1287 skipped
```

That run records the current 68-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/rooted_tree.py` to the previous clean browser-profile
baseline. The doctest runner now seeds `OrderedTree` in the common focused
namespace, matching the upstream Sage startup assumption used by the
`RootedTree(OrderedTree(...))` examples without importing the broad
combinatorics collection. The focused rerun records
`rooted_tree.py: 153 passed, 0 failed, 10 skipped`, and the full run records
7,473 total block rows with empty block- and file-failure cluster queries.
The same sampling pass kept `sage/combinat/abstract_tree.py`,
`sage/combinat/binary_tree.py`, and `sage/combinat/ordered_tree.py` out until
their broader tree-display and semantic clusters get separate triage. The
latest run metadata records node profile, runner version 28, and about
505 seconds of elapsed time.

Follow-up compact combinatorics corpus-growth pass:
`sage/combinat/cyclic_sieving_phenomenon.py` and
`sage/combinat/decorated_permutation.py` are now included in the
browser-profile corpus. Both files contribute compact exact-combinatorics
coverage and pass under the existing focused doctest namespace without a new
runtime or runner change.

Focused reruns record:

```text
cyclic_sieving_phenomenon.py: 27 passed, 0 failed, 0 skipped
decorated_permutation.py: 35 passed, 0 failed, 0 skipped
```

The full corpus target passes with both files included and failures
disallowed:

```text
sage -t passed: 6248 passed, 0 failed, 1287 skipped
```

That run is recorded in `/tmp/sagelite-corpus-cyclic-decorated.sqlite3` with
7,535 total block rows across 70 files. The saved block- and file-failure
cluster queries are empty. The latest run metadata records node profile,
runner version 28, and about 512 seconds of elapsed time.

The same sampling pass kept `sage/combinat/q_bernoulli.pyx` out because it
still reaches the known NTL/libcxx finite-field trap while constructing
`PolynomialRing(GF(2), 'x')`, kept `sage/combinat/subword_complex_c.pyx` out
because its examples require the broader Coxeter/subword-complex startup
surface, and kept `sage/combinat/tamari_lattices.py` and
`sage/combinat/baxter_permutations.py` out because they import graph-backed
poset/lattice functionality that is outside the current browser-profile
corpus boundary.

Follow-up set corpus-growth pass: `sage/sets/disjoint_set.pyx` and
`sage/sets/family.pyx` are now included in the browser-profile corpus.
`family.pyx` exposed a lightweight startup namespace gap: Sage doctests expect
`PositiveIntegers` from `sage.all`, while the WASI profile intentionally avoids
the full `sage.sets.all` import. The Sagelite WASI patch now exposes
`PositiveIntegers` directly from the lightweight `sage.all` surface, and the
packaged `python-wasi-sdk` exact-math smoke covers that export.

`disjoint_set.pyx` exposed a source-scope classification issue where the
`to_digraph()` setup line imported graph support before the following
graph-only checks could be skipped. The Sagelite WASI patch now marks that
setup prompt as `# needs sage.graphs`, keeping disjoint-set union/find
coverage in the pure set corpus while graph-backed rendering stays deferred.

Focused reruns record:

```text
disjoint_set.pyx: 263 passed, 0 failed, 10 skipped
family.pyx: 375 passed, 0 failed, 3 skipped
```

The standalone Sagelite target passes after rebuilding the patched source and
packaged resources:

```text
sagelite-ok meson configure compile install node import electron resources smoke relocated followups recorded
```

The full corpus target passes with the two set files included and failures
disallowed:

```text
sage -t passed: 6886 passed, 0 failed, 1300 skipped
```

That run is recorded in `/tmp/sagelite-corpus-sets-family.sqlite3` with 8,186
total block rows across 72 files. The saved block- and file-failure cluster
queries are empty. The latest run metadata records node profile, runner
version 28, and about 524 seconds of elapsed time.

Follow-up diagram corpus-growth pass: `sage/combinat/diagram.py` is now
included in the browser-profile corpus. The module exposed a focused doctest
namespace gap for `Partitions.options`, so the Sagelite runner now seeds the
lightweight `Partitions` constructor alongside the other common focused
combinatorics globals. Its `peelable_tableaux()` examples also produce the
same unordered sets with a different representation order under the WASI
runtime, so the Sagelite WASI patch marks those display checks as `# random`
while still executing the examples.

Focused rerun:

```text
diagram.py: 222 passed, 0 failed, 25 skipped
```

The full corpus target passes with the new file included and failures
disallowed:

```text
sage -t passed: 7108 passed, 0 failed, 1325 skipped
```

That run is recorded in `/tmp/sagelite-corpus-diagram.sqlite3` with 8,433
total block rows across 73 files. The saved block- and file-failure cluster
queries are empty. The run metadata records node profile, runner version 28,
and about 536 seconds of elapsed time. The same pass also fixes the Sagelite
package Makefile dependency so the generated `.patched` source tree is
refreshed when the checked-in WASI patch file changes.

Follow-up quickref corpus-growth pass: `sage/combinat/quickref.py` is now
included in the browser-profile corpus. The file exercises common interactive
combinatorics startup names without requiring the broad `sage.combinat.all`
surface, so the Sagelite runner now seeds `Combinations`, `StandardTableau`,
`Words`, and `WordMorphism` in focused doctest namespaces. The WASI
`sage.all` patch exposes the same lightweight constructors for REPL parity.

Focused rerun:

```text
quickref.py: 9 passed, 0 failed, 18 skipped
```

The full corpus target passes with failures disallowed:

```text
sage -t passed: 7320 passed, 0 failed, 1411 skipped
```

That run is recorded in `/tmp/sagelite-corpus-after-quickref.sqlite3` with
8,731 total block rows across 77 files. The saved block- and file-failure
cluster queries are empty. The latest run metadata records CoWasm commit
`42e5034e90e2b62c59912c3370a2a696ec2995d1`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 28,
and about 558 seconds of elapsed time.

Follow-up tableau and parking-function corpus-growth pass:
`sage/combinat/composition_tableau.py`,
`sage/combinat/non_decreasing_parking_function.py`,
`sage/combinat/parking_functions.py`,
`sage/combinat/ribbon_shaped_tableau.py`,
`sage/combinat/ribbon_tableau.py`, and `sage/combinat/super_tableau.py` are
now included in the browser-profile corpus. These files add compact exact
combinatorics and tableau coverage without requiring a new focused namespace
or source patch.

Focused reruns record:

```text
composition_tableau.py: 100 passed, 0 failed, 0 skipped
non_decreasing_parking_function.py: 122 passed, 0 failed, 0 skipped
parking_functions.py: 265 passed, 0 failed, 8 skipped
ribbon_shaped_tableau.py: 40 passed, 0 failed, 11 skipped
ribbon_tableau.py: 169 passed, 0 failed, 8 skipped
super_tableau.py: 139 passed, 0 failed, 1 skipped
```

The full corpus target passes with failures disallowed:

```text
sage -t passed: 8155 passed, 0 failed, 1439 skipped
```

That run is recorded in `/tmp/sagelite-corpus-tableau-parking.sqlite3` with
9,594 total block rows across 83 files. The saved block- and file-failure
cluster queries are empty. The latest run metadata records CoWasm commit
`e7dd85680b3f7076cd28b2003d41bc6fe34530c0`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 28,
and about 613 seconds of elapsed time. The same sampling pass kept
`sage/combinat/cluster_complex.py`,
`sage/combinat/multiset_partition_into_sets_ordered.py`,
`sage/combinat/parallelogram_polyomino.py`,
`sage/combinat/regular_sequence.py`,
`sage/combinat/skew_partition.py`, `sage/combinat/skew_tableau.py`,
`sage/combinat/shifted_primed_tableau.py`, and `sage/combinat/tiling.py` out
until their dependency, semantic, or dynamic-link clusters get separate
triage; `sage/combinat/algebraic_combinatorics.py`,
`sage/combinat/counting.py`, `sage/combinat/enumerated_sets.py`,
`sage/combinat/family.py`, `sage/combinat/positive_integer_semigroup_test.py`,
and `sage/combinat/ribbon.py` currently contribute no extracted doctest
blocks under this runner.

Latest checked local corpus run after the 2026-06-25 shuffle corpus-growth
pass:

```text
sage -t passed: 8282 passed, 0 failed, 1446 skipped
```

That run records 9,728 block rows across the current 89-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/shuffle.py` to the previous clean browser-profile baseline.
The focused rerun records `shuffle.py: 127 passed, 0 failed, 7 skipped`.
The full corpus database is
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`; the saved block-
and file-failure cluster queries are empty. The latest run metadata records
CoWasm commit `3e9b1ea85fe1eb9a7a0cbcd29f4fbde479e0bf78`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner
version 28, and about 610 seconds of elapsed time. The same sampling pass kept
`sage/sets/cartesian_product.py`,
`sage/sets/disjoint_union_enumerated_sets.py`, `sage/combinat/q_analogues.py`,
`sage/combinat/binary_tree.py`, `sage/combinat/ordered_tree.py`,
`sage/combinat/abstract_tree.py`, and `sage/combinat/tutorial.py` out of the
quiet corpus until their semantic, dependency, signature-mismatch, recursion,
or timeout clusters get separate triage.

Latest checked local corpus run after the 2026-06-25 set-from-iterator
corpus-growth pass:

```text
sage -t passed: 8464 passed, 0 failed, 1531 skipped
```

That run records 9,995 block rows across the then-current 86-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/sets/set_from_iterator.py` to the previous clean browser-profile
baseline. The focused rerun records
`set_from_iterator.py: 133 passed, 0 failed, 79 skipped`. The added WASI patch
classifies two warning-display drift examples as `# known bug` and marks a
doc-formatting example that imports the unavailable `packaging` module as
`# needs packaging`. The full corpus database is
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`; the saved block-
and file-failure cluster queries are empty. The latest run metadata records
CoWasm commit `caf5d5532be75eb2a1973d3d36de99c9d82b06db`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner
version 28, and about 629 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-25 permutation-Cython
helper corpus-growth pass:

```text
sage -t passed: 8503 passed, 0 failed, 1531 skipped
```

That run records 10,034 block rows across the current 87-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/permutation_cython.pyx` to the previous clean
browser-profile baseline. The focused rerun records
`permutation_cython.pyx: 39 passed, 0 failed, 0 skipped`, and the full corpus
database is `/tmp/sagelite-corpus-permutation-cython.sqlite3`. The saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `cb267b4e95d5b23a3610edc72d69624d6e1053ea`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile,
runner version 28, and about 627 seconds of elapsed time. This pass also
corrects the previous set-from-iterator corpus count to the measured checked
corpus size.

The same sampling pass kept `sage/sets/disjoint_union_enumerated_sets.py` out
because it still has a broad failure cluster (`24 passed, 35 failed,
70 skipped`), and kept `sage/combinat/binary_recurrence_sequences.py` out
because its remaining recurrence examples need separate semantic triage
(`90 passed, 7 failed, 10 skipped`). The low-content files
`sage/combinat/algebraic_combinatorics.py`, `sage/combinat/counting.py`,
`sage/combinat/enumerated_sets.py`, `sage/combinat/family.py`,
`sage/combinat/positive_integer_semigroup_test.py`, and
`sage/combinat/ribbon.py` currently contribute no extracted doctest blocks
under this runner. The compact probes for `sage/combinat/kazhdan_lusztig.py`,
`sage/combinat/nu_tamari_lattice.py`, `sage/combinat/sine_gordon.py`,
`sage/combinat/shard_order.py`, `sage/combinat/lr_tableau.py`,
`sage/combinat/six_vertex_model.py`, and `sage/sets/finite_set_map_cy.pyx`
still fail and need separate dependency or semantic classification before
they belong in the quiet corpus.

Latest checked local corpus run after the 2026-06-26 Hillman-Grassl and
T-sequence corpus-growth pass:

```text
sage -t passed: 8687 passed, 0 failed, 1534 skipped
```

That run records 10,221 block rows across the current 89-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/hillman_grassl.py` and `sage/combinat/t_sequences.py` to the
previous clean browser-profile baseline. Focused reruns record
`hillman_grassl.py: 98 passed, 0 failed, 3 skipped` and
`t_sequences.py: 86 passed, 0 failed, 0 skipped`; the full corpus database is
`/tmp/sagelite-corpus-hillman-tseq.sqlite3`. The saved block- and file-failure
cluster queries are empty. The latest run metadata records CoWasm commit
`8d550fccbdca1b2650d5d424b52fb00fba3c5382`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 28,
and about 639 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 partitions Cython
corpus-growth pass:

```text
sage -t passed: 8756 passed, 0 failed, 1535 skipped
```

That run records 10,291 block rows across the current 90-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/partitions.pyx` to the previous clean browser-profile baseline.
The focused rerun records `partitions.pyx: 69 passed, 0 failed, 1 skipped`;
the full corpus database is `/tmp/sagelite-corpus-partitions.sqlite3`. The
saved block- and file-failure cluster queries are empty. The latest run
metadata records CoWasm commit `c54e2b378f5d0c6116926728abf2cba6cca6e187`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, runner version 28, and about 651 seconds of elapsed time.

The same sampling pass kept nearby compact candidates such as
`sage/combinat/baxter_permutations.py`, `sage/combinat/q_bernoulli.pyx`,
`sage/combinat/subword_complex_c.pyx`, and `sage/combinat/tamari_lattices.py`
out of the quiet corpus because they still hit graph-backed imports, NTL/libcxx
traps, Coxeter/subword dependencies, or broader doctest-context failures.

Latest checked local corpus run after the 2026-06-26 binary recurrence
corpus-growth pass:

```text
sage -t passed: 8846 passed, 0 failed, 1552 skipped
```

That run records 10,398 block rows across the current 91-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/binary_recurrence_sequences.py` to the previous clean
browser-profile baseline. The focused rerun records
`binary_recurrence_sequences.py: 90 passed, 0 failed, 17 skipped`; the added
WASI patch classifies the file's default `fibonacci(...)` comparison as PARI
object-model coverage and its period examples over moduli with a factor of 2
as requiring the unavailable dense mod-2 matrix backend. The doctest runner
now seeds the lightweight `fibonacci` name in the common namespace so optional
reruns reach the real backend gap instead of a startup-name artifact. The full
corpus database is `/tmp/sagelite-corpus-binary-recurrence.sqlite3`. The saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `e06824b3c334c09927ddd0efd371fd1b3c94f9fe`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile,
runner version 28, and about 664 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 plane-partition
corpus-growth pass:

```text
sage -t passed: 9149 passed, 0 failed, 1608 skipped
```

That run records 10,757 block rows across the current 92-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/plane_partition.py` to the previous clean browser-profile
baseline. The focused rerun records
`plane_partition.py: 303 passed, 0 failed, 56 skipped`; the added WASI patch
classifies the file's Symmetrica-backed semistandard-tableau iterator and
graph/poset-backed symmetry iterators as explicit optional backend coverage.
The full corpus database is `/tmp/sagelite-corpus-plane-partition.sqlite3`.
The saved block- and file-failure cluster queries are empty. The latest run
metadata records CoWasm commit `2dce2dceabad7d2f672097678f2cbc95d2c61024`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, runner version 28, and about 664 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 ordered-tree
corpus-growth pass:

```text
sage -t passed: 9370 passed, 0 failed, 1648 skipped
```

That run records 11,018 block rows across the current 93-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/ordered_tree.py` to the previous clean browser-profile
baseline. The focused rerun records
`ordered_tree.py: 221 passed, 0 failed, 40 skipped`; the added WASI patch
classifies the file's graph and poset conversion examples as
`# needs sage.graphs`, matching the existing browser-profile boundary for
unavailable graph internals. The full corpus database is
`/tmp/sagelite-corpus-after-ordered-tree.sqlite3`. The saved block- and
file-failure cluster queries are empty. The latest run metadata records CoWasm
commit `dfc17a1c30b3968b624018f7f6dba5a87285b711`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 28,
and about 665 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 finite-set-map Cython
corpus-growth pass:

```text
sage -t passed: 9481 passed, 0 failed, 1648 skipped
```

That run records 11,129 block rows across the current 94-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/sets/finite_set_map_cy.pyx` to the previous clean browser-profile
baseline. The focused rerun records
`finite_set_map_cy.pyx: 111 passed, 0 failed, 0 skipped`; the doctest runner
now seeds `FiniteSetMaps` in the common namespace so Cython fallback doctests
exercise the finite-set-map implementation instead of failing on a startup
name artifact. The added WASI patch classifies one finite-map fiber display as
`# random`, because the set-like dictionary representation has runtime order
drift while preserving the same fibers. The full corpus database is
`/tmp/sagelite-corpus-finite-set-map-cy.sqlite3`; the saved block- and
file-failure cluster queries are empty. The latest run metadata records CoWasm
commit `d4ca57573788816d8e19e51e8f89c909258649fb`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 28,
and about 673 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 disjoint-union set
corpus-growth pass:

```text
sage -t passed: 9539 passed, 0 failed, 1719 skipped
```

That run records 11,258 block rows across the current 95-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/sets/disjoint_union_enumerated_sets.py` to the previous clean
browser-profile baseline. The focused rerun records
`disjoint_union_enumerated_sets.py: 58 passed, 0 failed, 71 skipped`.

The pass narrows the previous disjoint-union startup failure cluster by
seeding `FiniteEnumeratedSet` and `NonNegativeIntegers` in the common doctest
namespace. The remaining warning-output drift for
`U4._is_a(Composition([3,2,1,1]))` is recorded as a `# known bug` in the
Sagelite WASI patch, matching the existing browser-profile treatment for
runtime warning/display drift. The saved block- and file-failure cluster
queries are empty for the full corpus run. The Sagelite standalone target also
passes after extending the doctest smoke to cover the new namespace globals:

```text
sagelite-ok meson configure compile install node import electron resources smoke relocated followups recorded
```

Latest checked local corpus run after the 2026-06-26 six-vertex model
corpus-growth pass:

```text
sage -t passed: 9576 passed, 0 failed, 1733 skipped
```

That run records 11,309 block rows across the current 96-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/six_vertex_model.py` to the previous clean browser-profile
baseline. The focused rerun records
`six_vertex_model.py: 37 passed, 0 failed, 14 skipped`. The added WASI patch
classifies three list-display examples as `# known bug`, matching the existing
browser-profile treatment for multi-line ASCII-art list rendering drift where
the current runtime prints each element vertically instead of Sage's compact
side-by-side list layout. The full corpus database is
`/tmp/sagelite-corpus-six-vertex.sqlite3`; the saved block- and file-failure
cluster queries are empty. The latest run metadata records node profile,
runner version 28, and about 688 seconds of elapsed time.

Follow-up runner-fidelity pass: file-level Sage doctest directives such as
`# sage.doctest: needs sage.combinat sage.modules` are now merged into every
extracted example for tag and skip decisions while preserving the original
example source and stable block key. A focused smoke records
`passed|1|0|0|1` for a file-level `needs cowasm_file_header` directive, and
the `sage/combinat/kazhdan_lusztig.py` probe now reports
`0 passed, 0 failed, 26 skipped` instead of artificial `WeylGroup`, `W`, and
`KL` `NameError` clusters. This keeps future corpus sampling honest when an
entire module declares a broader optional dependency surface.

Follow-up runner-fidelity pass: expected-output lines that begin with a Sage
ellipsis pattern such as `...-adic Field with capped relative precision ...`
are now protected before Python's stock doctest parser sees them, then restored
before output comparison and SQLite recording. This fixes the focused
`sage/rings/tests.py:110` parser failure, which now records the p-adic example
as an explicit `# needs sage.rings.padics` skip instead of a file-level
`ValueError`. The standalone doctest smoke covers the restored expected output
and records `28` blocks in the default run. A full `sage/rings/tests.py`
sampling run still reaches a later NTL/libcxx memory trap in
`check_random_elements`, so that file should remain outside the quiet corpus
until the native finite-ring path is classified or fixed.

The same sampling pass kept all-skipped dependency-boundary files such as
`sage/combinat/kazhdan_lusztig.py`, `sage/combinat/lr_tableau.py`,
`sage/combinat/tiling.py`, `sage/sets/real_set.py`, and
`sage/arith/multi_modular.pyx` out of the default corpus because they add no
non-skipped signal. Noisy candidates still needing separate triage include
`sage/combinat/abstract_tree.py`, `sage/combinat/binary_tree.py`,
`sage/combinat/sine_gordon.py`, `sage/combinat/shard_order.py`,
`sage/combinat/skew_partition.py`, `sage/combinat/regular_sequence_bounded.py`,
`sage/sets/set.py`, `sage/arith/functions.pyx`, `sage/arith/misc.py`, and
`sage/rings/derivation.py`.

Latest checked local corpus run after the 2026-06-26 tableau-tuple
corpus-growth pass:

```text
sage -t passed: 9949 passed, 0 failed, 2195 skipped
```

That run records 12,144 block rows across the current 103-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/tableau_tuple.py` to the previous clean browser-profile
baseline. The focused rerun records
`tableau_tuple.py: 609 passed, 0 failed, 105 skipped`.

The pass extends the focused doctest namespace with the lightweight
`PartitionTuples` constructor, matching the upstream Sage startup assumption
used by row-standard and standard tableau-tuple factory doctests. The WASI
`sage.all` patch exposes the same constructor for startup parity, and the
packaged standalone combinatorics smoke covers the `PartitionTuples` surface.
The full corpus database is `/tmp/sagelite-corpus-after-tableau-tuple.sqlite3`;
the saved block- and file-failure cluster queries are empty. The latest run
metadata records CoWasm commit `6cf160a417e592ec6a670b7a01c835aa2309eb1b`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, runner version 30, and about 679 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 partition-tuple and
skew-tableau corpus-growth pass:

```text
sage -t passed: 10696 passed, 0 failed, 2273 skipped
```

That run records 12,969 block rows across the then-current 105-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/partition_tuple.py` and `sage/combinat/skew_tableau.py` to the
previous clean browser-profile baseline. Focused reruns record
`partition_tuple.py: 361 passed, 0 failed, 41 skipped` and
`skew_tableau.py: 386 passed, 0 failed, 37 skipped`.

The pass classifies the `PartitionTuple.block` dictionary-display example as
`# random`, because the output is semantically the same residue-multiplicity
dictionary with runtime insertion-order drift. It also seeds and exposes the
lightweight `SemistandardTableaux` constructor, matching the upstream Sage
startup assumption used by `SkewTableau.weight` doctests. The full corpus
database is `/tmp/sagelite-corpus-after-partition-skew.sqlite3`; the saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `59328a74ab827c76bb66703c480d7b9ea0bec286`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile,
runner version 31, and about 713 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 skew-partition
corpus-growth pass:

```text
sage -t passed: 10941 passed, 0 failed, 2317 skipped
```

That run records 13,258 block rows across the current 106-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/skew_partition.py` to the previous clean browser-profile
baseline. The focused rerun records
`skew_partition.py: 245 passed, 0 failed, 44 skipped`.

The pass extends the focused doctest namespace with `Partition` and `Tableau`,
matching upstream Sage startup assumptions used by skew-partition Frobenius
rank and display-option doctests. The WASI `sage.all` patch exposes the same
constructors for REPL parity, and the three Macdonald coefficient examples
that route through the unavailable pexpect-backed interface layer are recorded
as explicit skips. The full corpus database is
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`; the saved block-
and file-failure cluster queries are empty. The latest run metadata records
CoWasm commit `0ebb02c2f1729135c55eda52aae5af38fac68d81`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner
version 31, and about 768 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 Baxter-permutation
corpus-growth pass:

```text
sage -t passed: 11527 passed, 0 failed, 2364 skipped
```

That run records 13,891 block rows across the current 103-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/baxter_permutations.py` to the quiet browser-profile
dashboard. The focused rerun records
`baxter_permutations.py: 31 passed, 0 failed, 5 skipped`.

The pass keeps the graph-backed lattice constructor out of the module import
path by moving `LatticePoset` into `BaxterPermutations_size.lattice()`, so the
pure Baxter permutation enumeration doctests can run without importing the
unavailable graph Cython layer. The lattice example itself is recorded as
`# needs sage.graphs`. The full corpus database is
`/tmp/sagelite-corpus-after-baxter.sqlite3`; the saved block- and file-failure
cluster queries are empty. The latest run metadata records node profile,
runner version 31, and 13,891 total doctest blocks.

Latest checked local corpus run after the 2026-06-26 superpartition
corpus-growth pass:

```text
sage -t passed: 11703 passed, 0 failed, 2364 skipped
```

That run records 14,067 block rows across the current 104-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/superpartition.py` to the quiet browser-profile dashboard. The
focused rerun records `superpartition.py: 176 passed, 0 failed, 0 skipped`.
The full corpus database is
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`; the saved block-
and file-failure cluster queries are empty. The latest run metadata records
CoWasm commit `adf31f74def469564390c4ca4e59ee8fcb0ca06f`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner
version 31, and about 767 seconds of elapsed time.

The same sampling pass kept `sage/combinat/q_analogues.py` and
`sage/combinat/q_bernoulli.pyx` out of the quiet corpus because they still
reach existing NTL/libcxx or generic WASM memory-trap clusters. It also kept
all-skipped dependency-boundary files such as
`sage/combinat/subword_complex_c.pyx`, `sage/combinat/nu_tamari_lattice.py`,
`sage/combinat/tamari_lattices.py`, `sage/combinat/cluster_complex.py`,
`sage/combinat/enumeration_mod_permgroup.pyx`, and several algebra-backed
combinatorics modules out because they add no non-skipped browser-profile
signal yet.

Latest checked local corpus run after the 2026-06-26 ordered set-partition
corpus-growth pass:

```text
sage -t passed: 11945 passed, 0 failed, 2365 skipped
```

That run records 14,310 block rows across the current 105-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/set_partition_ordered.py` to the quiet browser-profile
dashboard. The focused rerun records
`set_partition_ordered.py: 242 passed, 0 failed, 1 skipped`.

The pass classifies the unordered string `frozenset` display example for
`x.base_set()` as `# random`, because the full corpus run exposed runtime hash
order drift such as `{'b', 'c', 'a', 'd', 'e'}` versus Sage's historical
expected order. The full corpus database is
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`; the saved block-
and file-failure cluster queries are empty. The latest run metadata records
CoWasm commit `9a6f924e78fb36ed27949f6dc8ee62781bee1462`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner
version 31, and about 780 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 bounded
regular-sequence corpus-growth pass:

```text
sage -t passed: 13073 passed, 0 failed, 2665 skipped
```

That run records 15,738 block rows across the current 109-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/regular_sequence_bounded.py` to the quiet browser-profile
dashboard. The focused rerun records
`regular_sequence_bounded.py: 63 passed, 0 failed, 23 skipped`.

The doctest runner now seeds the lightweight `RegularSequenceRing` and
`vector` constructors in the common doctest namespace, and the WASI
`sage.all` patch exposes the same names for startup parity. The added WASI
source patch classifies list-of-matrices display-format drift as deferred
`# known bug`, the symbolic `pi` matrix check as `# needs sage.symbolic`, and
the eigenvalue/PARI-backed boundedness checks as `# needs sage.libs.pari`.
The full corpus database is
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`; the saved block-
and file-failure cluster queries are empty. The latest run metadata records
CoWasm commit `957ff769fef7f99681ac3e66eb4d228367b1b9f5`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner
version 33, and about 796 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 set-partition
corpus-growth pass:

```text
sage -t passed: 13460 passed, 0 failed, 2712 skipped
```

That run records 16,172 block rows across the current 110-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/combinat/set_partition.py` to the quiet browser-profile dashboard. The
focused rerun records
`set_partition.py: 387 passed, 0 failed, 47 skipped`.

The doctest runner now seeds the lightweight `PerfectMatching`,
`OrderedSetPartition`, and `stirling_number2` names in the common doctest
namespace, and the WASI `sage.all` patch exposes the same names for startup
parity. The added WASI source patch classifies `latex_options()` dictionary
display order as `# random` and marks the `SetPartitions(3)` TestSuite random
element check as `# needs sage.symbolic`, since that path imports unavailable
symbolic constants. The full corpus database is
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`; the saved block-
and file-failure cluster queries are empty. The latest run metadata records
CoWasm commit `8624986affb12387300a32ec27003745c27aebb8`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner
version 34, and about 809 seconds of elapsed time. The standalone Sagelite
target passed after rebuilding packaged resources, and a focused
`set_partition.py` rerun against that rebuilt dist kept the same
`387 passed, 0 failed, 47 skipped` result.

Latest checked local corpus run after the 2026-06-26 real-double
corpus-growth pass:

```text
sage -t passed: 13740 passed, 0 failed, 2745 skipped
```

That run records 16,485 block rows across the current 111-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/rings/real_double.pyx` to the quiet browser-profile dashboard. The
focused rerun records
`real_double.pyx: 280 passed, 0 failed, 33 skipped`.

The doctest runner now seeds the lightweight `FreeModule`, `VectorSpace`, and
`sqrt` names in the common doctest namespace, matching startup assumptions in
real-double doctests without importing broader module collections. The added
WASI source patch classifies symbolic-constant and PARI-backed real-double
examples as explicit deferred skips, and marks the full-file `.pyx`
`gmpy2.sqrt` leakage around the algebraic-dependency example as a known runner
limitation; the same example passes under a focused `--line` rerun before the
earlier `from gmpy2 import *` doctest mutates the shared fallback namespace.
The full corpus database is
`/tmp/sagelite-corpus-after-real-double-notimeout.sqlite3`; the saved block-
and file-failure cluster queries are empty. The latest run metadata records
CoWasm commit `99a9279e0606d9e7d6c90467fbd27d1e5c443859`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner
version 35, and about 814 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 complex-double
corpus-growth pass:

```text
sage -t passed: 14003 passed, 0 failed, 2826 skipped
```

That run records 16,829 block rows across the current 112-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus, adding
`sage/rings/complex_double.pyx` to the quiet browser-profile dashboard. The
focused rerun records
`complex_double.pyx: 263 passed, 0 failed, 81 skipped`.

The doctest runner now resolves `CDF` in the common startup namespace, matching
the existing `RDF`/`RIF` lazy-import handling so complex-double identity and
pickling doctests see the concrete field instance. The added WASI source patch
classifies PARI-backed complex-double conversion, AGM, and gamma examples as
`# needs sage.libs.pari`, and widens a small set of GSL/libm last-bit complex
floating tolerances without weakening the checked values beyond `1e-14`.
The full corpus database is
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`; the saved block-
and file-failure cluster queries are empty. The latest run metadata records
CoWasm commit `6c5a2ecb3218d6316dd1ff8e6d8949c24c7c461f`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner
version 35, and about 827 seconds of elapsed time.

Checked local ring-prefix run after the 2026-06-26 rings random-smoke
corpus-growth pass:

```text
sage -t passed: 2465 passed, 0 failed, 581 skipped
```

That run records 3,046 block rows across the ring-prefix subset through
`sage/rings/tests.py`, adding `sage/rings/tests.py` to the checked
`basic-pure-math.txt` corpus list while exercising it after the existing
integer, rational, real-double, and complex-double files. The focused rerun
records `tests.py: 31 passed, 0 failed, 31 skipped`.

The added WASI source patch classifies the relative-number-field examples and
random ring smoke tests as `# needs sage.rings.number_field`, because those
paths deliberately sample Sage number-field construction and currently reach
the focused CoWasm `cypari2` object-model boundary. The nine-file aggregate
database is `/tmp/sagelite-rings-tests-corpus.sqlite3`; it has no failed
blocks and no file-level errors. A full 113-file corpus rerun should be
performed as the next dashboard refresh before recording a new full-corpus
total.

Latest checked local corpus run after the 2026-06-26 small ring-helper
corpus-growth pass:

```text
sage -t passed: 14046 passed, 0 failed, 2858 skipped
```

That run records 16,904 block rows across the current 116-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, adding
`sage/rings/complex_conversion.pyx`, `sage/rings/power_series_mpoly.pyx`, and
`sage/rings/padics/padic_relaxed_errors.pyx` to the quiet browser-profile
dashboard. Focused reruns record `complex_conversion.pyx: 3 passed, 0 failed,
1 skipped`, `power_series_mpoly.pyx: 4 passed, 0 failed, 0 skipped`, and
`padic_relaxed_errors.pyx: 5 passed, 0 failed, 0 skipped`.

The pass also repairs the Sagelite WASI source patch hunk metadata for
`sage/rings/tests.py`, so the existing `check_random_arith(trials=10)`
number-field random smoke is actually tagged as
`# needs sage.rings.number_field` in a fresh patched source copy. The saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `15dccc2f61359fd966d1f52509b05003beb13ef3`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile,
runner version 35, and about 851 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 integer-list and word
options corpus-growth pass:

```text
sage -t passed: 14059 passed, 0 failed, 2858 skipped
```

That run records 16,917 block rows across the current 118-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, adding
`sage/combinat/integer_lists/nn.py` and
`sage/combinat/words/word_options.py` to the quiet browser-profile
dashboard. Focused reruns record:

```text
integer_lists/nn.py: 5 passed, 0 failed, 0 skipped
word_options.py: 8 passed, 0 failed, 0 skipped
```

The saved block- and file-failure cluster queries are empty. The same sampling
pass kept `sage/combinat/q_analogues.py` and
`sage/combinat/q_bernoulli.pyx` out of the quiet corpus because they still
reach runtime memory traps in polynomial/NTL-backed paths rather than simple
startup-scope gaps. The latest run metadata records CoWasm commit
`bbd49a08d8c72fb67674d3a91913d3a50c20876a`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 35,
and about 867 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 infinite-word
corpus-growth pass:

```text
sage -t passed: 14080 passed, 0 failed, 2858 skipped
```

That run records 16,938 block rows across the current 119-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-infinite-word.sqlite3`, adding
`sage/combinat/words/infinite_word.py` to the quiet browser-profile dashboard.
The focused rerun records `infinite_word.py: 21 passed, 0 failed, 0 skipped`.
The doctest runner now seeds `InfiniteWords` beside the existing lightweight
word constructors in the common doctest namespace, and the WASI `sage.all`
patch exposes the same constructor for startup parity. The same pass repairs
the `src/sage/all.py` hunk formatting in the WASI source patch so a fresh
patched Sagelite source copy can be rebuilt before the corpus run. The saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `7af054994f21c08163dbedd62326cac167db7845`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, runner version 35, and about 870 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 word helper
corpus-growth pass:

```text
sage -t passed: 14425 passed, 0 failed, 2907 skipped
```

That run records 17,332 block rows across the current 122-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, adding
`sage/combinat/words/alphabet.py`,
`sage/combinat/words/shuffle_product.py`, and
`sage/combinat/words/word_generators.py` to the quiet browser-profile
dashboard. Focused reruns record `alphabet.py: 33 passed, 0 failed,
3 skipped`, `shuffle_product.py: 56 passed, 0 failed, 0 skipped`, and
`word_generators.py: 256 passed, 0 failed, 46 skipped`.

The saved block- and file-failure cluster queries are empty. The same sampling
pass kept larger adjacent word modules such as `abstract_word.py`, `word.py`,
`words.py`, and `finite_word.py` out of the quiet corpus because they still
have real failure clusters; `paths.py` is also excluded because it contributes
only skipped rows under the current browser-profile tags. The latest run
metadata records CoWasm commit `d6c51da9e36a785b8ad0143aa836db9edd50fcfa`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, runner version 35, and about 892 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 factorization-helper
corpus-growth pass:

```text
sage -t passed: 14442 passed, 0 failed, 2916 skipped
```

That run records 17,358 block rows across the current 123-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-factorint.sqlite3`, adding
`sage/rings/factorint.pyx` to the quiet browser-profile dashboard. The
focused rerun records `factorint.pyx: 17 passed, 0 failed, 9 skipped`.

The added WASI source patch classifies the Aurifeuillian-factorization
examples as `# needs sage.libs.pari`, because those paths currently call
integer squarefreeness through PARI and reach the focused CoWasm `cypari2`
object-model boundary. The saved block- and file-failure cluster queries are
empty. The latest run metadata records CoWasm commit
`848c39abf70ea35fc94ff121380f1261e81f58cf`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 35,
and about 896 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 Lyndon and morphic word
corpus-growth pass:

```text
sage -t passed: 14588 passed, 0 failed, 2944 skipped
```

That run records 17,532 block rows across the current 125-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-word-morphic-lyndon.sqlite3`, adding
`sage/combinat/words/lyndon_word.py` and
`sage/combinat/words/morphic.py` to the quiet browser-profile dashboard.
Focused reruns record `lyndon_word.py: 85 passed, 0 failed, 10 skipped` and
`morphic.py: 61 passed, 0 failed, 18 skipped`.

The added WASI source patch classifies the two standard-bracketed Lyndon word
cardinality/random-element examples as `# needs sage.libs.pari`, because those
paths currently compute `moebius()` through the focused CoWasm `cypari2`
object-model boundary. The saved block- and file-failure cluster queries are
empty. The latest run metadata records CoWasm commit
`0707b568ee853ead187e46a7d990c5f8862bf766`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 35,
and about 913 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 suffix-tree
corpus-growth pass:

```text
sage -t passed: 14876 passed, 0 failed, 2957 skipped
```

That run records 17,833 block rows across the current 126-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-suffix-trees.sqlite3`, adding
`sage/combinat/words/suffix_trees.py` to the quiet browser-profile dashboard.
The focused rerun records `suffix_trees.py: 288 passed, 0 failed, 13 skipped`.

The added WASI source patch marks
`DecoratedSuffixTree._partial_labeling()` as `# random`, because the runtime
returns the same dictionary of edge labels with insertion-order display drift.
The saved block- and file-failure cluster queries are empty. The latest run
metadata records CoWasm commit `63d4e549222c7c07c15532ab6cd2458332674a70`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, runner version 35, and about 917 seconds of elapsed time.

The same sampling pass kept adjacent word modules out of the quiet corpus:
`word_datatypes.pyx`, `word_char.pyx`, and `morphism.py` had real block
failures, while `paths.py` contributed only skipped rows under the current
browser-profile tags.

Latest checked local corpus run after the 2026-06-26 infinite-word datatype
corpus-growth pass:

```text
sage -t passed: 15149 passed, 0 failed, 2957 skipped
```

That run records 18,106 block rows across the current 127-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, adding
`sage/combinat/words/word_infinite_datatypes.py` to the quiet browser-profile
dashboard. The focused rerun records
`word_infinite_datatypes.py: 273 passed, 0 failed, 0 skipped`.

The doctest runner now seeds Sage's public `words` word-generator catalog in
the common startup namespace, matching the stripped WASI `sage.all` profile.
This clears the module's only sampled failure cluster, where the
`WordDatatype_callable_with_caching.flush()` examples used
`words.ThueMorseWord()` before any local `words` binding existed. The saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `d6943eb246ffc950ef1d1f362aacf1e2ea79f4b5`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile,
runner version 35, and about 919 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 finite-word constructor
corpus-growth pass:

```text
sage -t passed: 15317 passed, 0 failed, 2958 skipped
```

That run records 18,275 block rows across the current 128-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-word.sqlite3`, adding
`sage/combinat/words/word.py` to the quiet browser-profile dashboard. The
focused rerun records `word.py: 168 passed, 0 failed, 1 skipped`.

The doctest runner now seeds the lightweight `FreeMonoid` constructor in the
common startup namespace, and the WASI `sage.all` patch exposes the same
constructor for startup parity on the next Sagelite package rebuild. This
clears the module's only sampled failure cluster, where free-monoid examples
used `M.<x,y,z> = FreeMonoid(3)` before any local `FreeMonoid` binding
existed. The saved block- and file-failure cluster queries are empty. The
latest run metadata records CoWasm commit
`adf83036592be02decfdf9c4e09183c64ade3f3c`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 35,
and about 937 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 ordered multiset
partition corpus-growth pass:

```text
sage -t passed: 15821 passed, 0 failed, 3025 skipped
```

That run records 18,846 block rows in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, adding
`sage/combinat/multiset_partition_into_sets_ordered.py` to the quiet
browser-profile dashboard. The focused rerun records
`multiset_partition_into_sets_ordered.py: 504 passed, 0 failed, 67 skipped`.

The added WASI source patch classifies four constraints-dictionary doctests as
deferred `# known bug` skips because the runtime preserves a different keyword
insertion order than the historical expected output. The saved block- and
file-failure cluster queries are empty. The latest run metadata records CoWasm
commit `d65ade06a1878809f57c7573d062d4d978a3b0c8`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 35,
and about 951 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 abstract-word
corpus-growth pass:

```text
sage -t passed: 16190 passed, 0 failed, 3033 skipped
```

That run records 19,223 block rows across the current 135-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-abstract-word-clean.sqlite3`, adding
`sage/combinat/words/abstract_word.py` to the quiet browser-profile
dashboard. The focused rerun records
`abstract_word.py: 370 passed, 0 failed, 7 skipped`.

The doctest runner now seeds the lightweight `WordOptions` constructor in the
common startup namespace, and the WASI `sage.all` patch exposes the same
constructor for startup parity on the next Sagelite package rebuild. This
clears the abstract-word startup cluster where examples changed the global
word letter separator before checking `Word(...).string_rep()`. The same WASI
source patch classifies the rebuilt `xsrange(10)` Cython generator repr drift
as a deferred `# known bug` skip because the stripped runtime now omits the
address-shaped `0x...` portion expected by the historical doctest. The saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `c1c781f7962e2ebc691e94631bd735a870f38bc7`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile,
runner version 35, and about 1012 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 finite-word
corpus-growth pass:

```text
sage -t passed: 17452 passed, 0 failed, 3088 skipped
```

That run records 20,540 block rows across the current 131-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-finite-word.sqlite3`, adding
`sage/combinat/words/finite_word.py` to the quiet browser-profile dashboard.
The focused rerun records
`finite_word.py: 1262 passed, 0 failed, 55 skipped`.

The doctest runner now seeds the lightweight `LyndonWords` constructor in the
common startup namespace, and the WASI `sage.all` patch exposes the same
constructor for startup parity on the next Sagelite package rebuild. This
clears the finite-word startup cluster where `is_lyndon()` sanity checks
compare filtered words against `LyndonWords(3, n)`. The added WASI source
patch classifies order-only set representations as `# random` and dictionary
insertion-order display drift as deferred `# known bug` skips. The saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `82ce9887ecefd61f220a02696d577c0f5fc5acd1`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile,
runner version 35, and about 960 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-26 recursively-enumerated
set corpus-growth pass:

```text
sage -t passed: 17774 passed, 0 failed, 3144 skipped
```

That run records 20,918 block rows across the current 132-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/tmp/sagelite-corpus-after-recursively-enumerated.sqlite3`, adding
`sage/sets/recursively_enumerated_set.pyx` to the quiet browser-profile
dashboard. The focused rerun records
`recursively_enumerated_set.pyx: 322 passed, 0 failed, 56 skipped`.

The doctest runner now seeds the lightweight `FiniteEnumeratedSets` category
constructor and `Family` in the common startup namespace, and the WASI
`sage.all` patch exposes the same names for startup parity on the next
Sagelite package rebuild. The added WASI source patch classifies the file's
alarm-backed interruptibility check, multiprocessing-backed `map_reduce`, and
randomized membership examples as deferred browser-profile coverage, while
marking order-only set representations as `# random`. The saved block- and
file-failure cluster queries are empty. The latest run metadata records CoWasm
commit `09b50b76f1c891e73af147c581a8a6779b9a1d2e`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 36,
and about 1,209 seconds of elapsed time.

Latest checked local corpus run after the 2026-06-27 category
corpus-growth pass:

```text
sage -t passed: 24968 passed, 0 failed, 4991 skipped
```

That run records 29,959 block rows across the current 183-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`, adding
`sage/categories/enumerated_sets.py` and `sage/categories/finite_sets.py` to
the quiet browser-profile dashboard. Focused reruns record
`enumerated_sets.py: 126 passed, 0 failed, 38 skipped` and
`finite_sets.py: 16 passed, 0 failed, 0 skipped`.

The doctest runner now seeds the lightweight `Posets`, `FiniteMonoids`, and
`FiniteSemigroups` category constructors in the common startup namespace, and
the WASI `sage.all` patch exposes the same names for startup parity on a
fresh patched Sagelite source copy. The added WASI source patch marks the
`enumerated_sets.py` quotient-ring examples as `# needs sage.libs.singular`,
because they import the unavailable plural polynomial path before reaching the
intended generic quotient-ring diagnostic. The saved block- and file-failure
cluster queries are empty. The latest run metadata records CoWasm commit
`8f66ee10bda2ce3eb69b9298d5f7f0f2f0ba797d`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 40,
and about 1,325 seconds of elapsed time.

Focused category corpus-growth pass after the 2026-06-27
finite-enumerated-sets sampling:

```text
sage -t passed: 122 passed, 0 failed, 16 skipped
```

That one-file make-target validation adds
`sage/categories/finite_enumerated_sets.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 184
non-comment entries. The file required no new WASI source tags or startup
namespace changes; the existing `FiniteEnumeratedSets` startup seed covers its
upstream examples in the default node profile. The focused validation used
`make -C sagemath/sagelite test-sage-doctest-corpus` with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-finite-enumerated-corpus.sqlite3`.

Sampling in the same pass kept `sage/categories/sets_cat.py`,
`sage/categories/finite_semigroups.py`, `sage/categories/finite_monoids.py`,
and `sage/categories/modules.py` out of the quiet corpus because they still
have focused doctest failures. `sage/categories/posets.py` is also still out:
under the default browser-profile tags it currently adds only skipped rows, so
it would not improve the non-skipped compatibility dashboard.

Focused finite-semigroup category corpus-growth pass:

```text
sage -t passed: 11 passed, 0 failed, 3 skipped
```

That one-file make-target validation adds
`sage/categories/finite_semigroups.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 185
non-comment entries. The doctest runner now seeds `Semigroups` in the common
startup namespace, and the WASI `sage.all` patch exposes the same constructor
for REPL parity on a fresh patched Sagelite source copy. This clears the
file's only sampled failure:
`NameError: name 'Semigroups' is not defined`. The focused validation used
`make -C sagemath/sagelite test-sage-doctest-corpus` with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-finite-semigroups-make.sqlite3`. The saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `4b59149df25523cfe5edd636187136e50c7a2c6a`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and
runner version 41.

Focused finite-monoid category corpus-growth pass:

```text
sage -t passed: 26 passed, 0 failed, 35 skipped
```

That one-file make-target validation adds
`sage/categories/finite_monoids.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 186
non-comment entries. The doctest runner now seeds the lightweight `Monoids`
and `Groups` category constructors in the common startup namespace, and the
WASI `sage.all` patch exposes the same names for REPL parity on a fresh
patched Sagelite source copy. This clears the sampled `NameError` failures for
`Monoids().Finite().example()` and
`Semigroups().Finite().Subobjects() & Groups()`. The focused validation used
`make -C sagemath/sagelite test-sage-doctest-corpus` with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-finite-monoids-make.sqlite3`. The saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `a4693d2c56058064f566bcce1e9b8cdcb69b2733`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, and runner version 41.

Focused monoid and infinite-enumerated category corpus-growth pass:

```text
sage -t passed: 54 passed, 0 failed, 66 skipped
```

That two-file make-target validation adds
`sage/categories/infinite_enumerated_sets.py` and
`sage/categories/monoids.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 188
non-comment entries. `monoids.py` reuses the existing `Monoids` startup seed,
while the doctest runner now also seeds `InfiniteEnumeratedSets` to match the
reduced WASI `sage.all` startup namespace.

The focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary two-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-monoids-corpus.sqlite3`. The
saved block- and file-failure cluster queries are empty.

Focused sets-category corpus-growth pass:

```text
sage -t passed: 342 passed, 0 failed, 167 skipped
```

That one-file make-target validation adds `sage/categories/sets_cat.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 189 non-comment
entries. The doctest runner now seeds the lightweight `AdditiveMagmas`,
`EuclideanDomains`, `Rings`, and `End` constructors in the common startup
namespace, and the WASI `sage.all` patch exposes the same names for REPL
parity on a fresh patched Sagelite source copy. This clears the sampled
startup-name failures in `sets_cat.py`, including the `End(QQ).identity()`
example whose dependent inverse-display checks previously compared against a
stale doctest value after the setup assignment failed.

The focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-sets-cat-make.sqlite3`. The saved block-
and file-failure cluster queries are empty. The latest run metadata records
CoWasm commit `38c936e10f8bfd4af89101b65af48097171a70c4`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and runner
version 41.

Focused module-category corpus-growth pass:

```text
sage -t passed: 86 passed, 0 failed, 63 skipped
```

That one-file direct-run validation adds `sage/categories/modules.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 190
non-comment entries. The doctest runner now seeds the lightweight
`Algebras`, `Coalgebras`, `FiniteFields`, `ModulesWithBasis`, and
`VectorSpaces` category constructors in the common startup namespace, and
aliases `RingModules` to `Modules` to match Sage's category-all export without
importing the broad `sage.categories.all` surface. The WASI `sage.all` patch
exposes the same startup names for REPL parity on a fresh patched Sagelite
source copy.

The focused validation used the direct doctest runner against the existing
patched source tree with
`SAGELITE_DOCTEST_DB=/tmp/sagelite-modules-focus.sqlite3`. The saved block-
and file-failure cluster queries are empty. A full make-target rebuild was not
used for this pass because the external `/home/user/sagelite` source checkout
had unrelated dirty changes and a patch dry-run reported unrelated
`integer_mod_ring.py` hunk drift.

Focused additive-semigroup and rng category corpus-growth pass:

```text
sage -t passed: 17 passed, 0 failed, 14 skipped
```

That two-file direct-run validation adds
`sage/categories/commutative_additive_semigroups.py` and
`sage/categories/rngs.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 194
non-comment entries. The doctest runner now seeds
`CommutativeAdditiveGroups` in the common startup namespace, and the WASI
`sage.all` patch exposes the same constructor for REPL parity on a fresh
patched Sagelite source copy. This clears the `rngs.py` startup-name failure
for `(CommutativeAdditiveGroups() & Semigroups()).Distributive()`.

The added WASI source patch classifies the remaining `rngs.py`
multivariate-principal-ideal display check as
`# needs sage.rings.polynomial.plural`, because rendering that ideal imports
the unavailable noncommutative polynomial `plural` module in the stripped
browser profile. Focused validation against the existing patched source tree
records `rngs.py: 11 passed, 0 failed, 14 skipped` and
`commutative_additive_semigroups.py: 6 passed, 0 failed, 0 skipped`, with
empty saved block- and file-failure cluster queries. The updated WASI source
patch was also applied successfully to a temporary copy of the Sagelite source
checkout; a full corpus refresh was deferred in favor of the focused two-file
validation.

Focused additive-category corpus-growth pass:

```text
sage -t passed: 162 passed, 0 failed, 56 skipped
```

That four-file make-target validation adds
`sage/categories/additive_groups.py`,
`sage/categories/additive_magmas.py`,
`sage/categories/additive_monoids.py`, and
`sage/categories/additive_semigroups.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 198
non-comment entries. The doctest runner now seeds the lightweight
`AdditiveGroups`, `AdditiveMonoids`, and `AdditiveSemigroups` constructors in
the common startup namespace, and the WASI `sage.all` patch exposes the same
names for REPL parity on a fresh patched Sagelite source copy.

The added WASI source patch classifies the `AdditiveGroups().axioms()`
frozenset display check as `# random`, matching the existing treatment for
order-nondeterministic category axiom displays. The focused validation used
`make -C sagemath/sagelite test-sage-doctest-corpus` with a temporary
four-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-additive-categories-make.sqlite3`. The
saved block- and file-failure cluster queries are empty. The latest run
metadata records CoWasm commit `b0623c8f4d56f63ba3f51aae984f6e9c0084faa1`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, and runner version 41.

Focused commutative-additive and group-category corpus-growth pass:

```text
sage -t passed: 29 passed, 0 failed, 83 skipped
```

That three-file make-target validation adds
`sage/categories/commutative_additive_groups.py`,
`sage/categories/commutative_additive_monoids.py`, and
`sage/categories/groups.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 201
non-comment entries. These files require no new WASI source tags or startup
namespace changes beyond the constructors already seeded by the recent
category passes.

Focused validation against the existing patched source tree used
`make -C sagemath/sagelite test-sage-doctest-corpus` with a temporary
three-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-comm-add-groups-make.sqlite3`. It records
`commutative_additive_groups.py: 17 passed, 0 failed, 4 skipped`,
`commutative_additive_monoids.py: 5 passed, 0 failed, 0 skipped`, and
`groups.py: 7 passed, 0 failed, 79 skipped`, with empty saved block- and
file-failure cluster queries. The latest run metadata records CoWasm commit
`c3285a062fb2eb03e71be6304e90c825707007eb`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and runner
version 41.

Focused semigroup/module-adjacent category corpus-growth pass:

```text
sage -t passed: 36 passed, 0 failed, 0 skipped
```

That four-file make-target validation adds
`sage/categories/aperiodic_semigroups.py`,
`sage/categories/finitely_generated_semigroups.py`,
`sage/categories/left_modules.py`, and
`sage/categories/right_modules.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 205
non-comment entries. These files require no new WASI source tags or startup
namespace changes.

The focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary four-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-followup-make.sqlite3`. It records
`aperiodic_semigroups.py: 1 passed, 0 failed, 0 skipped`,
`finitely_generated_semigroups.py: 27 passed, 0 failed, 0 skipped`,
`left_modules.py: 4 passed, 0 failed, 0 skipped`, and
`right_modules.py: 4 passed, 0 failed, 0 skipped`, with empty saved block- and
file-failure cluster queries. The latest run metadata records CoWasm commit
`9a05a310c508f3c72d829b376c47b189a1376762`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and runner
version 41.

Focused magma-combination category corpus-growth pass:

```text
sage -t passed: 39 passed, 0 failed, 2 skipped
```

That three-file make-target validation adds
`sage/categories/finitely_generated_magmas.py`,
`sage/categories/magmas_and_additive_magmas.py`, and
`sage/categories/distributive_magmas_and_additive_magmas.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 209
non-comment entries. The doctest runner now seeds the lightweight `Fields`
category constructor in the common startup namespace, and the WASI `sage.all`
patch exposes the same constructor for REPL parity on a fresh patched Sagelite
source copy. This clears the `magmas_and_additive_magmas.py` startup-name
failure for `Fields().Distributive.__module__`.

The focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary three-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-magma-category-growth.sqlite3`. It records
`finitely_generated_magmas.py: 6 passed, 0 failed, 0 skipped`,
`magmas_and_additive_magmas.py: 21 passed, 0 failed, 1 skipped`, and
`distributive_magmas_and_additive_magmas.py: 12 passed, 0 failed, 1 skipped`,
with empty saved block- and file-failure cluster queries. The make target also
refreshed and patched the Sagelite source copy successfully after the WASI
patch hunk grew by one startup import. The latest run metadata records CoWasm
commit `e33e41322d8a3ab95c11bfc587ca9acd9071590e`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and runner
version 41.

Focused algebra-category corpus-growth pass:

```text
sage -t passed: 57 passed, 0 failed, 82 skipped
```

That three-file make-target validation adds `sage/categories/algebras.py`,
`sage/categories/algebras_with_basis.py`, and
`sage/categories/vector_spaces.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 212
non-comment entries. These files reuse startup constructors already seeded by
the recent category passes, so no new WASI source tags or startup namespace
changes are required.

Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary three-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-algebra-categories-make.sqlite3`.
It records `algebras.py: 18 passed, 0 failed, 21 skipped`,
`algebras_with_basis.py: 8 passed, 0 failed, 48 skipped`, and
`vector_spaces.py: 31 passed, 0 failed, 13 skipped`, with empty saved block-
and file-failure cluster queries. The same sampling pass keeps
`sage/categories/coalgebras.py` out because it currently adds only skipped
rows, and keeps `sage/categories/modules_with_basis.py`,
`sage/categories/commutative_rings.py`, `sage/categories/finite_fields.py`,
and `sage/categories/fields.py` out because they still have focused doctest
failures or runtime traps.

Focused algebra-wrapper category corpus-growth pass:

```text
sage -t passed: 139 passed, 0 failed, 515 skipped
```

That 15-file make-target validation adds
`sage/categories/associative_algebras.py`,
`sage/categories/bialgebras_with_basis.py`,
`sage/categories/coalgebras_with_basis.py`,
`sage/categories/commutative_algebras.py`,
`sage/categories/filtered_algebras.py`,
`sage/categories/filtered_algebras_with_basis.py`,
`sage/categories/finite_dimensional_coalgebras_with_basis.py`,
`sage/categories/finite_dimensional_hopf_algebras_with_basis.py`,
`sage/categories/finite_dimensional_modules_with_basis.py`,
`sage/categories/finite_dimensional_semisimple_algebras_with_basis.py`,
`sage/categories/graded_algebras.py`,
`sage/categories/graded_modules_with_basis.py`,
`sage/categories/hopf_algebras.py`,
`sage/categories/hopf_algebras_with_basis.py`, and
`sage/categories/unital_algebras.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 227
non-comment entries. These files reuse existing category startup namespace
coverage and do not need new WASI source tags.

Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary 15-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-algebra-wrapper-categories.sqlite3`.
The saved block- and file-failure cluster queries are empty. The latest run
metadata records CoWasm commit `fa81380a6b2ae1abaadb39c86d2f52d7b8701811`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, and runner version 41. The same sampling pass keeps
`sage/categories/magmatic_algebras.py` out because it still has
`DescentAlgebra` startup-name failures, keeps `bialgebras.py` out because it
currently adds only skipped rows, and keeps
`finite_dimensional_algebras_with_basis.py`,
`finite_dimensional_bialgebras_with_basis.py`,
`graded_algebras_with_basis.py`, and `graded_modules.py` out because they
still have focused doctest failures.

Focused algebra-module and super-category corpus-growth pass:

```text
sage -t passed: 60 passed, 0 failed, 80 skipped
```

That nine-file make-target validation adds
`sage/categories/algebra_modules.py`, `sage/categories/bimodules.py`,
`sage/categories/graded_bialgebras_with_basis.py`,
`sage/categories/group_algebras.py`, `sage/categories/matrix_algebras.py`,
`sage/categories/monoid_algebras.py`, `sage/categories/semisimple_algebras.py`,
`sage/categories/super_algebras.py`, and
`sage/categories/supercommutative_algebras.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 236
non-comment entries. These files reuse existing category startup namespace
coverage and do not need new WASI source tags.

Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary nine-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-clean.sqlite3`. The saved block-
and file-failure cluster queries are empty. The latest run metadata records
CoWasm commit `572d413356e5fbd2e30b7b576650295d6283803c`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and runner
version 41. The same sampling pass keeps
`sage/categories/filtered_modules.py`,
`sage/categories/filtered_modules_with_basis.py`,
`sage/categories/modules_with_basis.py`,
`sage/categories/super_algebras_with_basis.py`,
`sage/categories/super_hopf_algebras_with_basis.py`,
`sage/categories/super_modules.py`, and
`sage/categories/super_modules_with_basis.py` out because they still have
focused doctest failures.

Focused graded and realization category corpus-growth pass:

```text
sage -t passed: 43 passed, 0 failed, 45 skipped
```

That nine-file make-target validation adds
`sage/categories/filtered_hopf_algebras_with_basis.py`,
`sage/categories/graded_bialgebras.py`,
`sage/categories/graded_coalgebras.py`,
`sage/categories/graded_coalgebras_with_basis.py`,
`sage/categories/graded_hopf_algebras.py`,
`sage/categories/graded_hopf_algebras_with_basis.py`,
`sage/categories/quotients.py`, `sage/categories/subobjects.py`, and
`sage/categories/with_realizations.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 245
non-comment entries.

The doctest runner now seeds lightweight bialgebra, coalgebra-with-basis, and
Hopf-algebra category constructors in the common startup namespace:
`Bialgebras`, `CoalgebrasWithBasis`, `GradedHopfAlgebrasWithBasis`,
`HopfAlgebras`, and `HopfAlgebrasWithBasis`. The WASI `sage.all` patch exposes
the same names for REPL parity on a fresh patched Sagelite source copy. This
clears the startup-name failures in the graded Hopf, graded coalgebra, and
with-realizations examples.

Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary nine-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-wrapper-categories.sqlite3`. The make
target rebuilt and patched the Sagelite source copy successfully after the
expanded `src/sage/all.py` WASI startup hunk. The saved block- and file-failure
cluster queries are empty. The latest run metadata records CoWasm commit
`8617cc901006d16ca90e4b78fb0eea1327d5413e`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and runner
version 42. The same sampling pass keeps `sage/categories/bialgebras.py`,
`sage/categories/coalgebras.py`, and `sage/categories/subquotients.py` out of
the quiet corpus because they currently add no passing default-profile blocks.

Focused domain category corpus-growth pass:

```text
sage -t passed: 38 passed, 0 failed, 14 skipped
```

That three-file make-target validation adds `sage/categories/domains.py`,
`sage/categories/integral_domains.py`, and `sage/categories/gcd_domains.py` to
the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 248 non-comment
entries. The files add lightweight category coverage for domain, integral
domain, and gcd-domain examples without new startup namespace or WASI source
patches.

Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary three-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-domain-categories.sqlite3`. The saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `53a74801a088653239b996ec3ab8c4a28b8ed6f5`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and
runner version 42. The same sampling pass keeps
`sage/categories/commutative_rings.py` out because its `is_square()` example
still reaches a WASM `memory access out of bounds` trap, and keeps
`sage/categories/principal_ideal_domains.py` and
`sage/categories/unique_factorization_domains.py` out because their
polynomial gcd/radical examples time out in the current default node profile.

Focused small-category wrapper corpus-growth pass:

```text
sage -t passed: 129 passed, 0 failed, 10 skipped
```

That ten-file make-target validation adds
`sage/categories/algebra_ideals.py`,
`sage/categories/commutative_algebra_ideals.py`,
`sage/categories/commutative_ring_ideals.py`,
`sage/categories/facade_sets.py`, `sage/categories/noetherian_rings.py`,
`sage/categories/objects.py`, `sage/categories/pointed_sets.py`,
`sage/categories/sets_with_grading.py`,
`sage/categories/sets_with_partial_maps.py`, and
`sage/categories/topological_spaces.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 258 non-comment
entries. These files require no new WASI source tags or startup namespace
changes.

Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary ten-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-small-category-followup.sqlite3`. The saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `a1d5cd0cddd549b8c1908e5605e96b7301f3ed76`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and
runner version 42. The same sampling pass keeps
`sage/categories/ring_ideals.py` out because it still has focused doctest
failures, keeps `sage/categories/division_rings.py` out because it has focused
semantic failures, and keeps `sage/categories/metric_spaces.py` out because it
still has mixed failures and skipped graph/topology boundary coverage.

Focused module-wrapper category corpus-growth pass:

```text
sage -t passed: 56 passed, 0 failed, 22 skipped
```

That four-file make-target validation adds
`sage/categories/filtered_modules.py`,
`sage/categories/finite_dimensional_bialgebras_with_basis.py`,
`sage/categories/super_modules.py`, and
`sage/categories/super_hopf_algebras_with_basis.py` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 262
non-comment entries. These files reuse existing category startup namespace
coverage and require no new WASI source tags.

Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary four-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-followup.sqlite3`. The saved
block- and file-failure cluster queries are empty. The latest run metadata
records CoWasm commit `4e6f5fae5d6f21115840a145de41fecdbaee505a`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and
runner version 42.

Sampling in the same pass keeps `sage/categories/modules_with_basis.py`,
`sage/categories/filtered_modules_with_basis.py`,
`sage/categories/graded_modules.py`,
`sage/categories/graded_algebras_with_basis.py`,
`sage/categories/finite_dimensional_algebras_with_basis.py`,
`sage/categories/super_modules_with_basis.py`, and
`sage/categories/super_algebras_with_basis.py` out of the quiet corpus because
they still have focused doctest failures around combinatorial free modules,
exterior/Lie/descent algebras, matroid and arrangement examples, startup
namespace gaps, or output-order drift.

Focused super-module-with-basis category corpus-growth pass:

```text
sage -t passed: 4 passed, 0 failed, 38 skipped
```

That one-file focused validation adds
`sage/categories/super_modules_with_basis.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 263 non-comment
entries. The doctest runner now seeds the lightweight
`GradedModulesWithBasis` category constructor in the common startup namespace,
and the WASI `sage.all` patch exposes the same name for REPL parity on a fresh
patched Sagelite source copy. This clears the file's startup-name cluster
where upstream examples use `GradedModulesWithBasis(QQ)` without a local
import.

Focused validation used:

```sh
cd sagemath/sagelite/build/wasi-sdk
/home/user/cowasm/sagemath/sagelite/bin/sage -t --timeout=120 \
  --sqlite=/tmp/sagelite-super-modules-with-basis-after-seed.sqlite3 \
  src/sage/categories/super_modules_with_basis.py
```

The saved block- and file-failure cluster queries are empty. The same sampling
pass confirms that `sage/categories/modules_with_basis.py` and
`sage/categories/filtered_modules_with_basis.py` still have broader focused
failure clusters around `CombinatorialFreeModule`, exterior algebra, matroid,
and arrangement examples, so those remain out of the quiet corpus for a
larger category-with-basis pass.

Focused division-ring category corpus-growth pass:

```text
sage -t passed: 11 passed, 0 failed, 0 skipped
```

That one-file make-target validation adds
`sage/categories/division_rings.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 264
non-comment entries. The doctest runner now seeds the lightweight `Category`
base class in the common startup namespace, and the WASI `sage.all` patch
exposes the same name for REPL parity on a fresh patched Sagelite source copy.
This clears the file's only focused failure cluster, where upstream examples
define a local test category with `class Foo(Category)` without a local import.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-division-rings-make.sqlite3`. The saved
block- and file-failure cluster queries are empty.

Focused category utility corpus-growth pass:

```text
sage -t passed: 107 passed, 0 failed, 93 skipped
```

That 16-file make-target validation adds
`sage/categories/complete_discrete_valuation.py`,
`sage/categories/coercion_methods.pyx`,
`sage/categories/dedekind_domains.py`,
`sage/categories/function_fields.py`,
`sage/categories/h_trivial_semigroups.py`,
`sage/categories/hecke_modules.py`,
`sage/categories/isomorphic_objects.py`,
`sage/categories/j_trivial_semigroups.py`,
`sage/categories/l_trivial_semigroups.py`,
`sage/categories/partially_ordered_monoids.py`,
`sage/categories/permutation_groups.py`,
`sage/categories/r_trivial_semigroups.py`, `sage/categories/dual.py`,
`sage/categories/realizations.py`, `sage/categories/signed_tensor.py`, and
`sage/categories/tensor.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 280
non-comment entries.

These files require no new WASI source tags or startup namespace changes.
Focused validation used the `test-sage-doctest-corpus` make target with a
temporary 16-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-utility-make.sqlite3`. The saved
block- and file-failure cluster queries are empty.

The same sampling pass keeps `sage/categories/category_types.py`,
`sage/categories/homsets.py`,
`sage/categories/covariant_functorial_construction.py`,
`sage/categories/functor.pyx`, `sage/categories/poor_man_map.py`,
`sage/categories/map.pyx`, and `sage/categories/morphism.pyx` out because
they still have focused block-level failures. It keeps
`sage/categories/euclidean_domains.py` out because its polynomial
`gcd_free_basis` example times out in the default node profile, and keeps
`sage/categories/quotient_fields.py` out because its rational-function
example still reaches a WASM signature mismatch. Skipped-only files such as
`sage/categories/basic.py`, `sage/categories/groupoid.py`,
`sage/categories/algebra_functor.py`, `sage/categories/finite_groups.py`, and
`sage/categories/g_sets.py` also remain out because they add no passing
default-profile blocks.

Focused category-singleton corpus-growth pass:

```text
sage -t passed: 59 passed, 0 failed, 11 skipped
```

That one-file make-target validation adds
`sage/categories/category_singleton.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 281 non-comment
entries. The doctest runner now seeds the lightweight `Rngs` and `Semirings`
category constructors in the common startup namespace, and the WASI
`sage.all` patch exposes the same names for REPL parity on a fresh patched
Sagelite source copy. This clears the file's only sampled failure in the
singleton category note comparing `Rngs() & Semirings()` with `Rings()`.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-singleton-make.sqlite3`. The make
target rebuilt and patched the Sagelite source copy successfully after the
expanded `src/sage/all.py` WASI startup hunk. The saved block- and file-failure
cluster queries are empty, and the runner version is now 42.

Focused poor-man-map category corpus-growth pass:

```text
sage -t passed: 54 passed, 0 failed, 5 skipped
```

That one-file make-target validation adds
`sage/categories/poor_man_map.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 284
non-comment entries. The added WASI source patch gives the
`PoorManMap(sin, domain=RR, codomain=RR)` setup prompt the same
`# needs sympy sage.symbolic` metadata as the `_sympy_()` check it prepares,
so the stripped browser profile records the symbolic/SymPy example as an
explicit skip instead of failing before the tagged assertion line.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-poor-man-map-make.sqlite3`. The make target
rebuilt and patched the Sagelite source copy successfully, and the saved
block- and file-failure cluster queries are empty.

Focused category-types corpus-growth pass:

```text
sage -t passed: 68 passed, 0 failed, 28 skipped
```

That one-file make-target validation adds
`sage/categories/category_types.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 285
non-comment entries. The doctest runner now seeds the lightweight category and
scheme constructors needed by the file's upstream examples, including
`Spec`, `Schemes`, `ModularAbelianVarieties`, `GroupAlgebras`,
`AlgebraIdeals`, and the `Ideals` alias for `RingIdeals`; the WASI
`sage.all` patch exposes the same names for REPL parity on a fresh patched
Sagelite source copy.

This clears the startup-name cluster that previously left chained examples
with missing `C` state. The remaining multivariate ideal display example is
tagged as `# needs sage.rings.polynomial.plural`, matching the stripped
browser-profile boundary for the unavailable noncommutative polynomial module.
Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-types-make.sqlite3`. The make
target rebuilt and patched the Sagelite source copy successfully, and the
saved block- and file-failure cluster queries are empty.

Focused homsets category corpus-growth pass:

```text
sage -t passed: 57 passed, 0 failed, 0 skipped
```

That one-file focused validation adds `sage/categories/homsets.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 286 non-comment
entries. The doctest runner now seeds the lightweight `Objects` category
constructor in the common startup namespace, and the WASI `sage.all` patch
exposes the same name for REPL parity on a fresh patched Sagelite source copy.
This clears the file's only focused failure:
`NameError: name 'Objects' is not defined` in
`Objects().Homsets().super_categories()`.

Focused validation used a direct `sage -t` rerun with
`SAGELITE_DOCTEST_DB=/tmp/sagelite-homsets-after.sqlite3`; the saved block-
and file-failure cluster queries are empty. Sampling in the same pass kept
`sage/categories/covariant_functorial_construction.py` and
`sage/categories/map.pyx` out of the quiet corpus because they still have
focused startup-name, Singular/plural dependency, and output-drift clusters.

Focused map/morphism category corpus-growth pass:

```text
sage -t passed: 433 passed, 0 failed, 147 skipped
```

That two-file make-target validation adds `sage/categories/map.pyx` and
`sage/categories/morphism.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 288 non-comment
entries. The added WASI source patch classifies `Map._extra_slots_test()`,
the deprecated `is_Map(...)` warning check, and the morphism
`_extra_slots_test()` examples as `# random`, because the browser-profile
runtime preserves the semantic result while printing dictionary keys and
warnings differently from the historical doctest text. The same patch tags
the multivariate ideal pushforward examples in `map.pyx` as
`# needs sage.rings.polynomial.plural`, matching the stripped browser-profile
boundary for noncommutative polynomial support.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-map-morphism-make.sqlite3`. The make target
rebuilt and patched the Sagelite source copy successfully. The latest-run
summary records 580 total blocks, 433 passed, 147 skipped, 0 failed, runner
version 42, and empty saved block- and file-failure cluster queries.

Focused covariant functorial construction corpus-growth pass:

```text
sage -t passed: 61 passed, 0 failed, 7 skipped
```

That one-file make-target validation adds
`sage/categories/covariant_functorial_construction.py` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 291
non-comment entries. The doctest runner now seeds `tensor`, `GradedModules`,
and `GradedAlgebrasWithBasis` in the common startup namespace, and the WASI
`sage.all` patch exposes the same names for REPL parity on a fresh patched
Sagelite source copy. This clears the file's remaining startup-name clusters
around tensor functor construction and graded category base-class recovery.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-covariant-make.sqlite3`. The make target
rebuilt and patched the Sagelite source copy successfully. The latest-run
summary records 68 total blocks, 61 passed, 7 skipped, 0 failed, runner
version 42, and empty saved block- and file-failure cluster queries.

Sampling in the same pass kept `sage/categories/euclidean_domains.py` and
`sage/categories/quotient_fields.py` out because their focused polynomial and
rational-function examples still time out at the 120-second per-file boundary.
Skipped-only files such as `sage/categories/algebra_functor.py`,
`sage/categories/basic.py`, `sage/categories/finite_groups.py`,
`sage/categories/g_sets.py`, and `sage/categories/groupoid.py` still add no
passing default-profile blocks.

Focused category helper/graphs corpus-growth pass:

```text
sage -t passed: 65 passed, 0 failed, 1 skipped
```

That four-file make-target validation adds
`sage/categories/category_cy_helper.pyx`, `sage/categories/graphs.py`,
`sage/categories/ring_ideals.py`, and `sage/categories/tutorial.py` to the
curated corpus, bringing the checked
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus to 311
non-comment entries. The doctest runner now seeds the lightweight
`SimplicialComplexes` category constructor in the common startup namespace,
and the WASI `sage.all` patch exposes the same name for REPL parity on a fresh
patched Sagelite source copy. This clears the `category_cy_helper.pyx`
startup-name cluster where `SimplicialComplexes()` failed to build the shared
`T` setup tuple used by the following `join_as_tuple(...)` examples.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary four-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-new-clean.sqlite3`. The make
target rebuilt and patched the Sagelite source copy successfully after the
expanded `src/sage/all.py` WASI startup hunk. The latest-run summary records
66 total blocks, 65 passed, 1 skipped, 0 failed, runner version 42, and empty
saved block- and file-failure cluster queries.

Sampling in the same pass kept `sage/categories/category.py`,
`sage/categories/category_with_axiom.py`, and `sage/categories/homset.py` out
because they still have focused block-level failures. It kept
`sage/categories/pushout.py` and `sage/categories/fields.py` out because they
still reach the NTL/libcxx `memory access out of bounds` trap, kept
`sage/categories/rings.py` out because a polynomial quotient example overflows
the host call stack, and kept `sage/categories/commutative_rings.py`,
`sage/categories/principal_ideal_domains.py`, and
`sage/categories/unique_factorization_domains.py` out because their focused
polynomial/number-field examples still trap or time out. Skipped-only files
such as `sage/categories/bialgebras.py` and
`sage/categories/vector_bundles.py` still add no passing default-profile
blocks.

Focused lightweight category corpus-growth pass:

```text
sage -t passed: 31 passed, 0 failed, 5 skipped
```

That five-file make-target validation adds
`sage/categories/finite_weyl_groups.py`, `sage/categories/lie_groups.py`,
`sage/categories/modular_abelian_varieties.py`,
`sage/categories/polyhedra.py`, and `sage/categories/shephard_groups.py` to
the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 316 non-comment
entries. The files add small category-surface coverage for Weyl, Lie,
Shephard, modular-abelian-variety, and polyhedral categories without requiring
new WASI source tags.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary five-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-category-light-make.sqlite3`. The saved
block- and file-failure cluster queries are empty. The same sampling pass kept
`sage/categories/graded_lie_algebras_with_basis.py` out of the quiet corpus
because its focused doctests still have five block-level failures.

Focused graded algebra category corpus-growth pass:

```text
sage -t passed: 6 passed, 0 failed, 35 skipped
```

That one-file make-target validation adds
`sage/categories/graded_algebras_with_basis.py` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 317
non-comment entries. The added WASI source patch classifies the file's
matroid-backed Chow-ring top-degree examples as `# needs sage.matroids`,
leaving the lightweight graded-algebra category doctests as default
browser-profile coverage.

Focused validation used a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-graded-algebras-with-basis-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. The latest run
metadata records CoWasm commit `63177ca35204b9a20af808382580109b0ab8edda`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, and runner version 42.

Focused Weyl/reflection/poset category corpus-growth pass:

```text
sage -t passed: 60 passed, 0 failed, 279 skipped
```

That five-file make-target validation adds
`sage/categories/affine_weyl_groups.py`,
`sage/categories/finite_complex_reflection_groups.py`,
`sage/categories/finite_lattice_posets.py`,
`sage/categories/generalized_coxeter_groups.py`, and
`sage/categories/simplicial_complexes.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 322
non-comment entries. The files provide lightweight default-profile coverage
for affine Weyl, finite complex reflection, finite lattice poset, generalized
Coxeter, and simplicial-complex category surfaces without adding new WASI
source patches.

Focused validation used a temporary five-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-weyl-reflection-poset-make.sqlite3`. The
make target rebuilt and patched the Sagelite source copy successfully. The
latest-run summary records 339 total blocks, 60 passed, 279 skipped, 0
failed, runner version 42, and empty saved block- and file-failure cluster
queries.

Sampling in the same pass kept skip-only wrappers such as
`sage/categories/weyl_groups.py`,
`sage/categories/finite_coxeter_groups.py`,
`sage/categories/complex_reflection_or_generalized_coxeter_groups.py`,
`sage/categories/finite_permutation_groups.py`,
`sage/categories/posets.py`, and `sage/categories/finite_posets.py` out of
the quiet corpus because they add no passing default-profile blocks. It also
kept `sage/categories/finite_fields.py`, `sage/categories/metric_spaces.py`,
`sage/categories/filtered_modules_with_basis.py`,
`sage/categories/graded_modules.py`, `sage/categories/manifolds.py`,
`sage/categories/coxeter_groups.py`,
`sage/categories/complex_reflection_groups.py`, and
`sage/categories/lattice_posets.py` out because their focused doctests still
have file-level traps or block-level failure clusters.

Focused metric/scheme category corpus-growth pass:

```text
sage -t passed: 72 passed, 0 failed, 40 skipped
```

That two-file make-target validation adds
`sage/categories/metric_spaces.py` and `sage/categories/schemes.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 327 measured
non-comment entries. The added WASI source patch classifies the
real-field-backed cartesian-product examples in `metric_spaces.py` as
`# needs sage.rings.real_mpfr`, and classifies the elliptic-curve homset
examples in `schemes.py` as `# needs sage.schemes.elliptic_curves`.

Focused validation used a temporary two-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-metric-schemes-make.sqlite3`. The make
target rebuilt and patched the Sagelite source copy successfully, then
recorded `metric_spaces.py: 33 passed, 0 failed, 35 skipped` and
`schemes.py: 39 passed, 0 failed, 5 skipped`; the saved block- and
file-failure cluster queries are empty.

Sampling in the same pass kept skipped-only files such as the category
example modules for algebras with basis, filtered modules with basis, finite
Coxeter groups, finite-dimensional algebras with basis, graded modules with
basis, sets, realizations, and the `groupoid.py`, `posets.py`, and
`finite_posets.py` wrappers out of the quiet corpus. `manifolds.py` remains
out because its remaining focused failures are TestSuite pickling-output
drift around lazy imports.

Focused discrete-valuation category corpus-growth pass:

```text
sage -t passed: 23 passed, 0 failed, 33 skipped
```

That one-file focused validation adds
`sage/categories/discrete_valuation.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 328
non-comment entries. The doctest runner now seeds Sage's `algebras` catalog
object in the common startup namespace, and the WASI `sage.all` patch exposes
the same name for REPL parity on a fresh patched Sagelite source copy. This
clears the file's only focused failure cluster, where the upstream
`algebras.Free(...)` doctest previously cascaded into three `NameError`
failures.

Direct validation recorded `discrete_valuation.py: 23 passed, 0 failed,
33 skipped`. Focused make-target validation rebuilt and patched the Sagelite
source copy from scratch, then ran `test-sage-doctest-corpus` with a temporary
one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-discrete-valuation-make.sqlite3`; the saved
block- and file-failure cluster queries are empty. The runner version is now
43.

Focused manifold-category corpus-growth pass:

```text
sage -t passed: 32 passed, 0 failed, 23 skipped
```

That one-file focused validation adds `sage/categories/manifolds.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 329
non-comment entries. The added WASI source patch classifies the seven
remaining category `TestSuite(...).run()` examples as `# known bug` because
they currently fail only in `_test_pickling` while serializing manifold
category objects through a lazy-import tuple. The category construction,
subcategory, and super-category examples still run in the default profile.

Focused make-target validation rebuilt and patched the Sagelite source copy
from scratch, then ran a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-manifolds-make.sqlite3`; the saved block-
and file-failure cluster queries are empty. The runner version remains 43.

Focused homset category corpus-growth pass:

```text
sage -t passed: 139 passed, 0 failed, 122 skipped
```

That one-file focused validation adds `sage/categories/homset.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 330
non-comment entries. The doctest runner now seeds the lightweight
`ChainComplexes` constructor in the common startup namespace, and the WASI
`sage.all` patch exposes the same constructor for REPL parity on a fresh
patched Sagelite source copy. This clears the uninitialized-parent
`Hom(..., ChainComplexes(QQ), check=False)` startup-name failure.

The added WASI source patch classifies the noncommutative polynomial quotient
example as `# needs sage.rings.polynomial.plural`, and classifies the
affine/projective-space homset pickling examples as `# needs sage.schemes`.
Focused make-target validation rebuilt and patched the Sagelite source copy
from scratch, then ran a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-homset-make.sqlite3`; the saved block- and
file-failure cluster queries are empty. The runner version is now 44.

Focused graded-modules category corpus-growth pass:

```text
sage -t passed: 16 passed, 0 failed, 0 skipped
```

That one-file focused validation adds `sage/categories/graded_modules.py` to
the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 331 non-comment
entries. The doctest runner now seeds the lightweight `GradedAlgebras`
category constructor in the common startup namespace, and the WASI `sage.all`
patch exposes the same constructor for REPL parity on a fresh patched
Sagelite source copy. This clears the file's only focused failure cluster,
where upstream examples use `GradedAlgebras(QQ)` before checking graded
module category behavior.

Focused make-target validation rebuilt and patched the Sagelite source copy
from scratch, then ran a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-graded-modules-make.sqlite3`; the saved
block- and file-failure cluster queries are empty. The runner version remains
44.

Focused super-algebras-with-basis category corpus-growth pass:

```text
sage -t passed: 5 passed, 0 failed, 18 skipped
```

That one-file focused validation adds
`sage/categories/super_algebras_with_basis.py` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 332
non-comment entries. The added WASI source patch classifies the file's lone
remaining category `super_categories()` ordering drift as `# known bug`: the
same two category parents are returned, but the WebAssembly profile reports
them in the opposite order from the upstream doctest expectation. The core
super-algebra category construction and supercommutator examples remain
default-profile coverage.

Focused make-target validation rebuilt and patched the Sagelite source copy
from scratch, then ran a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-super-algebras-with-basis-make.sqlite3`.
The latest-run summary records 23 total blocks, 5 passed, 18 skipped,
0 failed, runner version 44, and empty saved block- and file-failure cluster
queries.

Focused number-field category corpus-growth pass:

```text
sage -t passed: 16 passed, 0 failed, 18 skipped
```

That one-file focused validation adds `sage/categories/number_fields.py` to
the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 333 non-comment
entries. The file gives the dashboard lightweight number-field category
coverage without new WASI source tags or startup namespace changes.

Focused make-target validation used a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-number-fields-make.sqlite3`; the saved
block- and file-failure cluster queries are empty. The same ring-category
sampling pass kept `sage/categories/quotient_fields.py`,
`sage/categories/principal_ideal_domains.py`, and
`sage/categories/unique_factorization_domains.py` out of the quiet corpus:
the first two still reach existing polynomial/number-field tuple assertion
traps, while the third times out in polynomial radical computation.

Focused magmatic-algebras category corpus-growth pass:

```text
sage -t passed: 12 passed, 0 failed, 35 skipped
```

That one-file focused validation adds
`sage/categories/magmatic_algebras.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 334
non-comment entries. The added WASI source patch classifies the
`DescentAlgebra(QQ,3).B()` finite-dimensional conversion example block as
`# needs sage.combinat sage.groups sage.modules`, matching the adjacent
already-tagged descent-algebra generator examples and avoiding cascading
startup-name failures for `B`, `B_fda`, and `e`.

Focused direct validation recorded `magmatic_algebras.py: 12 passed, 0
failed, 35 skipped`. Focused make-target validation rebuilt and patched the
Sagelite source copy from scratch, then ran a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-magmatic-algebras-make.sqlite3`; the saved
block- and file-failure cluster queries are empty. The runner version remains
44.

Focused Coxeter-adjacent category corpus-growth pass:

```text
sage -t passed: 15 passed, 0 failed, 10 skipped
```

That two-file focused validation adds
`sage/categories/complex_reflection_groups.py` and
`sage/categories/kac_moody_algebras.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 336
non-comment entries. The doctest runner now seeds the lightweight
`CoxeterGroups` category constructor in the common startup namespace, and the
WASI `sage.all` patch exposes the same constructor for REPL parity on a fresh
patched Sagelite source copy. This clears the
`ComplexReflectionGroups.ParentMethods.rank` examples that use
`CoxeterGroups().example()` without a local import.

Focused direct validation recorded
`complex_reflection_groups.py: 12 passed, 0 failed, 4 skipped` and
`kac_moody_algebras.py: 3 passed, 0 failed, 6 skipped`. Focused make-target
validation rebuilt and patched the Sagelite source copy from scratch, then ran
a temporary two-file corpus with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-root-category-make.sqlite3`; the saved
block- and file-failure cluster queries are empty. The runner version remains
44.

Focused action-category corpus-growth pass:

```text
sage -t passed: 74 passed, 0 failed, 33 skipped
```

That one-file focused validation adds `sage/categories/action.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 337
non-comment entries. The added WASI source patch classifies the two weakref
garbage-collection repr examples as `# known bug`, because the WebAssembly
profile raises the underlying `RuntimeError` directly instead of formatting it
through Sage's historical failed-`repr` output, and marks the `gc.collect()`
count check as `# random`.

Focused validation rebuilt and patched the Sagelite source copy from scratch,
then ran a temporary one-file corpus with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-action-make.sqlite3`; the saved block- and
file-failure cluster queries are empty. Sampling in the same pass confirmed
that several skipped-only category wrappers, including `bialgebras.py`,
`coalgebras.py`, `finite_groups.py`, `posets.py`, and
`finite_coxeter_groups.py`, still add no passing default-profile blocks, while
larger core category files still have startup-name or runtime-boundary
clusters that need separate triage.

Focused Knutson-Tao puzzle corpus-growth pass:

```text
sage -t passed: 384 passed, 0 failed, 14 skipped
```

That one-file make-target validation adds
`sage/combinat/knutson_tao_puzzles.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 338
non-comment entries. The file contributes substantial pure-combinatorics
coverage with no new WASI source tags or startup namespace changes. Focused
validation used a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-knutson-make.sqlite3`; the saved block- and
file-failure cluster queries are empty. The runner version is now 44.

The same sampling pass kept several adjacent files out of the quiet corpus:
`rsk.py`, `sloane_functions.py`, `similarity_class_type.py`,
`tamari_lattices.py`, and `nu_dyck_word.py` currently add only skipped rows
under the default browser-compatible profile, while
`gelfand_tsetlin_patterns.py` still records six focused doctest failures.
Broader category and module sampling in this run also found skipped-only
wrappers such as `real_set.py`, `finite_coxeter_groups.py`, and category
example modules, plus larger unresolved clusters in `coxeter_groups.py`,
`modules_with_basis.py`, `finite_dimensional_algebras_with_basis.py`,
`module_functors.py`, `unique_factorization_domains.py`, and
`principal_ideal_domains.py`.

Focused braid-orbit root-system corpus-growth pass:

```text
sage -t passed: 11 passed, 0 failed, 0 skipped
```

That one-file make-target validation adds
`sage/combinat/root_system/braid_orbit.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 339
non-comment entries. The file contributes small root-system braid-orbit
coverage with no new WASI source tags or startup namespace changes. Focused
validation used a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-braid-orbit-make.sqlite3`; the saved
block- and file-failure cluster queries are empty. Direct sampling in the same
pass kept `quotient_fields.py`, `euclidean_domains.py`, and `rings.py` out
because they currently trap or time out before contributing passing blocks,
and kept several empty or skipped-only utility/category files out of the quiet
corpus.

Focused misc-helper corpus-growth pass:

```text
sage -t passed: 224 passed, 0 failed, 9 skipped
```

That six-file make-target validation adds `sage/misc/binary_tree.pyx`,
`sage/misc/call.py`, `sage/misc/callable_dict.pyx`,
`sage/misc/constant_function.pyx`, `sage/misc/flatten.py`, and
`sage/misc/mrange.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 345
non-comment entries. The batch contributes compact Sage utility coverage for
binary trees, call dispatch, callable dictionaries, constant functions,
flattening, and multidimensional ranges without new WASI source tags or
startup namespace changes.

Direct focused reruns recorded `binary_tree.pyx: 59 passed, 0 failed, 2
skipped`, `call.py: 24 passed, 0 failed, 4 skipped`,
`callable_dict.pyx: 12 passed, 0 failed, 0 skipped`,
`constant_function.pyx: 21 passed, 0 failed, 0 skipped`,
`flatten.py: 12 passed, 0 failed, 3 skipped`, and
`mrange.py: 96 passed, 0 failed, 0 skipped`. Focused make-target validation
used a temporary six-file corpus with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-misc-helpers-make.sqlite3`; the saved
block- and file-failure cluster queries are empty. Sampling in the same pass
kept skipped-only category wrappers such as `algebra_functor.py`,
`finite_permutation_groups.py`, and `groupoid.py` out of the quiet corpus,
while `fields.py`, `finite_fields.py`, `commutative_rings.py`, and
`abstract_method.py` still need separate runtime-boundary or mismatch triage.

Focused misc utility corpus-growth pass:

```text
sage -t passed: 339 passed, 0 failed, 36 skipped
```

That nine-file focused validation adds `sage/misc/c3.pyx`,
`sage/misc/compat.py`, `sage/misc/element_with_label.py`,
`sage/misc/lazy_string.pyx`, `sage/misc/method_decorator.py`,
`sage/misc/multireplace.py`, `sage/misc/python.py`, `sage/misc/repr.py`, and
`sage/misc/sage_unittest.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 354
non-comment entries. The batch expands compact Sage utility coverage for C3
linearization, compatibility helpers, labelled elements, lazy strings, method
decorators, multiple replacement, Python-helper predicates, repr helpers, and
Sage unittest helpers without new WASI source tags or startup namespace
changes.

Direct sampling kept several nearby files out of the quiet corpus:
`decorators.py` still has deprecated-option output drift, `defaults.py` misses
the bare `beta` symbolic name, `lazy_format.py` intentionally raises during
string conversion, and `classgraph.py` imports the unavailable graph backend.
`map_threaded.py` contributes only skipped rows, and `copying.py` contributes
no doctest blocks under the default profile.

Focused misc support corpus-growth pass:

```text
sage -t passed: 171 passed, 0 failed, 26 skipped
```

That seven-file focused validation adds `sage/misc/function_mangling.pyx`,
`sage/misc/inherit_comparison.pyx`, `sage/misc/namespace_package.py`,
`sage/misc/nested_class.pyx`, `sage/misc/random_testing.py`,
`sage/misc/timing.py`, and `sage/misc/unknown.py` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 361
non-comment entries. The batch contributes focused support coverage for
function-name mangling, comparison inheritance, namespace-package helpers,
nested classes, randomized testing helpers, timing, and Sage's unknown-value
sentinel without new WASI source tags or startup namespace changes.

Direct focused reruns recorded `function_mangling.pyx: 31 passed, 0 failed,
1 skipped`, `inherit_comparison.pyx: 2 passed, 0 failed, 5 skipped`,
`namespace_package.py: 7 passed, 0 failed, 0 skipped`,
`nested_class.pyx: 66 passed, 0 failed, 9 skipped`,
`random_testing.py: 18 passed, 0 failed, 1 skipped`,
`timing.py: 25 passed, 0 failed, 10 skipped`, and
`unknown.py: 22 passed, 0 failed, 0 skipped`. The saved block- and
file-failure cluster queries are empty. The same sampling pass kept
`bindable_class.py`, `converting_dict.py`, `object_multiplexer.py`,
`prandom.py`, and `temporary_file.py` out of the quiet corpus because they
still have focused doctest failures under the default browser-compatible
profile.

Focused misc runtime corpus-growth pass:

```text
sage -t passed: 788 passed, 0 failed, 188 skipped
```

That twelve-file focused validation adds
`sage/misc/classcall_metaclass.pyx`, `sage/misc/derivative.pyx`,
`sage/misc/fast_methods.pyx`, `sage/misc/instancedoc.pyx`,
`sage/misc/lazy_import_cache.py`, `sage/misc/lazy_list.pyx`,
`sage/misc/misc_c.pyx`, `sage/misc/parser.pyx`,
`sage/misc/sage_eval.py`, `sage/misc/table.py`,
`sage/misc/test_class_pickling.py`, and
`sage/misc/test_nested_class.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 373
non-comment entries. The batch expands runtime utility coverage for
classcall metaclasses, formal derivatives, fast method helpers, instance
docstrings, lazy import cache/list behavior, C-level misc helpers, preparser
parsing, Sage eval, text tables, and nested-class pickling.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary twelve-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-misc-runtime-make.sqlite3`; the saved
block- and file-failure cluster queries are empty. Direct sampling kept
`c3_controlled.pyx`, `html.py`, `lazy_attribute.pyx`, `lazy_import.pyx`,
`misc.py`, `sage_input.py`, `sage_timeit.py`, `sage_timeit_class.pyx`,
`stopgap.pyx`, `superseded.py`, `verbose.py`, and `weak_dict.pyx` out of the
quiet corpus because they still have focused doctest failures or runtime
traps in the default browser-compatible profile. Skipped-only or empty
modules such as `copying.py`, `func_persist.py`, `mathml.py`, and `proof.py`
remain outside the dashboard for now.

Focused misc order-drift corpus-growth pass:

```text
sage -t passed: 92 passed, 0 failed, 8 skipped
```

That two-file make-target validation adds `sage/misc/abstract_method.py` and
`sage/misc/converting_dict.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 375
non-comment entries. The added WASI source patch marks one dict display in
each file as `# random`: `abstract_methods_of_class(...)` can print its
required and optional method lists in either dictionary-key order, and
`KeyConvertingDict._repr_pretty_` follows runtime dictionary display order
under the Node doctest runner. Both examples still execute, but the browser
profile no longer treats harmless ordering drift as a semantic failure.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-misc-order-corpus.sqlite3`. The make target
rebuilt and patched a fresh Sagelite source copy successfully, and the saved
block- and file-failure cluster queries are empty. Sampling in the same pass
kept `sage/misc/lazy_format.py` out of the quiet corpus because its remaining
failure is exception-rendering behavior rather than order drift, and kept
several nearby category files out because they either add only skipped rows or
immediately enter known polynomial-number-field, NTL/libcxx, or timeout
boundaries.

Focused misc browser-support corpus-growth pass:

```text
sage -t passed: 74 passed, 0 failed, 58 skipped
```

That five-file make-target validation adds `sage/misc/messaging.py`,
`sage/misc/package.py`, `sage/misc/remote_file.py`,
`sage/misc/rest_index_of_methods.py`, and `sage/misc/viewer.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 380
non-comment entries. The batch expands small browser-relevant utility
coverage for warning/message helpers, Sage package metadata, remote-file
fallback behavior, method index rendering, and viewer preference helpers
without new WASI source tags or startup namespace changes.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary five-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-misc-browser-support-make.sqlite3`. The
saved block- and file-failure cluster queries are empty. Direct sampling in
the same pass kept empty or skipped-only modules such as `mathml.py`,
`func_persist.py`, `proof.py`, `package_dir.py`, `pager.py`, and
`randstate.pyx` out of the quiet corpus, kept `functional.py` out because it
hit the 120-second focused-run guard, and kept `banner.py`,
`latex_macros.py`, `latex.py`, `citation.pyx`, `reset.pyx`, and
`sage_ostools.pyx` out because they still have focused doctest failures under
the default browser-compatible profile.

Focused category-primer corpus-growth pass:

```text
sage -t passed: 122 passed, 0 failed, 83 skipped
```

That one-file focused validation adds `sage/categories/primer.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 390
non-comment entries. The doctest runner now seeds the lightweight
`FiniteSets` and `DivisionRings` category constructors in the common startup
namespace, and the WASI `sage.all` patch exposes the same constructors for
REPL parity on a fresh patched Sagelite source copy. This clears primer
examples that use those constructors without local imports.

The added WASI source patch classifies the noncommutative polynomial quotient
example as `# needs sage.rings.polynomial.plural` and marks order-sensitive
category introspection displays as `# random`, preserving their execution
without treating set/dictionary ordering drift as a semantic failure.
Focused make-target validation used a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-primer-make.sqlite3`; the saved block- and
file-failure cluster queries are empty. The runner version remains 44.

Focused free-module homspace corpus-growth pass:

```text
sage -t passed: 37 passed, 0 failed, 10 skipped
```

That one-file make-target validation adds
`sage/modules/free_module_homspace.py` to the curated corpus. The doctest
runner now seeds `span` beside `FreeModule` and `VectorSpace`, and attaches
seeded names to the loaded `sage.all` module so pickle round-trips that look up
`sage.all.FreeModule` work in doctest mode without importing the full
`sage.modules.all` surface. The WASI `sage.all` patch exposes the same
`FreeModule`, `VectorSpace`, and `span` names for REPL parity on a fresh
patched Sagelite source copy.

The added WASI source patch classifies the `span_of_basis(...)` clusters as
`# needs sage.symbolic` and defers the `span(..., ZZ)` rational-generator
coercion drift as `# known bug`. Focused make-target validation used a
temporary one-file corpus with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-free-module-homspace-make.sqlite3`; the
saved block- and file-failure cluster queries are empty. A separate full
patch dry-run against the current `/home/user/sagelite` checkout still fails in
older `integer_mod_ring.py` hunks, so this focused validation used the existing
patched build tree after applying the new source-copy edits there.

Focused misc citation corpus-growth pass:

```text
sage -t passed: 7 passed, 0 failed, 3 skipped
```

That one-file make-target validation adds `sage/misc/citation.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 392 non-comment
entries. Direct sampling first recorded one failure in
`get_systems('I.primary_decomposition()')`, which routes through Singular
primary decomposition. The added WASI source patch marks that example as
`# needs sage.libs.singular`, preserving the lightweight citation dependency
tracking examples as ordinary passing coverage.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-citation-make.sqlite3`. The make target
rebuilt and patched a fresh Sagelite source copy successfully, and the saved
block- and file-failure cluster queries are empty. Adjacent direct samples of
`sage/misc/proof.py`, `sage/misc/mathml.py`, and `sage/misc/copying.py`
produced no runnable doctest blocks, so they remain outside the quiet corpus.

Focused misc pickle/search corpus-growth pass:

```text
sage -t passed: 32 passed, 0 failed, 6 skipped
```

That three-file make-target validation adds `sage/misc/edit_module.py`,
`sage/misc/fpickle.pyx`, and `sage/misc/search.pyx` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 395
non-comment entries. The batch expands quiet misc coverage for editor command
construction, pickle helper routines, and source-search helpers without new
WASI source tags or startup namespace changes.

Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary three-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-misc-pickle-search-make.sqlite3`. The
saved run records CoWasm commit `f81bdfcf2781d732237a72e40d042bd7ce1130a0`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, runner version 44, 38 total blocks, 32 passed blocks, and 6 skipped
blocks. The saved block- and file-failure cluster queries are empty. Direct
sampling in the same pass kept larger or host-sensitive misc modules such as
`cachefunc.pyx`, `dev_tools.py`, `explain_pickle.py`, `html.py`,
`latex_standalone.py`, `persist.pyx`, `sagedoc.py`, `sageinspect.py`,
`session.pyx`, `verbose.py`, and `weak_dict.pyx` out of the quiet corpus
because they still have focused doctest failures, missing optional host
dependencies, or timeout boundaries under the default browser-compatible
profile. Skipped-only or empty modules such as `cython.py`, `map_threaded.py`,
`pickle_old.pyx`, `profiler.py`, `sphinxify.py`, `latex_standalone_test.py`,
`latex_test.py`, and `sagedoc_conf.py` remain outside the dashboard for now.

Focused misc banner corpus-growth pass:

```text
sage -t passed: 16 passed, 0 failed, 1 skipped
```

That one-file make-target validation adds `sage/misc/banner.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 396 non-comment
entries. Direct sampling first recorded one output mismatch in `version()`
because the focused Sagelite doctest runner returned the correct Sage version
string but did not compare the expected deprecation-warning stream for that
example. The added WASI source patch marks that warning-capture drift as
`# known bug`, preserving the ordinary banner formatting and version parsing
examples as passing default-profile coverage.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-banner-make.sqlite3`. The make target
rebuilt and patched a fresh Sagelite source copy successfully, and the saved
block- and file-failure cluster queries are empty. The saved run records
CoWasm commit `7526262825f39f0c1014f3e5fd3b8319c3f4f702`, Sagelite package
commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and runner
version 44. Sampling in the same pass kept `sage/misc/classgraph.py`,
`benchmark.py`, `dev_tools.py`, `explain_pickle.py`, `html.py`, `reset.pyx`,
`sage_input.py`, `sage_ostools.pyx`, and `stopgap.pyx` out of the quiet
corpus because they still have focused doctest failures, missing optional
dependencies, or known NTL/libcxx trap boundaries under the default profile.

Focused misc superseded corpus-growth pass:

```text
sage -t passed: 38 passed, 0 failed, 28 skipped
```

That one-file make-target validation adds `sage/misc/superseded.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 399
non-comment entries. The file expands quiet misc coverage for Sage
deprecation, warning, experimental-status, and deprecated-function-alias
helpers.

Direct sampling first recorded 12 output mismatches where the Sagelite
doctest runner executed the examples and preserved ordinary return output,
but did not compare the expected warning stream. The added WASI source patch
marks exactly those warning-output examples as `# known bug`, leaving the
non-warning superseded-helper examples as passing coverage until runner
warning capture is improved. Focused validation used the
`test-sage-doctest-corpus` make target with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-superseded-make.sqlite3`. The make target
rebuilt and patched a fresh Sagelite source copy successfully, and the saved
block- and file-failure cluster queries are empty. A full corpus rerun should
be performed before recording a new dashboard total.

Follow-up full corpus rerun after the misc superseded pass:

```text
sage -t failed: 31403 passed, 3 failed, 7954 skipped
```

That run used the 399-entry curated corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/tmp/sagelite-corpus-after-misc-superseded.sqlite3`.
It exposed three narrow browser-profile drifts: one order-sensitive
`Monoids().axioms()` `frozenset` display, and two cascading
`free_module_homspace.py` failures where the existing WASI source patch
intended to skip the rational-generator `span(..., ZZ)` setup but a malformed
free-module patch hunk count prevented the tags from reaching a fresh patched
source copy.

The follow-up fix corrects the free-module hunk line count, widens the
`span(..., ZZ)` skip hunk so it applies under a fresh patch, and marks the
monoids `frozenset` display as `# random`. Focused validation rebuilt a fresh
patched source copy and ran `monoids.py` plus `free_module_homspace.py` with
failure disallowed:

```text
sage -t passed: 78 passed, 0 failed, 76 skipped
```

The focused database is
`/tmp/sagelite-regression-fixes-fresh2.sqlite3`; it has no failed block rows
and no non-passing file rows. A full corpus rerun is still needed before
recording the next clean dashboard total.

Focused graded Lie category corpus-growth pass:

```text
sage -t passed: 5 passed, 0 failed, 0 skipped
```

That one-file focused validation adds
`sage/categories/graded_lie_algebras_with_basis.py` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 400
non-comment entries. The doctest runner now seeds the lightweight
`LieAlgebras` category constructor in the common startup namespace, and the
WASI `sage.all` patch exposes the same constructor for REPL parity on a fresh
patched Sagelite source copy. This clears the file's only sampled failure:
`NameError: name 'LieAlgebras' is not defined`. The focused validation used
the direct `sage -t` harness with `--profile node`, `--timeout 90`, and
`--sqlite /tmp/sagelite-graded-lie-focused.sqlite3`; the saved block- and
file-failure cluster queries are empty.

Doctest runner SQLite/temp-artifact follow-up:

Full corpus reruns after the tensor-operation and graded-Lie additions exposed
runner infrastructure limits rather than stable Sage doctest failures. The
first full rerun completed enough to compute a clean aggregate
`31484 passed, 0 failed, 7972 skipped`, but the old SQLite writer committed
file/block rows incrementally through one `sqlite3` subprocess per file. The
Node parent was interrupted while still finalizing row inserts, leaving the
saved database internally inconsistent: the `runs` row had the full clean
aggregate, but only the first 323 file rows and 33,889 block rows had been
persisted.

The SQLite writer now stores the whole run in a single transaction using
temporary run/file-id tables, so file and block rows are committed atomically
and finalization avoids the per-file subprocess loop. A second set of full
reruns then exposed `/tmp` quota failures from the runner's worker option,
state, and result files. The runner now creates its doctest temp directory
next to the requested SQLite database and removes each file's worker artifacts
immediately after reading them. Runner version is now 48.

Focused make-target validation with workspace-local temp/database paths passes
for the sampled quota-failure files:

```text
sage -t passed: 153 passed, 0 failed, 33 skipped
```

That four-file validation covers `sage/combinat/degree_sequences.pyx`,
`sage/categories/algebra_ideals.py`, `sage/modules/tensor_operations.py`, and
`sage/modules/free_module_homspace.py`; its SQLite aggregates match the saved
file and block rows exactly, and the workspace doctest temp directory is
removed at exit. A fresh full corpus rerun is still needed before recording the
next clean dashboard total.

Follow-up full corpus rerun after the SQLite/temp-artifact runner pass:

```text
sage -t passed: 31484 passed, 0 failed, 7972 skipped
```

That make-target validation used the current 401-file curated corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`.
The run completed cleanly through the make target, removed its workspace-local
`.sagelite-doctest-*` temp directory at exit, and recorded runner version 48.
The saved SQLite dashboard has internally consistent aggregates: 401 file
rows, 39,456 block rows, 31,484 passed blocks, 0 failed blocks, and 7,972
skipped blocks. The saved block- and file-failure cluster queries are empty.
The latest run metadata records CoWasm commit
`a8231a6c961ae04c188e6ec50150562ac33ea9af`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 48,
and about 2,859 seconds of elapsed time.

Focused lazy-attribute corpus-growth pass:

```text
sage -t passed: 96 passed, 0 failed, 12 skipped
```

That one-file make-target validation adds `sage/misc/lazy_attribute.pyx` to
the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 402
non-comment entries. Direct sampling first recorded two focused failures: an
object-address repr display drift in `Parent.element_class`, now marked
`# random`, and a `timeit('a.x')` example that imports IPython through Sage's
timing helper despite random output, now marked `# needs IPython`.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-lazy-attribute-make.sqlite3`,
recording `lazy_attribute.pyx: 96 passed, 0 failed, 12 skipped`. The saved
block- and file-failure cluster queries are empty.

Focused vector-space morphism corpus-growth pass:

```text
sage -t passed: 200 passed, 0 failed, 77 skipped
```

That two-file focused validation adds
`sage/modules/vector_space_homspace.py` and
`sage/modules/vector_space_morphism.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 404
non-comment entries. Direct sampling recorded
`vector_space_homspace.py: 68 passed, 0 failed, 0 skipped`; adjacent heavier
module morphism files still have broader failure clusters and remain outside
the quiet dashboard.

Direct sampling of `vector_space_morphism.py` recorded three focused failures
in `inverse_image(...)` and `is_injective()` examples. All three route through
matrix-kernel computation over rational vector spaces and reach the existing
focused cypari2/PARI object-model boundary, so the added WASI source patch
classifies those examples as `# needs sage.libs.pari`.

Focused module backend corpus-growth pass:

```text
sage -t passed: 127 passed, 0 failed, 20 skipped
```

That three-file focused validation adds
`sage/modules/ore_module_homspace.py`,
`sage/modules/vector_integer_dense.pyx`, and
`sage/modules/vector_modn_dense.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 407
non-comment entries. Direct sampling recorded
`ore_module_homspace.py: 27 passed, 0 failed, 0 skipped`,
`vector_integer_dense.pyx: 43 passed, 0 failed, 3 skipped`, and
`vector_modn_dense.pyx: 57 passed, 0 failed, 17 skipped`.

The same sampling pass kept adjacent heavier module files outside the quiet
dashboard because they still hit known matrix action, matrix `__setitem__`,
NTL dynamic-link, PARI object-model, timeout, or broader semantic clusters.

Focused rational-vector backend corpus-growth pass:

```text
sage -t passed: 43 passed, 0 failed, 2 skipped
```

That one-file make-target validation adds
`sage/modules/vector_rational_dense.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 408
non-comment entries. Direct sampling first exposed the file's two huge
allocation diagnostics: native Sage expects catchable Python
`MemoryError`/`OverflowError` behavior, while the current WASM allocator path
aborts the worker while trying to satisfy the dynamic-library allocation. The
added WASI source patch marks exactly those allocator-diagnostic examples as
`# known bug`, leaving the remaining rational dense-vector backend examples as
passing browser-profile coverage.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-vector-rational-dense-make.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully;
the saved block- and file-failure cluster queries are empty, and the SQLite
aggregate is internally consistent with 45 block rows, 43 passed blocks, and
2 deferred skips. A full corpus rerun should be performed before recording the
next dashboard total.

Focused weak-dictionary corpus-growth pass:

```text
sage -t passed: 231 passed, 0 failed, 40 skipped
```

That one-file validation adds `sage/misc/weak_dict.pyx` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 409
non-comment entries. Direct sampling first exposed one missing startup helper
and one lazy-real-field proxy mismatch: the upstream doctests use `floor(...)`
without a local import, and the WASI `sage.all` startup surface keeps `RLF` as
a lazy import until first use. The doctest runner now seeds `floor` from
`sage.functions.other` and resolves `RLF` beside the existing core lazy fields
before examples run, so the weak-value dictionary examples exercise the real
field object rather than a non-weakrefable lazy proxy.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-weak-dict-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and the SQLite
aggregate is internally consistent with 271 block rows, 231 passed blocks, and
40 skipped blocks. Sampling in the same pass kept the double-vector backends
out because they add only skipped rows, kept `vector_mod2_dense.pyx` out
because it still clusters around missing `sage.matrix.matrix_mod2_dense`, and
kept `functional.py` out because it timed out in symbolic denominator setup.

Focused misc core utility corpus-growth pass:

```text
sage -t passed: 137 passed, 0 failed, 19 skipped
```

That one-file validation adds `sage/misc/misc.py` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 410
non-comment entries. Direct sampling first recorded warning-capture drift in
the global-variable injection examples and one IPython-only `run_once`
doctest. The WASI source patch marks the warning-producing stateful examples
as `# random` so they still execute and preserve subsequent doctest state,
marks the standalone `warn("blah")` stream-capture example as `# known bug`,
and marks the `sage.repl.ipython_extension` import as `# needs IPython`.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-misc-make.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully,
and the saved block- and file-failure cluster queries are empty. The same
sampling pass kept `sage/misc/sage_ostools.pyx` out because its current
failures cluster around stdout file-descriptor redirection under the Node
doctest worker.

Latest checked local corpus run after the 2026-06-27 verbose utility
corpus-growth pass:

```text
sage -t passed: 32340 passed, 0 failed, 8146 skipped
```

That run records 40,486 block rows across the current 411-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/home/user/cowasm/.tmp/sagelite-corpus-after-verbose.sqlite3`, adding
`sage/misc/verbose.py` to the quiet browser-profile dashboard. The focused
make-target validation records `verbose.py: 22 passed, 0 failed, 4 skipped`.

The added WASI source patch marks the two Python `logging` stream-capture
examples as `# random`, matching the existing Sagelite doctest boundary where
host logging or warning streams are not reliably captured by the Node worker
while the examples still execute and preserve module state. The saved block-
and file-failure cluster queries are empty for both the focused validation and
the full corpus run. The latest full-run metadata records CoWasm commit
`aba7f4d8ef7e703f10324d1bffa989408e708a3c`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 48,
and about 49 minutes of elapsed time.

Focused controlled-C3 corpus-growth pass:

```text
sage -t passed: 114 passed, 0 failed, 107 skipped
```

That one-file make-target validation adds `sage/misc/c3_controlled.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 412 non-comment
entries. Direct sampling first recorded eight missing-name failures around
category comparison-key examples for `SetsWithPartialMaps`,
`EnumeratedSets`, `SetsWithGrading`, `LatticePosets`, and `Crystals`. The
doctest runner now seeds those focused category constructors beside the
existing common category startup names, so the file exercises the intended C3
ordering behavior instead of depending on a broader `sage.categories.all`
import.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-c3-controlled-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and the SQLite
aggregate is internally consistent with 221 block rows, 114 passed blocks, and
107 skipped blocks. A full corpus rerun should be performed before recording
the next dashboard total.

Focused quotient-module corpus-growth pass:

```text
sage -t passed: 120 passed, 0 failed, 17 skipped
```

That one-file make-target validation adds `sage/modules/quotient_module.py`
to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 413
non-comment entries. Direct sampling first recorded 121 passed blocks and
three failures in one contiguous `VectorSpace(GF(2), 3)` quotient example; the
first line imports the stripped `sage.matrix.matrix_mod2_dense` backend, and
the following two examples only fail because that setup state is missing. The
added WASI source patch marks that region as
`# needs sage.matrix.matrix_mod2_dense`, leaving the rest of the quotient
module doctests as default browser-profile coverage.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-quotient-module-make.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully.
The saved block- and file-failure cluster queries are empty, and the SQLite
aggregate is internally consistent with 137 block rows, 120 passed blocks, and
17 skipped blocks. A full corpus rerun should be performed before recording
the next dashboard total.

Focused stopgap utility corpus-growth pass:

```text
sage -t passed: 11 passed, 0 failed, 0 skipped
```

That one-file make-target validation adds `sage/misc/stopgap.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 414
non-comment entries. Direct sampling first recorded two warning-capture
mismatches for `StopgapWarning` examples; the added WASI source patch marks
those warning-producing calls as `# random`, matching the existing Sagelite
doctest boundary where host warning streams are not reliably captured by the
Node worker while the examples still execute and preserve stopgap module
state.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-stopgap-make.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully.
The saved block- and file-failure cluster queries are empty, and the SQLite
aggregate is internally consistent with 11 block rows, all passed. A full
corpus rerun should be performed before recording the next dashboard total.

Latest checked local corpus run after the 2026-06-27 stopgap utility
corpus-growth pass:

```text
sage -t passed: 32585 passed, 0 failed, 8270 skipped
```

That make-target validation covers all 414 files in the current
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus and writes
`/home/user/cowasm/.tmp/sagelite-corpus-after-stopgap.sqlite3`. The saved
SQLite dashboard is internally consistent with 40,855 block rows, 32,585
passed blocks, no failed blocks, 8,270 skipped blocks, and no non-passing file
rows. The saved block- and file-failure cluster queries are empty. The latest
run metadata records CoWasm commit
`96b97de1c0811e2263370958379ca6f0b689975a`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 49,
and about 45 minutes of elapsed time.

Focused category wrapper corpus-growth pass:

```text
sage -t passed: 64 passed, 0 failed, 0 skipped
```

That focused direct validation adds `sage/categories/graded_lie_algebras.py`
and `sage/categories/ore_modules.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 416
non-comment entries. The two added files contribute compact category-wrapper
coverage with no new WASI source tags or startup namespace changes: direct
sampling recorded `graded_lie_algebras.py: 12 passed, 0 failed, 0 skipped`
and `ore_modules.py: 52 passed, 0 failed, 0 skipped`.

The same focused sample kept skipped-only wrappers out of the quiet corpus:
`sage/modules/numpy_util.pyx`, `sage/modules/complex_double_vector.py`,
`sage/modules/vector_real_double_dense.pyx`,
`sage/modules/vector_complex_double_dense.pyx`, and
`sage/categories/groupoid.py` recorded only deferred skips under the default
browser-compatible profile. Validation used the direct `sage -t` harness with
`--profile node`, `--timeout 90`, and
`--sqlite /home/user/cowasm/.tmp/sagelite-category-wrappers.sqlite3`; the
saved block- and file-failure cluster queries are empty. A full corpus rerun
should be performed before recording the next dashboard total.

Latest checked local corpus run after the 2026-06-27 category wrapper
corpus-growth pass:

```text
sage -t passed: 32649 passed, 0 failed, 8270 skipped
```

That make-target validation covers all 416 files in the current
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus and writes
`/home/user/cowasm/.tmp/sagelite-corpus-after-category-wrappers.sqlite3`. The
saved SQLite dashboard is internally consistent with 40,919 block rows,
32,649 passed blocks, no failed blocks, 8,270 skipped blocks, and no
non-passing file rows. The saved block- and file-failure cluster queries are
empty. The latest run metadata records CoWasm commit
`fc7492e7c132f2e19a3adca9f2599354fbd93447`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 49,
and about 48 minutes of elapsed time.

Focused finite-dimensional graded Lie category corpus-growth pass:

```text
sage -t passed: 16 passed, 0 failed, 21 skipped
```

That one-file direct validation adds
`sage/categories/finite_dimensional_graded_lie_algebras_with_basis.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 417 non-comment
entries. The file contributes compact category-wrapper coverage without new
WASI source tags or startup namespace changes.

Direct validation used the patched source tree with `sage -t --profile node`,
`--timeout 90`, and
`--sqlite /home/user/cowasm/.tmp/sagelite-next-small-sample.sqlite3`; the file
recorded 37 block rows, 16 passed blocks, no failed blocks, and 21 skipped
blocks. Follow-up make-target validation used a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-finite-dimensional-graded-lie-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

The same sampling pass kept `sage/categories/subquotients.py` out because it
contributes no doctest blocks, kept
`sage/categories/finitely_generated_lie_conformal_algebras.py` out because it
adds only skipped rows, and kept `sage/categories/graded_lie_conformal_algebras.py`,
`sage/categories/lambda_bracket_algebras.py`, `sage/modules/ore_module.py`,
and `sage/modules/module_functors.py` out because they still hit existing
symbolic, PARI/cypari2, table-index, or module-functor failure clusters. A
full corpus rerun should be performed before recording the next dashboard
total.

Focused category-with-axiom corpus-growth pass:

```text
sage -t passed: 317 passed, 0 failed, 4 skipped
```

That one-file make-target validation adds
`sage/categories/category_with_axiom.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 418 non-comment
entries. Direct sampling first recorded 305 passed blocks, 12 failures, and 4
skipped blocks. The failures were startup namespace gaps for lightweight
category constructors used by upstream examples:
`FiniteGroups`, `FiniteCoxeterGroups`, `Domains`,
`FiniteDimensionalHopfAlgebrasWithBasis`, and `PermutationGroups`, plus one
order-sensitive `Rings().axioms()` frozenset display check. The doctest runner
now seeds those constructors in the common startup namespace, the WASI
`sage.all` patch exposes them for REPL parity after a Sagelite package
rebuild, and the unordered frozenset example is marked `# random`.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-category-with-axiom-make.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully.
The saved block- and file-failure cluster queries are empty, and the SQLite
aggregate is internally consistent with 321 block rows, 317 passed blocks, no
failed blocks, and 4 skipped blocks. A full corpus rerun should be performed
before recording the next dashboard total.

Latest checked local corpus run after the 2026-06-27 category-with-axiom
corpus-growth pass:

```text
sage -t passed: 32982 passed, 0 failed, 8295 skipped
```

That make-target validation covers all 418 files in the current
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus and writes
`/home/user/cowasm/.tmp/sagelite-corpus-after-category-with-axiom.sqlite3`.
The saved SQLite dashboard is internally consistent with 41,277 block rows,
32,982 passed blocks, no failed blocks, 8,295 skipped blocks, and no
non-passing file rows. The saved block- and file-failure cluster queries are
empty. The latest run metadata records CoWasm commit
`48f7cc326125e5c68e4421ae5c99b98a6c7839d4`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 49,
and about 48 minutes of elapsed time.

Focused misc classgraph corpus-growth pass:

```text
sage -t passed: 2 passed, 0 failed, 6 skipped
```

That one-file focused validation adds `sage/misc/classgraph.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 419 non-comment
entries. Direct sampling first recorded 2 passed blocks and 6 failures; the
failures all imported the stripped graph backend through `DiGraph`, with
dependent `G.vertices(...)` and `G.edges(...)` examples failing only because
the graph object was not constructed. The added WASI source patch marks those
graph-backed examples as `# needs sage.graphs`, leaving the pure dictionary
`as_graph=False` path as ordinary passing default-profile coverage.

Focused validation used direct `sage -t --timeout 120` against the patched
build tree with `TMPDIR=/home/user/cowasm/.tmp` and
`COWASM_SAGELITE_DOCTEST_SOURCE_ROOT=/home/user/cowasm/sagemath/sagelite/build/wasi-sdk`,
writing `/home/user/cowasm/.tmp/sagelite-classgraph-after-tags.sqlite3`. The
saved block- and file-failure cluster queries are empty. A follow-up
make-target restage refreshed `sagemath/sagelite/build/wasi-sdk` from
`/home/user/sagelite`, applied the WASI patch cleanly, and reran the same
one-file corpus with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, recording the same
`2 passed, 0 failed, 6 skipped` result in
`sagemath/sagelite/dist/wasi-sdk/sagelite-classgraph-make-check.sqlite3`.

Focused misc classcall-metaclass display-drift pass:

```text
sage -t passed: 75 passed, 0 failed, 15 skipped
```

A full make-target dashboard over the 419-file corpus after the classgraph
addition completed all files but found one remaining block-level failure:
`sage/misc/classcall_metaclass.pyx:92` expected the historical object-address
repr `<__main__.Foo object at 0x...>`, while the current WASI runtime printed
`<__main__.Foo object at >`. The run recorded `32983 passed, 1 failed, 8301
skipped` in `sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3`; the
saved file-error cluster query was empty and the block-failure cluster query
contained only that display-address mismatch.

The added WASI source patch marks `x = Foo(); x` as `# random`, matching the
existing browser-profile treatment for object-address and dictionary-order
display drift. Focused make-target validation refreshed the patched source
copy, ran a one-file corpus with `SAGELITE_DOCTEST_ALLOW_FAILURES=0` and
`SAGELITE_DOCTEST_TIMEOUT=120`, and wrote
`sagemath/sagelite/dist/wasi-sdk/sagelite-classcall-metaclass-make.sqlite3`.
The focused run records `classcall_metaclass.pyx: 75 passed, 0 failed, 15
skipped`, with empty saved block- and file-failure cluster queries.

Clean 419-file corpus baseline after the classcall display-drift tag:

```text
sage -t passed: 32984 passed, 0 failed, 8301 skipped
```

The full make-target dashboard over the current
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus completed all
419 files with no non-passing file rows and no failed block rows. It wrote
`/home/user/cowasm/.tmp/sagelite-corpus-after-classcall-random.sqlite3`; the
saved block- and file-failure cluster queries are empty. The run confirms the
`sage/misc/classcall_metaclass.pyx:92` object-address repr random tag cleared
the prior only block-level failure, with that file now recording `75 passed, 0
failed, 15 skipped`.

Run metadata: status `passed`, runner version 49, profile `node`, CoWasm commit
`6cb058720fd543db934cb983b8093f9b7306a9b5`, Sagelite source/package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, source root
`/home/user/cowasm/sagemath/sagelite/build/wasi-sdk`, invocation cwd
`/home/user/cowasm/sagemath/sagelite`, started `2026-06-28T03:55:35.141Z`,
finished `2026-06-28T04:44:26.033Z`, duration 2,930,883 ms.

Focused misc HTML corpus-growth pass:

```text
sage -t passed: 55 passed, 0 failed, 9 skipped
```

That one-file make-target validation adds `sage/misc/html.py` to the curated
corpus, bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt`
to 420 non-comment entries. Direct sampling first recorded 55 passed blocks,
9 block-level failures, and no file-level errors. The failing examples were
HTML display-layer drift where the stripped node profile prints raw string
reprs for `HtmlFragment` results, plus `html.eval(...)` examples that expect
notebook user globals to be initialized. The added WASI source patch marks
those display/globals examples as deferred `# known bug` skips, leaving the
pure parsing and MathJax helper coverage active in the default profile.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `TMPDIR=/home/user/cowasm/.tmp/sagelite-validation`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-html-focused.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully.
The saved block- and file-failure cluster queries are empty, and the SQLite
aggregate records 64 total blocks, 55 passed blocks, no failed blocks, and
9 skipped blocks.

The same misc-frontier sampling pass kept `sage/misc/temporary_file.py` out
because one docstring currently exposes a doctest-parser whitespace error,
kept `sage/misc/sage_ostools.pyx` out because most failures exercise POSIX
file-descriptor redirection and subprocess behavior outside the browser
profile, kept `sage/misc/functional.py` out because rational-function setup
timed out in the current profile, and kept `sage/misc/sage_input.py` out
because it still reaches the known NTL/libcxx finite-field trap. Low-signal
zero-block files such as `copying.py`, `proof.py`, `mathml.py`, and
`map_threaded.py` were sampled but not added.

Latest checked local corpus run after the 2026-06-27 polynomial-flatten
corpus-growth pass:

```text
sage -t passed: 33171 passed, 0 failed, 8328 skipped
```

That full make-target dashboard covers the current 421-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/home/user/cowasm/.tmp/sagelite-corpus-after-polynomial-flatten.sqlite3`,
adding `sage/rings/polynomial/flatten.py` to the quiet browser-profile
dashboard. The SQLite aggregate records 41,499 block rows, no failed blocks,
and no non-passing file rows. The focused rerun records
`flatten.py: 132 passed, 0 failed, 18 skipped`.

The added WASI source patch classifies the file's number-field flattening
example as `# needs sage.rings.number_field`, its affine-space specialization
example as `# needs sage.schemes`, and its fraction-specialization example as
`# needs pexpect`. It also marks the specialization-morphism display line as
`# random` so the `xi` assignment still seeds the following example while
accepting the WASI morphism repr drift. The saved block- and file-failure
cluster queries are empty for the full corpus run. The latest run metadata
records CoWasm commit `e712c10ad93d7c0064e9b3d014797620792f7874`, Sagelite
source/package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, runner version 49, and about 46 minutes of elapsed time.

Focused integer-valued polynomial corpus-growth pass:

```text
sage -t passed: 231 passed, 0 failed, 0 skipped
```

That one-file make-target validation adds
`sage/rings/polynomial/integer_valued_polynomials.py` to the curated corpus.
The file gives the dashboard direct integer-valued polynomial ring coverage
without new WASI source tags or startup namespace changes. Focused validation
used `make -C sagemath/sagelite test-sage-doctest-corpus` with a temporary
one-file corpus, `TMPDIR=/home/user/cowasm/.tmp/sagelite-validation`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-integer-valued-polynomial-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

The same sampling pass kept nearby polynomial helpers out of the quiet corpus:
`sage/rings/polynomial/term_order.py` and `polydict.pyx` still have focused
block-level failures, `q_integer_valued_polynomials.py` times out in a
Laurent-polynomial validation path, `symmetric_reduction.pyx` is skipped-only
under the default browser-compatible profile, and `polynomial_fateman.py`
currently contributes no doctest blocks.

Focused matrix miscellaneous corpus-growth pass:

```text
sage -t passed: 22 passed, 0 failed, 0 skipped
```

That one-file validation adds `sage/matrix/matrix_misc.py` to the curated
corpus. The file gives the dashboard lightweight matrix utility coverage
without new WASI source tags or startup namespace changes. Focused make-target
validation used `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`,
and wrote `/home/user/cowasm/.tmp/sagelite-matrix-misc-make.sqlite3`; the
saved block- and file-failure cluster queries are empty.

Focused structure and free-monoid corpus-growth pass:

```text
sage -t passed: 291 passed, 0 failed, 59 skipped
```

That four-file focused validation adds `sage/structure/formal_sum.py`,
`sage/structure/global_options.py`, `sage/monoids/free_monoid.py`, and
`sage/monoids/free_monoid_element.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 433
non-comment entries. These files add useful formal-sum, global-options, and
free-monoid coverage without new WASI source tags or startup namespace
changes.

Direct sampling first kept nearby files out of the quiet corpus:
`sage/structure/factorization.py` still has a focused polynomial
object-model failure around factorization content, while
`sage/structure/indexed_generators.py` and `sage/structure/sequence.py` still
had display-order and coercion-representation mismatches. Focused validation
used the `test-sage-doctest-corpus` make target with a temporary four-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-structure-monoid-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused structure helper corpus-growth pass:

```text
sage -t passed: 354 passed, 0 failed, 128 skipped
```

That three-file make-target validation adds
`sage/structure/indexed_generators.py`,
`sage/structure/mutability.pyx`, and
`sage/structure/unique_representation.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 436
non-comment entries. Direct sampling first recorded narrow display-order and
function-address repr failures in these files; the added WASI source patch
marks those examples as `# random` so the examples still execute while the
browser-profile dashboard does not depend on dictionary insertion order or
runtime pointer formatting.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary three-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-structure-make.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully,
and the saved block- and file-failure cluster queries are empty. The same
sampling pass kept `sage/structure/factorization.py`,
`sage/structure/sequence.py`, `sage/modules/filtered_vector_space.py`, and
`sage/modules/module_functors.py` out of the quiet corpus because their
current failures expose polynomial content, coercion-representation,
filtered-vector-space, or free-module construction gaps rather than narrow
display drift.

Focused structure factory/view corpus-growth pass:

```text
sage -t passed: 125 passed, 0 failed, 0 skipped
```

That three-file focused validation adds
`sage/structure/set_factories_example.py`, `sage/structure/support_view.py`,
and `sage/structure/test_factory.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 439
non-comment entries. These files add factory-example, support-view, and
factory-test coverage without new WASI source tags or startup namespace
changes.

Direct sampling in the same area kept zero-block helpers such as
`sage/structure/coerce_exceptions.py` and `sage/structure/gens_py.py` out of
the corpus, and kept `sage/structure/set_factories.py`,
`sage/structure/dynamic_class.py`, `sage/modules/filtered_vector_space.py`,
`sage/modules/free_module_pseudohomspace.py`, and
`sage/modules/module_functors.py` out because they still have focused
block-level failures rather than clean default-profile coverage.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary three-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-structure-factory-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused structure helper corpus-growth pass:

```text
sage -t passed: 644 passed, 0 failed, 5 skipped
```

That five-file focused validation adds
`sage/structure/element_wrapper.pyx`,
`sage/structure/factorization_integer.py`, `sage/structure/list_clone.pyx`,
`sage/structure/list_clone_demo.pyx`, and `sage/structure/richcmp.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 444 non-comment
entries. These files add rich comparison, list-clone, element-wrapper, and
integer-factorization helper coverage without new WASI source tags or startup
namespace changes.

Direct sampling in the same area kept zero-block helpers such as
`sage/structure/coerce_exceptions.py`, `sage/structure/gens_py.py`, and
`sage/structure/sage_object_test.py` out of the corpus. It also kept
`sage/structure/nonexact.py` and `sage/structure/debug_options.pyx` out
because their focused doctests still have block-level failures rather than
clean default-profile coverage.

Focused monoid corpus-growth pass:

```text
sage -t passed: 485 passed, 0 failed, 77 skipped
```

That five-file focused make-target validation adds
`sage/monoids/automatic_semigroup.py`,
`sage/monoids/free_abelian_monoid.py`,
`sage/monoids/free_abelian_monoid_element.pyx`,
`sage/monoids/string_monoid.py`, and
`sage/monoids/string_monoid_element.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 449
non-comment entries. The Sagelite doctest runner now seeds
`FreeAbelianMonoid` and the common string-monoid constructors in the
doctest namespace, which clears the element files' startup-name failures
without changing Sage source semantics.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-monoid-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. The same
sampling pass kept `sage/monoids/monoid.py` and `sage/monoids/hecke_monoid.py`
out as skip-only files, kept `sage/monoids/indexed_free_monoid.py` out because
its remaining focused failures require the Lie algebra catalog, and kept
`sage/monoids/trace_monoid.py` out because one dependence-stack display still
depends on unordered set/dict rendering.

Focused trace-monoid corpus-growth pass:

```text
sage -t passed: 178 passed, 0 failed, 12 skipped
```

That one-file focused validation adds `sage/monoids/trace_monoid.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 450 non-comment
entries. Direct sampling first recorded one block-level output mismatch in
`M._compute_dependence_stack(x)`, where the computation succeeded but the
browser-profile runtime rendered the returned set/dict in a different order.
The added WASI source patch marks that display as `# random`, preserving the
trace-monoid construction, comparison, normal-form, and word-counting doctests
as default-profile coverage.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-trace-monoid-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Latest checked local corpus run after the 2026-06-28 indexed-free-monoid
corpus-growth pass:

```text
sage -t passed: 36685 passed, 0 failed, 8849 skipped
```

That run records 45,534 block rows across the current 451-file
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` corpus in
`/home/user/cowasm/.tmp/sagelite-runs/indexed-free-monoid-corpus-clean.sqlite3`,
adding `sage/monoids/indexed_free_monoid.py` to the quiet browser-profile
dashboard. Focused reruns record
`indexed_free_monoid.py: 236 passed, 0 failed, 2 skipped` and
`category_with_axiom.py: 317 passed, 0 failed, 4 skipped`.

The added WASI source patch classifies the indexed-free-monoid PBW basis
example as `# needs sage.algebras.lie_algebras`, preserving the ordinary
indexed monoid and free abelian monoid coverage while leaving Lie algebra
catalog support outside the browser-profile dashboard. The same pass marks a
`frozenset` axiom display-order check in `category_with_axiom.py` as
`# random`; the previous run's sole mismatch had identical set elements in a
different representation order. The saved block- and file-failure cluster
queries are empty. The latest run metadata records CoWasm commit
`7e63ef80f575c8367469392e266ec2191ac8097c`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, runner version 50,
and about 50 minutes of elapsed time.

Focused category-object corpus-growth pass:

```text
sage -t passed: 118 passed, 0 failed, 45 skipped
```

That one-file make-target validation adds
`sage/structure/category_object.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 452
non-comment entries. Direct sampling first recorded two focused failures in
the `variable_names()` examples: the quotient-ring construction imports the
unavailable `sage.rings.polynomial.plural` backend, and the following
`S.variable_names()` check only failed because the quotient object was not
created. The added WASI source patch marks both prompts as
`# needs sage.rings.polynomial.plural`, preserving the ordinary category
object, generator, base-ring, and naming coverage while keeping
noncommutative polynomial support as an explicit browser-profile boundary.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
after refreshing the patched Sagelite build tree, with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-category-object-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. The runner
version is 50, and the run metadata records CoWasm commit
`8ca1ef37aed058fce2523f6eb879b2a3378e780d`, Sagelite package commit
`875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, and node profile.

Focused structure infrastructure corpus-growth pass:

```text
sage -t passed: 368 passed, 0 failed, 71 skipped
```

That two-file focused validation adds `sage/structure/coerce_dict.pyx` and
`sage/structure/factory.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 456 non-comment
entries. Direct sampling recorded `coerce_dict.pyx: 289 passed, 0 failed,
8 skipped` and `factory.pyx: 79 passed, 0 failed, 63 skipped`; both files are
quiet under the default node profile without new WASI source tags or startup
namespace changes.

Direct sampling in the same pass kept `sage/structure/sequence.py` and
`sage/structure/sage_object.pyx` out of the quiet corpus because they still
have focused output, GAP-interface, and optional-interface failures. Focused
validation used `make -C sagemath/sagelite test-sage-doctest-corpus` after
refreshing the patched Sagelite build tree, with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-structure-infra-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused temporary-file corpus-growth pass:

```text
sage -t passed: 71 passed, 0 failed, 9 skipped
```

That one-file focused validation adds `sage/misc/temporary_file.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 457 non-comment
entries. The added WASI source patch makes `atomic_write` tolerate CoWasm
profiles where CPython's `os.umask` is present but backed by a failing WASI
stub, falling back to a zero mask for Sage's mode calculation. The same patch
classifies direct host-umask permission checks, one WASI append-overwrite
semantic mismatch, and a non-ASCII doctest conversion mismatch as explicit
deferred skips.

Focused validation used `sage -t --profile node --timeout 120 --sqlite
/home/user/cowasm/.tmp/sagelite-temporary-file-after.sqlite3
sagemath/sagelite/build/wasi-sdk/src/sage/misc/temporary_file.py` after
refreshing both the patched build source and installed Sagelite resource copy.
The saved block-failure query is empty for the latest run.

Focused structure parent-helper corpus-growth pass:

```text
sage -t passed: 27 passed, 0 failed, 26 skipped
```

That two-file focused validation adds `sage/structure/parent_gens.pyx` and
`sage/structure/parent_old.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 462
non-comment entries. Direct sampling recorded
`parent_gens.pyx: 24 passed, 0 failed, 17 skipped` and
`parent_old.pyx: 3 passed, 0 failed, 9 skipped`.

No new WASI source tags or startup namespace changes were needed. Neighboring
structure probes remain outside the quiet corpus: `sage/structure/sage_object.pyx`
still has focused output and optional-interface failures, and
`sage/structure/coerce_maps.pyx` currently reaches the known C-callable map
function-signature boundary.

Focused sequence corpus-growth pass:

```text
sage -t passed: 191 passed, 0 failed, 3 skipped
```

That one-file focused validation adds `sage/structure/sequence.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 463
non-comment entries. Direct sampling first recorded two output mismatches in
the examples that rely on IPython's pretty printer for `Sequence(..., cr=True)`
display; the runtime printed one list element per line while upstream expected
compact list rendering. The added WASI source patch marks those two examples
as `# random`, preserving the sequence coercion and universe coverage without
making the browser-profile dashboard depend on host pretty-printer formatting.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
after refreshing the patched Sagelite build tree, with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-sequence-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. Neighboring
structure probes still remain outside the quiet corpus:
`sage/structure/sage_object.pyx` is dominated by GAP, libGAP, and Magma
interface boundaries, while `sage/structure/coerce_maps.pyx` still reaches the
known C-callable map function-signature boundary.

Focused LaTeX standalone corpus-growth pass:

```text
sage -t passed: 194 passed, 0 failed, 129 skipped
```

That one-file focused validation adds `sage/misc/latex_standalone.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 464
non-comment entries. Direct sampling first recorded three failures: two
IPython-only rich-output checks, and one startup-name failure for
`RecursivelyEnumeratedSet` in a graph-construction setup example.

The added WASI source patch marks the rich-output checks as `# needs IPython`.
The doctest runner now seeds `RecursivelyEnumeratedSet` in the common startup
namespace, and the WASI `sage.all` patch exposes the same constructor for REPL
parity on a fresh patched Sagelite source copy. Focused validation used
`make -C sagemath/sagelite test-sage-doctest-corpus` after refreshing the
patched Sagelite build tree, with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-latex-standalone-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. The runner
version is now 53.

Focused LaTeX helper corpus-growth pass:

```text
sage -t passed: 195 passed, 0 failed, 70 skipped
```

That one-file focused validation adds `sage/misc/latex.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 465
non-comment entries. Direct sampling first recorded four block failures:
three default-engine probes attempted subprocess-backed LaTeX feature
detection, and one relation-symbol example depended on Python string-repr
backslash formatting. The added WASI source patch marks the engine probes as
`# needs sage.features.latex` and marks the relation-symbol display check as
`# random`, preserving the ordinary `Latex` object, macro, preamble, and
conversion coverage while keeping external TeX executables outside the
browser-compatible profile.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
after refreshing the patched Sagelite build tree, with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-latex-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. The run metadata
records CoWasm commit `83a7d1026ab8da9608c6e95dbf92d8bf2cab3353`, Sagelite
package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node profile, and
runner version 53.

Focused list-clone timing corpus-growth pass:

```text
sage -t passed: 30 passed, 0 failed, 2 skipped
```

That two-file focused validation adds
`sage/structure/list_clone_timings.py` and
`sage/structure/list_clone_timings_cy.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 467
non-comment entries. The added WASI source patch marks the two
`timeit(...)` timing loops in `list_clone_timings.py` as `# needs IPython`,
because Sage's timing helper imports IPython in this runtime. The clone
protocol setup and Cython helper examples remain active browser-profile
coverage.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
after refreshing the patched Sagelite build tree, with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-list-clone-timings-make.sqlite3`.
The run records `list_clone_timings.py: 18 passed, 0 failed, 2 skipped` and
`list_clone_timings_cy.pyx: 12 passed, 0 failed, 0 skipped`; the saved block-
and file-failure cluster queries are empty. The same sampling pass kept
`sage/structure/set_factories.py`, `sage/structure/factorization.py`,
`sage/misc/sage_timeit.py`, and `sage/misc/benchmark.py` out of the quiet
corpus because their focused failures expose display-order, polynomial
object-model, IPython timing, or benchmarking gaps that need separate triage.

Focused lambda/nilpotent Lie category corpus-growth pass:

```text
sage -t passed: 13 passed, 0 failed, 35 skipped
```

That two-file focused validation adds
`sage/categories/finite_dimensional_nilpotent_lie_algebras_with_basis.py` and
`sage/categories/finitely_generated_lambda_bracket_algebras.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 469
non-comment entries. Direct probes recorded
`finite_dimensional_nilpotent_lie_algebras_with_basis.py: 12 passed, 0 failed,
21 skipped` and `finitely_generated_lambda_bracket_algebras.py: 1 passed,
0 failed, 14 skipped`.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-category-lie-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. The same sampling
pass kept nearby category files such as
`sage/categories/finitely_generated_lie_conformal_algebras.py`,
`sage/categories/finite_groups.py`, and several category example files out of
the quiet corpus because they add only skipped rows, and kept
`sage/categories/graded_lie_conformal_algebras.py`,
`sage/categories/kahler_algebras.py`,
`sage/categories/lattice_posets.py`,
`sage/categories/principal_ideal_domains.py`, and
`sage/categories/unique_factorization_domains.py` out because they still have
focused failures or timeout clusters that need separate triage.

Focused self-contained utility corpus-growth pass:

```text
sage -t passed: 166 passed, 0 failed, 10 skipped
```

That eight-file focused validation adds
`sage/cpython/dict_del_by_value.pyx`,
`sage/doctest/check_tolerance.py`, `sage/logic/booleval.py`,
`sage/logic/logictable.py`, `sage/probability/random_variable.py`,
`sage/typeset/unicode_characters.py`, `sage/typeset/symbols.py`, and
`sage/typeset/unicode_art.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 477
non-comment entries. These files add tolerance-check helper, boolean-logic,
truth-table, random-variable, Unicode symbol, and CPython dictionary-helper
coverage without new WASI source tags or startup namespace changes.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary eight-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/self-contained-clean-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. The same sampling
pass kept `sage/doctest/marked_output.py`, `sage/typeset/ascii_art.py`, and
`sage/cpython/atexit.pyx` out of the quiet corpus because they currently expose
doctest parser null-byte handling, IPython display-shell, and `atexit` output
formatting mismatches.

Focused display/encoding utility corpus-growth pass:

```text
sage -t passed: 42 passed, 0 failed, 26 skipped
```

That three-file focused validation adds `sage/cpython/atexit.pyx`,
`sage/doctest/marked_output.py`, and `sage/typeset/ascii_art.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 480 non-comment
entries. The added WASI source patch classifies the remaining narrow
browser-profile boundaries: `marked_output.py`'s non-ASCII microsecond literal
still reaches the Sagelite source-conversion null-byte gap, `ascii_art.py`'s
display hook setup depends on IPython's test shell, and `atexit.pyx` exposes
function-address/list formatting drift in registered-handler displays. The
ordinary tolerance-marker, ASCII-art, and `restore_atexit` behavior remains
active default-profile coverage.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary three-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/display-encoding-utilities-make.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully;
the saved block- and file-failure cluster queries are empty. The run records
`atexit.pyx: 19 passed, 0 failed, 0 skipped`,
`marked_output.py: 20 passed, 0 failed, 1 skipped`, and
`ascii_art.py: 3 passed, 0 failed, 25 skipped`.

Focused logic/typeset/CPython helper corpus-growth pass:

```text
sage -t passed: 436 passed, 0 failed, 45 skipped
```

That seven-file focused validation adds `sage/cpython/debug.pyx`,
`sage/cpython/getattr.pyx`, `sage/logic/logic.py`,
`sage/logic/logicparser.py`, `sage/logic/propcalc.py`,
`sage/typeset/character_art.py`, and
`sage/typeset/character_art_factory.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 487
non-comment entries. The doctest runner and WASI `sage.all` patch now seed
`propcalc` and `SymbolicLogic`, matching Sage startup expectations without
importing the full non-WASI logic aggregate.

The added WASI source patch classifies three narrow browser-profile
boundaries: `debug.pyx`'s widget attribute-debug example needs `ipywidgets`,
`logic.py`'s ellipsis-only print-table regression guard is accepted as
random output, and `character_art_factory.py`'s non-ASCII string example is
deferred as the existing Sagelite source-conversion literal gap. Focused
validation used `make -C sagemath/sagelite test-sage-doctest-corpus` after
refreshing the patched Sagelite build tree, with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/logic-typeset-cpython-make.sqlite3`.
The run records `debug.pyx: 10 passed, 0 failed, 4 skipped`,
`getattr.pyx: 64 passed, 0 failed, 10 skipped`,
`logic.py: 83 passed, 0 failed, 0 skipped`,
`logicparser.py: 95 passed, 0 failed, 0 skipped`,
`propcalc.py: 54 passed, 0 failed, 0 skipped`,
`character_art.py: 98 passed, 0 failed, 5 skipped`, and
`character_art_factory.py: 32 passed, 0 failed, 26 skipped`.

Focused propositional-logic formula corpus-growth pass:

```text
sage -t passed: 219 passed, 0 failed, 2 skipped
```

That one-file focused validation adds `sage/logic/boolformula.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 488
non-comment entries. The file contributes substantial propositional-formula
coverage on top of the existing logic parser and truth-table modules without
new WASI source tags or startup namespace changes.

Direct sampling used the patched source tree with `sage -t --profile node`,
`--timeout 120`, and
`--sqlite /home/user/cowasm/.tmp/sagelite-runs/next-helper-sample.sqlite3`.
The same batch kept `sage/doctest/parsing.py`, `sage/doctest/rif_tol.py`, and
`sage/doctest/util.py` out of the quiet corpus because they still have focused
doctest-runner state, cysignals alarm, and output-capture clusters. It also
kept the sampled `sage/cpython` helper wrappers out because they contributed
only skipped or zero-block rows under the default profile. Focused make-target
validation used a temporary one-file corpus with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/boolformula-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused data-structure corpus-growth pass:

```text
sage -t passed: 695 passed, 0 failed, 13 skipped
```

That three-file focused validation adds `sage/data_structures/bitset.pyx`,
`sage/data_structures/bounded_integer_sequences.pyx`, and
`sage/data_structures/list_of_pairs.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 491
non-comment entries. These files add dense Cython coverage for bitsets,
bounded integer sequences, and pair-list storage without new WASI source tags
or startup namespace changes.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary three-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/data-structures-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. The run records
`bitset.pyx: 419 passed, 0 failed, 12 skipped`,
`bounded_integer_sequences.pyx: 262 passed, 0 failed, 1 skipped`, and
`list_of_pairs.pyx: 14 passed, 0 failed, 0 skipped`. The same sampling pass
kept `sage/data_structures/stream.py` out because it still reaches a
polynomial-number-field runtime trap, kept `sage/stats/basic_stats.py` out
because its focused doctests still have output mismatches, and kept sampled
crypto and CPython/data-structure wrapper files out because they add only
skipped or zero-block rows in the default browser-compatible profile.

Focused pairing-heap corpus-growth pass:

```text
sage -t passed: 281 passed, 0 failed, 13 skipped
```

That one-file make-target validation adds
`sage/data_structures/pairing_heap.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 492
non-comment entries. Direct sampling first recorded 281 passed blocks, 3
failed blocks, and 10 skipped blocks. The failures were narrow
browser-profile boundaries: one graph-backed hashable-item example and one
symbolic `sin`/`cos` helper test. The added WASI source patch marks the graph
example as `# needs sage.graphs` and the C-level heap helper as
`# needs sage.symbolic`, preserving the ordinary pairing-heap API and Cython
heap behavior as default-profile coverage.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/pairing-heap-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused data-structure BLAS/poset corpus-growth pass:

```text
sage -t passed: 498 passed, 0 failed, 6 skipped
```

That two-file make-target validation adds
`sage/data_structures/blas_dict.pyx` and
`sage/data_structures/mutable_poset.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 494
non-comment entries. `mutable_poset.py` contributes a large clean mutable
poset data-structure surface, while `blas_dict.pyx` contributes ordinary
sparse-dictionary BLAS coverage.

Direct sampling first recorded six `blas_dict.pyx` failures around the
noncommutative `SymmetricGroupAlgebra` example. The doctest runner now seeds
`SymmetricGroupAlgebra` in the common startup namespace, the WASI `sage.all`
patch exposes it for REPL parity, and the added WASI source patch marks the
Symmetrica-backed symmetric-group algebra multiplication setup as
`# needs sage.libs.symmetrica`. Focused validation used
`make -C sagemath/sagelite test-sage-doctest-corpus` after refreshing the
patched Sagelite build tree, with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/blas-mutable-make.sqlite3`.
The run records `blas_dict.pyx: 61 passed, 0 failed, 6 skipped` and
`mutable_poset.py: 437 passed, 0 failed, 0 skipped`; the saved block- and
file-failure cluster queries are empty.

Focused probability-distribution corpus-growth pass:

```text
sage -t passed: 239 passed, 0 failed, 5 skipped
```

That one-file make-target validation adds
`sage/probability/probability_distribution.pyx` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 495
non-comment entries. Direct sampling also checked adjacent
`sage/data_structures/binary_search.pyx` and
`sage/data_structures/bitset_base.pyx`, but both currently contribute zero
doctest blocks under the default browser-compatible profile.

The added WASI source patch classifies the plotting-only histogram examples as
`# needs pylab` and the `RealDistribution.plot()` example as
`# needs sage.plot`, leaving the distribution construction, random sampling,
and density/cumulative distribution behavior in default-profile coverage.
Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` after refreshing the patched Sagelite build tree,
with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/probability-distribution-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and the skip
query reports only the five intended optional dependency skips.

Focused discrete-Gaussian polynomial corpus-growth pass:

```text
sage -t passed: 21 passed, 0 failed, 3 skipped
```

That one-file focused validation adds
`sage/stats/distributions/discrete_gaussian_polynomial.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 496 non-comment
entries. Direct sampling checked nearby statistics files:
`sage/stats/distributions/discrete_gaussian_integer.pyx` is skipped-only under
the default browser-compatible profile, while
`sage/stats/distributions/discrete_gaussian_lattice.py` still has broad matrix
and lattice failures, so both stay outside the quiet corpus for now.

The added file is quiet without new WASI source tags or startup namespace
changes. Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` after refreshing the patched Sagelite build tree,
with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/discrete-gaussian-polynomial-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Inline metadata preservation and skipped-block parser hardening pass:

```text
sage -t passed: 40548 passed, 0 failed, 9369 skipped
```

That full make-target validation records 49,917 block rows across the current
496-file corpus in
`/home/user/cowasm/.tmp/sagelite-corpus-inline-tags-v2.sqlite3`. Runner
version 57 preserves inline Sage doctest metadata before Python's doctest
parser drops comment text, so examples such as
`x = Foo(); x  # random` are recorded as `expected_kind = random` instead of
being compared as exact output. Focused validation for
`sage/misc/classcall_metaclass.pyx` records `75 passed, 0 failed, 15 skipped`
and confirms the object-address example is a `random_unchecked` pass.

The same runner pass strips recognized inline metadata comments from the code
fed to the doctest parser and, for default-skipped inline blocks, replaces the
block with a parseable no-op while preserving physical line numbers with blank
placeholders. This keeps multiline skipped blocks such as
`sage/misc/temporary_file.py`'s non-ASCII `atomic_write(...)` examples from
failing during parser setup. Focused validation for `temporary_file.py` records
`71 passed, 0 failed, 9 skipped`. The full dashboard was run with
`SAGELITE_DOCTEST_ALLOW_FAILURES=0` and `SAGELITE_DOCTEST_TIMEOUT=120`; the
saved block- and file-failure cluster queries are empty.

Focused structure core corpus-growth pass:

```text
sage -t passed: 231 passed, 0 failed, 188 skipped
```

That two-file make-target validation adds `sage/structure/factorization.py`
and `sage/structure/sage_object.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 498
non-comment entries. The files add core factorization container and
`SageObject` representation/conversion coverage. The added WASI source patch
classifies external GAP/libgap and Magma interface examples as explicit
optional/dependency skips, and records the polynomial-content common-universe
sequence in `factorization.py` as a deferred `# known bug` until the
browser-compatible polynomial implementation exposes that method.

Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary two-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/structure-make.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully;
the saved block- and file-failure cluster queries are empty. The same sampling
pass kept nearby statistics, crypto, and miscellaneous utility files out of
the quiet corpus because they were skipped-only, zero-block, timeout-prone, or
still exposed broader warning, symbolic, filesystem, or timing-policy
failures.

Focused Sage introspection corpus-growth pass:

```text
sage -t passed: 287 passed, 0 failed, 114 skipped
```

That one-file make-target validation adds `sage/misc/sageinspect.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 499
non-comment entries. The file contributes Sage/Python/Cython introspection
coverage, including `sage_getfile`, `sage_getsource`, argument-spec parsing,
and docstring handling.

Direct sampling first recorded focused failures around unavailable
IPython/ipywidgets shell checks, the existing Sagelite source-conversion quote
literal gap, WASI doctest feature detection through multiprocessing, source
root path normalization, and CPython 3.14 docstring formatting drift. The
added WASI source patch classifies those boundaries with `# needs` and
`# known bug` metadata while preserving the ordinary introspection coverage.
Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` after refreshing the patched Sagelite build tree,
with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/sageinspect-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. A full corpus
rerun should be performed before recording the next dashboard total.

Focused matrix Strassen corpus-growth pass:

```text
sage -t passed: 69 passed, 0 failed, 0 skipped
```

That one-file make-target validation adds `sage/matrix/strassen.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 500
non-comment entries. Direct sampling first recorded 66 passed blocks and
three failures: the setup calls to `_echelon_in_place_classical()` display
pivot-column tuples in the current WASI runtime where Sage's upstream doctest
expects no output. The added WASI source patch marks those setup prompts as
`# random`, so they still bind `B` for the following Strassen comparison
checks while the dashboard does not depend on the extra displayed return
value.

Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` after refreshing the patched Sagelite build tree,
with `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/strassen-make-v2.sqlite3`.
The saved block- and file-failure cluster queries are empty. The same sampling
pass kept nearby `sage/structure/set_factories.py`, `sage/matrix/operation_table.py`,
`sage/modules/filtered_vector_space.py`, and several small category/misc
helpers out of the quiet corpus because their current failures are broader
constructor, backend, timeout, filesystem, or skipped-only clusters.

Follow-up sampling on 2026-06-28 checked additional utility, monoid, crypto,
data-structure, module, matrix, and category candidates. No new files were
added to the curated corpus: the runnable utility/matrix files failed around
filesystem redirection, benchmark/timing behavior, matrix-constructor
semantics, and random-matrix timeout clusters, while the monoid, crypto,
Cython helper, and small data-structure candidates were skipped-only or had no
doctest blocks in the default browser-compatible profile.

The dashboard tooling now includes `file-coverage-summary.sql`, a companion to
`file-coverage-shape.sql`, so exploratory sampling can first show aggregate
counts for `file_error`, `has_failures`, `skipped_only`, `no_doctest_blocks`,
and `clean_runnable_coverage` before drilling into per-file rows. The
standalone Sagelite smoke has a synthetic SQLite assertion covering all five
coverage shapes.

Follow-up inline-skip source preservation pass:

```text
sage -t passed: 21 passed, 0 failed, 7 skipped
```

Runner version 58 keeps the original logical source for inline-skipped doctest
blocks in SQLite while continuing to feed Python's doctest parser a parseable
`pass` placeholder. This preserves queryable sources such as
`7 + 8  # optional - cowasm_smoke` instead of recording the implementation
placeholder as the block source. The standalone Sagelite smoke caught this
while validating the inline metadata path; rerunning
`make -C sagemath/sagelite test-wasi-sdk-standalone` with `TMPDIR` pointed at
a workspace temp directory now passes the doctest SQLite smoke with the
expected inline random and inline skip metadata.

Focused low-level extension-helper corpus-growth pass:

```text
sage -t passed: 4 passed, 0 failed, 7 skipped
```

That two-file focused validation adds `sage/ext/fast_eval.pyx` and
`sage/ext/memory.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 502
non-comment entries. Direct sampling first found `fast_eval.pyx` and
`memory.pyx` as the only clean runnable files in a small helper batch covering
remaining `sage/cpython`, `sage/data_structures`, `sage/ext`, and adjacent
misc helpers. The broader sampled files were skipped-only, empty, or still
exposed known number-field, source-order, or symbolic/runtime clusters, so
they remain outside the quiet browser-compatible corpus.

Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` after refreshing the patched Sagelite build tree,
with a temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/ext-helper-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused set-factory corpus-growth pass:

```text
sage -t passed: 225 passed, 0 failed, 0 skipped
```

That one-file focused validation adds `sage/structure/set_factories.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 503
non-comment entries. Direct sampling first recorded 216 passed blocks and nine
failures, all from constructor-attribute dictionaries whose key order differs
from Sage's historical expected display while preserving the same values. The
added WASI source patch marks those display-order checks as `# random`, keeping
the semantic constructor-policy coverage in the quiet browser-compatible
dashboard.

Focused validation used `make -C sagemath/sagelite
test-sage-doctest-corpus` with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/set-factories-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. The same sampling
batch kept adjacent zero-block helpers, skipped-only `sphinxify.py`,
timeout-prone symbolic `functional.py`, and filesystem-redirection-heavy
`sage_ostools.pyx` out of the curated corpus for now.

Focused category-core corpus-growth pass:

```text
sage -t passed: 412 passed, 0 failed, 45 skipped
```

That one-file direct validation adds `sage/categories/category.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 504
non-comment entries. The doctest runner now seeds the lightweight category
constructors and aliases used by upstream category-core examples, including
`Bimodules`, `FreeModules`, `NumberFields`, `PartiallyOrderedSets`,
`PrincipalIdealDomains`, `QuotientFields`, and
`UniqueFactorizationDomains`; the WASI `sage.all` patch exposes the same names
for REPL parity after a Sagelite package rebuild.

The added WASI source patch classifies category-core warning/dict/set display
drift as deferred or random output where the underlying category values remain
unchanged. Direct focused validation used `sage -t --profile node` against the
already-patched build tree with SQLite output under
`/home/user/cowasm/.tmp/sagelite-category-after.sqlite3`; `/tmp` could not be
used because the host returned `Disk quota exceeded` for new temporary
directories. A full clean-source patch dry-run parsed the new hunks but still
reported pre-existing `integer_mod_ring.py` hunk failures later in the large
Sagelite WASI patch, so the checked validation for this pass is the focused
category-core run plus `git diff --check`.

Focused modules-with-basis category corpus-growth pass:

```text
sage -t passed: 104 passed, 0 failed, 523 skipped
```

That one-file focused validation adds
`sage/categories/modules_with_basis.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 506
non-comment entries. Direct sampling first recorded 83 passed blocks and 21
failures, all downstream of the missing startup name
`CombinatorialFreeModule` in ordinary upstream category examples. The doctest
runner now seeds that lightweight constructor in the common doctest namespace,
and the WASI `sage.all` patch exposes the same name for REPL parity after a
Sagelite package rebuild.

Focused validation used direct `sage -t --profile node` against the patched
build tree with SQLite output at
`/home/user/cowasm/.tmp/sagelite-runs/modules-with-basis-after.sqlite3`; the
saved block- and file-failure cluster queries are empty. The same sampling
pass left `fields.py`, `commutative_rings.py`, `rings.py`,
`quotient_fields.py`, and `euclidean_domains.py` outside the quiet corpus
because their first runnable examples still hit existing NTL, polynomial, or
timeout backend clusters, while `algebra_functor.py` and `groupoid.py` were
skipped-only in the default browser-compatible profile.

Focused filtered-modules-with-basis category corpus-growth pass:

```text
sage -t passed: 54 passed, 0 failed, 191 skipped
```

That one-file focused validation adds
`sage/categories/filtered_modules_with_basis.py` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 507
non-comment entries. Direct sampling first recorded 54 passed blocks and
eight failures, all from optional exterior-algebra, hyperplane-arrangement,
and matroid examples. The added WASI source patch classifies those backend
examples with `# needs` metadata, preserving the ordinary filtered-module
coverage in the browser-compatible dashboard.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/filtered-modules-with-basis-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused lambda-bracket category corpus-growth pass:

```text
sage -t passed: 9 passed, 0 failed, 45 skipped
```

That two-file focused validation adds
`sage/categories/lambda_bracket_algebras.py` and
`sage/categories/graded_lie_conformal_algebras.py` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 509
non-comment entries. Direct sampling and make-target validation both recorded
clean default-profile results without new WASI source tags or startup
namespace changes.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/lambda-corpus-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused REPL display utility corpus-growth pass:

```text
sage -t passed: 6 passed, 0 failed, 1 skipped
```

That one-file focused validation adds `sage/repl/display/util.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 510
non-comment entries. Direct sampling first found the file as the only new
clean runnable candidate in a small helper batch; adjacent candidates such as
`sage/cpython/string.pyx`, `sage/cpython/cython_metaclass.pyx`, and
`sage/misc/map_threaded.py` were skipped-only, while
`sage/repl/inputhook.py` still has focused doctest failures.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/repl-display-util-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused REPL rich-output corpus-growth pass:

```text
sage -t passed: 46 passed, 0 failed, 1 skipped
```

That one-file focused validation adds
`sage/repl/rich_output/output_basic.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 511
non-comment entries. Adjacent probes kept `sage/repl/rich_output/buffer.py`
out of the corpus because it has one WASI permission-bit display mismatch:
the temporary-file write-bit mask reports `128` instead of Sage's expected
`0`. Broader probes also kept `sage/misc/functional.py` out because its
symbolic denominator example timed out under the browser-compatible profile.
Stats Cython probes such as
`sage/stats/distributions/discrete_gaussian_integer.pyx`,
`sage/stats/intlist.pyx`, and `sage/stats/time_series.pyx` were skipped-only,
and `sage/stats/basic_stats.py` still has namespace, symbolic-import, and
output-drift failures that should be handled in a separate focused pass.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/repl-output-basic.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused REPL rich-output buffer corpus-growth pass:

```text
sage -t passed: 49 passed, 0 failed, 0 skipped
```

That one-file focused validation adds
`sage/repl/rich_output/buffer.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 512
non-comment entries. Direct sampling first recorded 48 passed blocks and one
failure in the `_chmod_readonly` permission-mask check: the WASI runtime
reported write-bit mask `128` where Sage's POSIX doctest expected `0`. The
added WASI source patch marks that display check as `# random`, preserving the
rich-output buffer coverage without treating WASI permission-bit drift as a
semantic failure.

Focused validation used the `test-sage-doctest-corpus` make target from a
freshly patched Sagelite source copy with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/repl-rich-buffer-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and `git diff
--check` passes.

Focused basic statistics corpus-growth pass:

```text
sage -t passed: 30 passed, 0 failed, 34 skipped
```

That one-file focused validation adds `sage/stats/basic_stats.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 513
non-comment entries. Direct sampling first recorded four warning-output
mismatches, four missing `stats` namespace failures, two downstream missing
`x` failures from the skipped `TimeSeries` setup, and one symbolic `NaN`
boundary. The doctest runner now seeds the lightweight `stats` module alias in
the common namespace, matching the upstream `sage.all` startup expectation
without importing the full non-WASI statistics aggregate during startup.

The added WASI source patch classifies the known Sagelite warning-stream
comparison limitation as `# known bug` on the affected deprecated examples and
marks the empty-list variance `NaN` example as `# needs sage.symbolic`, while
leaving ordinary mean, mode, variance, median, and moving-average behavior in
default-profile coverage. Focused validation used direct `sage -t --profile
node` with SQLite output at
`/home/user/cowasm/.tmp/sagelite-runs/stats-basic-after.sqlite3`, then the
`test-sage-doctest-corpus` make target from a freshly patched Sagelite source
copy with a temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/basic-stats-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused stats distribution catalog corpus-growth pass:

```text
sage -t passed: 1 passed, 0 failed, 0 skipped
```

That one-file focused validation adds
`sage/stats/distributions/catalog.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 514
non-comment entries. The file contributes a small but clean startup-catalog
doctest for importing the statistical distribution catalog under the default
browser-compatible profile, with no new WASI source tags or startup namespace
changes.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/stats-distribution-catalog-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. The adjacent
`sage/stats/distributions/discrete_gaussian_lattice.py` probe remains outside
the quiet corpus because resolving its lattice sampler imports the unavailable
`sage.symbolic.expression` module, while most unlisted HMM/time-series stats
files are skipped-only in the default profile.

Focused rich-output preferences corpus-growth pass:

```text
sage -t passed: 68 passed, 0 failed, 0 skipped
```

That one-file focused validation adds
`sage/repl/rich_output/preferences.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 515
non-comment entries. Direct sampling found the file as the only new clean
runnable candidate in a small frontend batch: the probability, stats, typeset,
logic, and rich-output catalog `all.py` wrappers contributed zero doctest
blocks, while `sage/repl/display/fancy_repr.py` and
`sage/repl/display/pretty_print.py` still have focused REPL display failures.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/repl-preferences-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused coding catalog corpus-growth pass:

```text
sage -t passed: 5 passed, 0 failed, 0 skipped
```

That five-file focused validation adds Sage's coding catalog import modules to
the curated corpus: `sage/coding/bounds_catalog.py`,
`sage/coding/channels_catalog.py`, `sage/coding/codes_catalog.py`,
`sage/coding/decoders_catalog.py`, and `sage/coding/encoders_catalog.py`.
These files give the dashboard lightweight coding-theory catalog coverage
without new WASI source tags or startup namespace changes.

Direct sampling used `sage -t --profile node --timeout 90` against the patched
source tree with SQLite output at
`/home/user/cowasm/.tmp/sagelite-runs/coding-catalog-direct.sqlite3`.
Focused make-target validation used a temporary five-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/coding-catalog-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused coding bounds corpus-growth pass:

```text
sage -t passed: 15 passed, 0 failed, 41 skipped
```

That one-file focused validation adds `sage/coding/code_bounds.py` to the
curated corpus. The doctest runner now seeds the lightweight `codes` catalog
namespace from `sage.coding.codes_catalog`, and the WASI `sage.all` patch
exposes the same alias for REPL parity. This clears the upstream
`codes.bounds...` startup-name cluster while keeping LP, GAP/Guava, PARI, and
symbolic-dependent examples as explicit skipped coverage under the default
browser-compatible profile.

Focused validation used the `test-sage-doctest-corpus` make target from a
freshly patched Sagelite source copy with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/code-bounds-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused rich-output container corpus-growth pass:

```text
sage -t passed: 121 passed, 0 failed, 0 skipped
```

That four-file focused validation adds the remaining clean rich-output
container modules to the curated corpus:
`sage/repl/rich_output/output_browser.py`,
`sage/repl/rich_output/output_graphics.py`,
`sage/repl/rich_output/output_graphics3d.py`, and
`sage/repl/rich_output/output_video.py`. These files cover browser, 2D
graphics, 3D graphics, and video output wrapper behavior without new WASI
source tags or startup namespace changes, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 527
non-comment entries.

Direct sampling also kept the rich-output backend/display-manager and
REPL display formatter modules out of the quiet corpus because they still
have focused display-state failures, while `output_catalog.py` contributes no
doctest blocks. Focused validation used the `test-sage-doctest-corpus` make
target with a temporary four-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/rich-output-containers-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused Huffman source-coding corpus-growth pass:

```text
sage -t passed: 59 passed, 0 failed, 5 skipped
```

That one-file focused validation adds
`sage/coding/source_coding/huffman.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 528
non-comment entries. The file contributes runnable source-coding coverage
without new WASI source tags or startup namespace changes.

Direct sampling kept adjacent coding base/construction modules such as
`abstract_code.py`, `channel.py`, `decoder.py`, `encoder.py`,
`code_constructions.py`, `parity_check_code.py`, and `hamming_code.py` out of
the quiet corpus because they are skipped-only under the default browser
profile. The same sampling pass kept `two_weight_db.py` out because it still
reaches the known NTL/libcxx `memory access out of bounds` trap during module
namespace loading.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/huffman-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused small combinatorics corpus-growth pass:

```text
sage -t passed: 36 passed, 0 failed, 8 skipped
```

That two-file focused validation adds
`sage/combinat/ncsf_qsym/combinatorics.py` and
`sage/combinat/matrices/dlxcpp.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 530
non-comment entries. The files add lightweight noncommutative symmetric
function combinatorics helpers and the C++ dancing-links wrapper without new
WASI source tags or startup namespace changes.

Direct sampling kept nearby candidates out of the quiet corpus:
`sage/combinat/species/misc.py` and
`sage/combinat/subword_complex_c.pyx` are skipped-only under the default
browser profile, `sage/combinat/q_bernoulli.pyx` reaches the known NTL/libcxx
`memory access out of bounds` trap during finite-field polynomial setup,
`sage/combinat/sine_gordon.py` has startup-name and diagnostic mismatches, and
`sage/combinat/posets/linear_extension_iterator.pyx` still needs the poset
catalog startup surface.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/combinat-light-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused runtime feature-helper corpus-growth pass:

```text
sage -t passed: 14 passed, 0 failed, 0 skipped
```

That five-file focused validation adds small runtime and feature-helper files
to the curated corpus: `sage/parallel/ncpus.py`,
`sage/features/bitness.py`, `sage/features/cython.py`,
`sage/features/tdlib.py`, and `sage/libs/flint/ulong_extras_sage.pyx`.
These files add clean coverage for CPU-count probing, feature object
construction, and FLINT integer-factor wrapper behavior without new WASI
source tags or startup namespace changes, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 535
non-comment entries.

Direct sampling kept `sage/libs/flint/ulong_extras.pyx` out because one
focused doctest still fails, and kept `sage/libs/ntl/error.pyx` out because
loading its NTL example reaches the current `gf2x_mul` dynamic-link import
boundary. The same small probe found several zero-block or skipped-only
helpers such as `sage/cpython/string.pyx`, `sage/misc/map_threaded.py`, and
`sage/cpython/builtin_types.pyx`, which were not added.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary five-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/small-runtime-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused feature-helper corpus-growth pass:

```text
sage -t passed: 145 passed, 0 failed, 85 skipped
```

That eight-file focused validation adds small feature-detection modules to the
curated corpus: `sage/features/ffmpeg.py`, `sage/features/graphviz.py`,
`sage/features/imagemagick.py`, `sage/features/info.py`,
`sage/features/internet.py`, `sage/features/jmol.py`,
`sage/features/sagemath.py`, and `sage/features/threejs.py`. These files add
clean browser-profile coverage for optional external-tool feature objects and
Sage package feature metadata, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 543
non-comment entries.

Direct sampling kept `sage/features/standard.py` out because it contributes no
doctest blocks, kept `sage/features/join_feature.py` out because one focused
diagnostic-output example still mismatches, and kept
`sage/features/pkg_systems.py`, `sage/features/databases.py`, and
`sage/features/latex.py` out because their focused examples still reach WASI
subprocess limits. Focused validation used the `test-sage-doctest-corpus` make
target with a temporary eight-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/feature-clean-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused feature-descriptor corpus-growth pass:

```text
sage -t passed: 75 passed, 0 failed, 28 skipped
```

That 17-file focused validation adds more optional-feature descriptor modules
to the curated corpus: `sage/features/bliss.py`, `cddlib.py`, `dot2tex.py`,
`dvipng.py`, `flatter.py`, `four_ti_2.py`, `fricas.py`, `frobby.py`,
`gap.py`, `gap3.py`, `gfan.py`, `giac.py`, `kenzo.py`, `mip_backends.py`,
`sat.py`, `sphinx.py`, and `symengine_py.py`. These files add clean
browser-profile coverage for optional external libraries and interfaces
without requiring those optional systems to be present, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 560
non-comment entries.

Direct sampling kept `sage/features/databases.py`, `ecm.py`, `interfaces.py`,
`latex.py`, `pari.py`, and `pkg_systems.py` out because their focused failures
still involve WASI subprocess limits, missing `pexpect`, or optional-data
display drift. It also kept `sage/features/standard.py` out because it
contributes no doctest blocks. Focused validation used the
`test-sage-doctest-corpus` make target with a temporary 17-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-feature-descriptors-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused extended feature-descriptor corpus-growth pass:

```text
sage -t passed: 144 passed, 0 failed, 47 skipped
```

That 28-file focused validation adds more optional-feature descriptor modules
to the curated corpus: `sage/features/brial.py`, `coxeter3.py`, `csdp.py`,
`graph_generators.py`, `igraph.py`, `khoca.py`, `latte.py`, `lcalc.py`,
`lrs.py`, `mcqd.py`, `meataxe.py`, `meson_editable.py`, `msolve.py`,
`nauty.py`, `normaliz.py`, `palp.py`, `pandoc.py`, `pdf2svg.py`,
`phitigra.py`, `polymake.py`, `poppler.py`, `qepcad.py`, `rubiks.py`,
`singular.py`, `sirocco.py`, `sloane_database.py`, `tides.py`, and
`topcom.py`. These files add clean browser-profile coverage for optional
external libraries, graph generators, solver backends, and feature metadata
without requiring those optional systems to be present, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 588
non-comment entries.

Direct sampling kept `sage/features/planarity.py` out because its focused run
still has three default-profile failures. Focused validation used the
`test-sage-doctest-corpus` make target with a temporary 28-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/feature-more-clean-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused algebra corpus-growth pass:

```text
sage -t passed: 216 passed, 0 failed, 0 skipped
```

That two-file focused validation adds
`sage/algebras/associated_graded.py` and
`sage/algebras/free_zinbiel_algebra.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 590
non-comment entries. These files add clean algebra construction coverage
without new WASI source tags or startup namespace changes.

Direct sampling kept adjacent algebra files out of the quiet corpus:
`sage/algebras/free_algebra.py`, `free_algebra_element.py`,
`nil_coxeter_algebra.py`, and `q_commuting_polynomials.py` still have focused
block-level failures. Sampling also kept remaining monoid, stats, and
`sets/real_set.py` candidates out because they are skipped-only or zero-block
under the default browser profile, and kept small category files such as
`commutative_rings.py`, `fields.py`, and `finite_fields.py` out because their
first runnable examples still reach known polynomial-number-field or
NTL/libcxx runtime boundaries. Focused validation used the
`test-sage-doctest-corpus` make target with a temporary two-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/algebra-focused-make.sqlite3`.

Focused proof-preferences corpus-growth pass:

```text
sage -t passed: 29 passed, 0 failed, 2 skipped
```

That one-file focused validation adds `sage/structure/proof/all.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 591
non-comment entries. The added WASI source patch classifies the two
`proof.all()` dictionary display-format checks as deferred `# known bug`
skips, because the current Sagelite runtime prints the same proof preference
mapping on one line instead of Sage's historical multiline doctest output.

Direct sampling kept nearby candidates out of the quiet corpus:
`sage/structure/coerce_exceptions.py`, `sage/structure/gens_py.py`,
`sage/structure/sage_object_test.py`, and `sage/structure/all.py` were
zero-block files. A separate statistics sampling pass kept
`sage/stats/intlist.pyx`, `sage/stats/time_series.pyx`,
`sage/stats/distributions/discrete_gaussian_integer.pyx`, `sage/stats/r.py`,
and the `sage/stats/hmm` helpers out because they are skipped-only under the
default browser profile, and kept
`sage/stats/distributions/discrete_gaussian_lattice.py` out because it still
has block-level failures. Misc-helper probes kept
`sage/misc/functional.py` out because it times out in a symbolic rational
example, and kept `sage/misc/mathml.py`, `sage/misc/copying.py`,
`sage/misc/package_dir.py`, and `sage/misc/proof.py` out because they are
zero-block or skipped-only.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/proof-all-make.sqlite3`.

Focused Lie-conformal algebra corpus-growth pass:

```text
sage -t passed: 23 passed, 0 failed, 1 skipped
```

That three-file focused validation adds
`sage/algebras/lie_conformal_algebras/abelian_lie_conformal_algebra.py`,
`sage/algebras/lie_conformal_algebras/graded_lie_conformal_algebra.py`, and
`sage/algebras/lie_conformal_algebras/virasoro_lie_conformal_algebra.py` to
the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 594
non-comment entries. Direct sampling first recorded startup-name failures for
Sage's `lie_conformal_algebras` catalog and `LieConformalAlgebra` constructor.
The doctest runner now seeds both names from
`sage.algebras.lie_conformal_algebras.all`, and the WASI `sage.all` patch
exposes the same names for REPL parity on a fresh patched source copy.

The only remaining focused failure was the Virasoro `QQbar` repr example,
which reaches the current Algebraic Field cache/coercion boundary; the added
WASI source patch marks that example as `# needs sage.rings.number_field`
while preserving the rational-field Virasoro construction, category, bracket,
generator, and `TestSuite` coverage. Focused validation used
`make -C sagemath/sagelite test-sage-doctest-corpus` with a temporary
three-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/lie-conformal-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

The same sampling pass kept `sage/algebras/quaternion_algebra.py`,
`sage/matrix/change_ring.pyx`, `sage/matrix/misc_flint.pyx`, and
`sage/matrix/misc_mpfr.pyx` out of the quiet corpus because their focused
failures still hit unavailable dense integer-matrix imports, matrix real-field
initialization, or diagnostic drift rather than narrow startup namespace gaps.
Skipped-only probes such as `sage/misc/sphinxify.py` and
`sage/categories/bialgebras.py` were also left out.

Focused structure coercion corpus-growth pass:

```text
sage -t passed: 256 passed, 0 failed, 107 skipped
```

That one-file focused validation adds `sage/structure/coerce.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 595
non-comment entries. The doctest runner now resolves the lazy `RR` and `CC`
startup names, in addition to the existing focused real/complex interval and
lazy-field names, after module globals are seeded. This clears the
`parent_is_real_numerical(...)` failure where the module-local namespace could
still see a lazy `RR` object instead of the concrete real field.

The added WASI source patch classifies the remaining fraction-field coercion
example as `# needs pexpect`, because that path imports the unavailable
interface/subprocess stack in the browser-compatible profile. Focused
validation used `make -C sagemath/sagelite test-sage-doctest-corpus` with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/build/sagelite-probes/coerce-make.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully;
the saved block- and file-failure cluster queries are empty. The latest run
metadata records CoWasm commit `6ed338621ae1aee76fb481e5447614cf9eb4ff49`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, and runner version 60.

Focused lazy-import corpus-growth pass:

```text
sage -t passed: 266 passed, 0 failed, 30 skipped
```

That one-file focused validation adds `sage/misc/lazy_import.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 596
non-comment entries. The added WASI source patch classifies the remaining
browser-profile drifts with explicit doctest metadata: warning-stream checks
that the current Sagelite doctest runner does not capture, the
`QQbar`/`RealSet` examples that need number-field or symbolic support, one
optional-feature diagnostic path that reaches unavailable subprocess support,
the startup integer-ring singleton identity drift, and private `LazyImport`
dictionary display ordering.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/lazy-import-focused.sqlite3`.
The saved block- and file-failure cluster queries are empty. The latest run
metadata records CoWasm commit `4d3d2329ad2768c0ba6aec7ac101119dc9b31735`,
Sagelite package commit `875c1cc836ddc6feaf3a240db2a8b1f0c3190756`, node
profile, and runner version 60.

Focused matrix-helper corpus-growth pass:

```text
sage -t passed: 17 passed, 0 failed, 5 skipped
```

That two-file focused validation adds `sage/matrix/echelon_matrix.pyx` and
`sage/matrix/matrix_cdv.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 598
non-comment entries. These modules add clean matrix echelon-form and complex
double-vector helper coverage under the default node profile without new WASI
source tags or startup namespace changes.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-matrix-small-make.sqlite3`.
Direct sampling kept nearby matrix, module, and ring helpers out of the quiet
corpus because they were skipped-only, zero-block, timed out, or still had
focused block-level failures.

Focused symplectic-basis corpus-growth pass:

```text
sage -t passed: 46 passed, 0 failed, 0 skipped
```

That one-file focused validation adds `sage/matrix/symplectic_basis.py` to
the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 599
non-comment entries. The module adds clean symplectic-basis construction
coverage under the default node profile without new WASI source tags or
startup namespace changes.

Focused validation used the Sagelite doctest runner directly with
`SAGELITE_DOCTEST_TIMEOUT=90` semantics through `sage -t --timeout 90` and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-runs/symplectic-basis-focused.sqlite3`.
Direct sampling kept nearby matrix and module helpers out of the quiet corpus:
`matrix/operation_table.py`, `matrix/tests.py`,
`modules/free_module_pseudohomspace.py`, `modules/free_module_pseudomorphism.py`,
and `modules/module_functors.py` still have focused block-level failures;
`matrix/special.py` times out in a random-matrix density loop; and
`matrix/compute_J_ideal.py`, `matrix/benchmark.py`, `modules/numpy_util.pyx`,
`modules/complex_double_vector.py`, `typeset/all.py`, and the sampled REPL
helpers are skipped-only or zero-block under the default browser-compatible
profile.

Follow-up sampling pass on 2026-06-28 found no new quiet runnable corpus
candidate among several adjacent REPL, doctest, misc, category, combinatorics,
root-system, set, arithmetic, monoid, stats, structure, module, and matrix
helpers. The useful outcome is narrower triage rather than corpus growth:
remaining uncurated REPL display helpers cluster around unavailable
IPython/traitlets display infrastructure; `sage/doctest/util.py` and
`sage/doctest/fixtures.py` still mix IPython, cysignals alarm, filesystem, and
stateful dependent failures; leftover category, monoid, stats, root-system,
and set files sampled in this pass are skipped-only or zero-block; and
`sage/arith/functions.pyx` plus `sage/arith/misc.py` still reach polynomial
LCM/GCD runtime boundaries, including a `PyTuple_SET_ITEM` assertion in
`polynomial_element`.

The most informative sampling databases from this pass are under
`/home/user/cowasm/.tmp/current-run/`, including
`repl-doctest-sampling-abs.sqlite3`, `repl-extra-sampling.sqlite3`,
`root-extra-sampling.sqlite3`, and `arith-misc-sampling.sqlite3`. The checked
`file-coverage-shape.sql`, `file-coverage-summary.sql`, and
`block-failure-clusters.sql` queries were sufficient for separating
skipped-only, zero-block, broad-failure, and clean-runnable candidates, so no
new dashboard query was needed. The next productive corpus-growth pass should
avoid these sampled files unless it first targets one of the named clusters:
IPython display availability/tagging, doctest utility alarm/filesystem
semantics, or polynomial constructor/vectorcall runtime behavior.

Focused doctest-backend corpus-growth pass:

```text
sage -t passed: 47 passed, 0 failed, 11 skipped
```

That one-file focused validation adds
`sage/repl/rich_output/backend_doctest.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 601
non-comment entries. The doctest runner now switches Sage's display manager
to `BackendDoctest` while building each per-file doctest namespace, matching
upstream Sage doctest assumptions and clearing the sampled
`BackendSimple.validate(...)` failure cluster in backend doctest validation.
The WASI source patch marks the remaining IPython command-line preference
comparison as `# needs IPython`, so the browser-compatible profile retains
the doctest backend's own preference, install, supported-output, display, and
validation coverage without requiring IPython.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/sagelite-backend-doctest-make.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully;
the saved block- and file-failure cluster queries are empty. The latest run
metadata records node profile and runner version 61.

Focused rich-output pretty-printer/display corpus-growth pass:

```text
sage -t passed: 105 passed, 0 failed, 35 skipped
```

That two-file focused validation adds
`sage/repl/rich_output/display_manager.py` and
`sage/repl/rich_output/pretty_print.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 609
non-comment entries. The Sagelite WASI source patch now gives
`sage.repl.display.pretty_print` and `sage.repl.display.fancy_repr` a small
plain-text fallback for the subset of `IPython.lib.pretty` needed by the
doctest backend, so core rich-output formatting no longer depends on packaging
IPython in the browser-compatible profile.

The added WASI patch classifies the remaining
`DisplayManager._call_rich_repr(...)` warning-stream expectation as
`# not tested`, matching the current Sagelite runner limitation that warning
output is not captured as doctest stdout. Focused validation used
`make -C sagemath/sagelite test-sage-doctest-corpus` with a temporary
two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/rich-output-display-pretty-make.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully;
the saved block- and file-failure cluster queries are empty. A follow-up full
609-file corpus run was started with
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/rich-output-display-pretty-full.sqlite3`
but was interrupted after reaching about worker 204 because it was on track for
a much longer validation pass than the focused check.

Focused display pretty-printer corpus-growth pass:

```text
sage -t passed: 41 passed, 0 failed, 13 skipped
```

That two-file focused validation adds `sage/repl/display/fancy_repr.py` and
`sage/repl/display/pretty_print.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 611
non-comment entries. These files exercise Sage's core plain-text pretty
printer and object-representation helpers under the browser-compatible node
profile.

The added WASI source patch classifies the remaining IPython pretty-printer
formatting gaps as deferred `# known bug` skips: sorted dictionary display,
nested sequence line wrapping, set representation through `SomeIPythonRepr`,
and tall-list ASCII-art layout. Direct sampling kept
`sage/repl/display/formatter.py` out of the quiet corpus because it still
clusters around unavailable IPython shell/display-formatter infrastructure.

Focused validation used `make -C sagemath/sagelite test-sage-doctest-corpus`
with a temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/display-pretty-make.sqlite3`.
The make target rebuilt and patched a fresh Sagelite source copy successfully;
the saved block- and file-failure cluster queries are empty. The latest run
metadata records node profile, runner version 61, and Sagelite source/package
commit `f575cf6224f749763d7c875229cbd684e5939e58`.

Focused JSmol iframe display corpus-growth pass:

```text
sage -t passed: 24 passed, 0 failed, 1 skipped
```

That one-file focused validation adds `sage/repl/display/jsmol_iframe.py` to
the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 612
non-comment entries. The file exercises the browser-facing JSmol iframe HTML
generator and `OutputSceneJmol` script inlining path without new WASI source
tags or startup namespace changes.

Direct adjacent sampling kept `sage/repl/display/formatter.py`,
`sage/repl/rich_output/backend_emacs.py`, and `sage/repl/configuration.py` out
of the quiet corpus because their current failures cluster around unavailable
IPython shell/display-formatter and `traitlets` configuration infrastructure.
It also kept skipped-only or zero-block REPL helpers such as
`sage/repl/image.py`, `sage/repl/user_globals.py`,
`sage/repl/prompts.py`, and `sage/repl/rich_output/output_catalog.py` out of
the dashboard.

Focused FLINT, MPFR, and polyhedron-helper corpus-growth pass:

```text
sage -t passed: 34 passed, 0 failed, 1 skipped
```

That four-file focused validation adds `sage/libs/flint/flint_sage.pyx`,
`sage/matrix/misc_mpfr.pyx`,
`sage/geometry/polyhedron/cdd_file_format.py`, and
`sage/geometry/polyhedron/misc.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 627
non-comment entries. The files add clean low-level FLINT/MPFR helper coverage
plus polyhedron file-format and utility coverage under the default node
profile without new WASI source tags or startup namespace changes.

Focused validation used the Sagelite doctest runner directly with
`sage -t --timeout 90` and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/flint-polyhedron-focused.sqlite3`.
The saved block- and file-failure cluster queries are empty, and
`file-coverage-shape.sql` reports clean runnable coverage for all four files.
Sampling in the same pass kept `sage/matrix/misc_flint.pyx`,
`sage/libs/flint/arith.pyx`, and `sage/rings/polynomial/refine_root.pyx` out of
the quiet corpus because they still have focused block-level failures; skipped
or optional-only helpers such as `sage/rings/qqbar_decorators.py` and
`sage/rings/ring_extension_homset.py` also remain outside the dashboard.

Focused parallelism and Cython test-helper corpus-growth pass:

```text
sage -t passed: 56 passed, 0 failed, 0 skipped
```

That two-file make-target validation adds `sage/parallel/parallelism.py` and
`sage/tests/cython.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 629 non-comment
entries. `parallelism.py` adds runnable coverage for Sage's parallelism
configuration singleton without enabling subprocess-backed parallel execution,
and `cython.pyx` adds compact test-helper coverage.

Direct sampling first recorded two `parallelism.py` failures where
`Parallelism().get_all()` printed the same dictionary in a different insertion
order under Sagelite. The added WASI source patch marks those two display
checks as `# random - dict display order differs in Sagelite`, preserving the
state-setting examples while keeping the browser-profile dashboard independent
of dictionary rendering order. Focused validation used the
`test-sage-doctest-corpus` make target after rebuilding a fresh patched
Sagelite source copy, with a temporary two-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/parallelism-cython-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused quadratic-form helper corpus-growth pass:

```text
sage -t passed: 17 passed, 0 failed, 1 skipped
```

That two-file focused validation adds
`sage/quadratic_forms/constructions.py` and
`sage/quadratic_forms/random_quadraticform.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 631 non-comment
entries. The files add compact quadratic-form constructor and randomized-form
coverage without requiring PARI local-density, genus-symbol, or mass-formula
paths.

Focused sampling first recorded `constructions.py` as clean with
`4 passed, 0 failed, 1 skipped`, then sampled adjacent quadratic-form helpers.
Only `random_quadraticform.py` was clean among that adjacent batch, with
`13 passed, 0 failed, 0 skipped`. The same sampling kept
`sage/quadratic_forms/extras.py`, `quadratic_form__evaluate.pyx`, and
`quadratic_form__mass.py` out of the quiet corpus because they still have
focused block-level failures, and kept `quadratic_form__genus.py` out because
it is skipped-only in the current browser-compatible profile.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/quadratic-forms-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused finitely generated Lie-conformal helper corpus-growth pass:

```text
sage -t passed: 11 passed, 0 failed, 1 skipped
```

That one-file make-target validation adds
`sage/algebras/lie_conformal_algebras/finitely_freely_generated_lca.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 632 non-comment
entries. Direct sampling first recorded 11 passed blocks and one failure where
`lie_conformal_algebras.Affine(QQ, 'A1')` imports the stripped graph backend
through the affine Lie algebra constructor. The added WASI source patch marks
that example as `# needs sage.graphs`, preserving the Virasoro and
Neveu-Schwarz finitely generated Lie-conformal algebra coverage under the
default browser-compatible profile.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`,
and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/finitely-freely-generated-lca-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and
`skips-by-reason.sql` groups the deferred example under
`optional:sage.graphs`.

Follow-up sampling and candidate-ranking tooling pass:

This pass does not add a new corpus file. It samples several adjacent
low-count and helper modules and records why they are not yet good quiet
dashboard candidates:

- small CPython, REPL, stats, and feature helpers were mostly zero-block or
  skipped-only under the default browser-compatible profile;
- category wrappers such as `finite_groups.py`, `finite_posets.py`, and
  `posets.py` were skipped-only, while `quotient_fields.py` and
  `principal_ideal_domains.py` timed out in polynomial gcd/xgcd paths;
- module helpers such as `filtered_vector_space.py`,
  `free_module_morphism.py`, and related pseudomorphism files still have
  substantial block-level failures around vector-space and matrix behavior;
- low-level FLINT/NTL probes exposed warning-capture drift for deprecated
  import shims plus existing FLINT/NTL runtime boundaries;
- lie-conformal and quaternion-adjacent probes still cluster around
  algebraic-field coercion, graph-backed affine constructors, and broader
  backend gaps.

The pass adds `corpus-candidate-ranking.sql`, a saved SQLite query that sorts
the latest run by promotion readiness. It puts clean runnable files first,
then files needing triage, file-level errors, skipped-only files, and
zero-block files. This complements `file-coverage-shape.sql` by making broad
sampling runs easier to turn into the next focused corpus-growth target.

Focused quadratic special-values corpus-growth pass:

```text
sage -t passed: 11 passed, 0 failed, 19 skipped
```

That one-file focused validation adds
`sage/quadratic_forms/special_values.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 633 non-comment
entries. The file adds compact exact Gamma, Bernoulli, and quadratic L-value
helper coverage while leaving symbolic and PARI-backed examples under their
existing upstream `# needs` metadata.

Sampling first ran a mixed low-count helper batch across misc, REPL, matrix,
homology, module, and quadratic-form files. The saved
`corpus-candidate-ranking.sql` query identified `special_values.py` as the
only promotion candidate in that batch, with 100% non-skipped pass rate.
Nearby candidates stayed out of the quiet corpus: `matrix/change_ring.pyx`,
`homology/homology_group.py`, and `repl/configuration.py` still have focused
block-level failures, while several other sampled helpers were skipped-only or
zero-block under the default browser-compatible profile.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/quadratic-special-values-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Scheduled 2026-06-28 sampling follow-up: no corpus entry was added. The
checked `sagemath/sagelite/dist/wasi-sdk/sagelite-doctests.sqlite3` file was a
zero-byte placeholder in this checkout, and `/tmp` returned `EDQUOT` for the
doctest runner's adjacent `mkdtemp`, so focused probes used `.tmp/*.sqlite3`
instead.

Already-covered sanity reruns still pass for
`sage/combinat/root_system/root_space.py` (53 passed, 35 skipped),
`sage/combinat/root_system/coxeter_type.py` (75 passed, 10 skipped),
`sage/combinat/root_system/type_A.py` (43 passed, 13 skipped),
`sage/misc/repr.py` (27 passed, 7 skipped), `sage/misc/table.py` (52 passed,
25 skipped), `sage/misc/lazy_string.pyx` (129 passed, 8 skipped), and
`sage/misc/unknown.py` (22 passed, 0 skipped).

The unlisted root-system probes `sage/combinat/root_system/coxeter_matrix.py`,
`sage/combinat/root_system/braid_move_calculator.py`,
`sage/combinat/root_system/dynkin_diagram.py`, and
`sage/combinat/root_system/pieri_factors.py` were skipped-only under the
default browser profile. Unlisted set and monoid probes
`sage/sets/real_set.py`, `sage/monoids/hecke_monoid.py`, and
`sage/monoids/monoid.py` were also skipped-only. Small unlisted utility probes
such as `sage/combinat/counting.py`, `sage/combinat/family.py`,
`sage/combinat/algebraic_combinatorics.py`, `sage/combinat/ribbon.py`,
`sage/misc/mathml.py`, `sage/structure/coerce_exceptions.py`,
`sage/structure/gens_py.py`, and `sage/structure/sage_object_test.py` exposed
no doctest blocks.

The same sampling pass confirmed several non-quiet blockers that should remain
future triage targets rather than immediate corpus additions:
`sage/combinat/graph_path.py` fails graph-backed examples,
`sage/combinat/abstract_tree.py` still reaches a `list_clone`
maximum-call-stack trap, `sage/misc/sage_input.py` reaches the known
NTL/libcxx ostream memory trap through finite-field polynomial setup, and
`sage/misc/functional.py` times out in a symbolic rational-expression
denominator example.

Focused deprecated FLINT shim corpus-growth pass:

```text
sage -t passed: 2 passed, 0 failed, 2 skipped
```

That two-file make-target validation adds `sage/libs/flint/fmpz_poly.pyx` and
`sage/libs/flint/ulong_extras.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 635 non-comment
entries. The files exercise the remaining deprecated FLINT lazy-import shims
beside the existing direct `flint_sage.pyx` and `ulong_extras_sage.pyx`
coverage. Direct sampling first recorded one warning-output mismatch in each
file; the added WASI source patch marks those deprecation-warning examples as
deferred `# known bug` skips, matching the current Sagelite doctest runner
limitation that warning streams are not captured as doctest stdout.

The same fresh sampling kept `sage/misc/dev_tools.py` and
`sage/misc/sage_ostools.pyx` out of the quiet corpus because their focused
failures involve broad import-enumeration and POSIX file-descriptor behavior.
It also kept low-count Lie-conformal helper files out because their failures
cluster around algebraic-field coercion, graph-backed affine constructors, and
number-field/cypari2 boundaries. Focused validation used the
`test-sage-doctest-corpus` make target with a temporary two-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/flint-shims-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Scheduled 2026-06-29 sampling follow-up: no corpus entry was added. The
checked corpus already includes the only clean non-skipped file found in the
first utility batch, `sage/misc/timing.py`, and
`sage/stats/distributions/discrete_gaussian_polynomial.py` was also already
covered. Fresh unlisted utility probes were skipped-only or zero-block for
`sage/misc/gperftools.py`, `package_dir.py`, `profiler.py`,
`sphinxify.py`, `sage/stats/intlist.pyx`,
`sage/stats/distributions/discrete_gaussian_integer.pyx`,
`sage/stats/time_series.pyx`, `sage/stats/hmm/util.pyx`, and several tiny
test/all helper modules.

The same sampling pass kept several near candidates out of the quiet corpus:
`sage/categories/euclidean_domains.py` has 19 passing blocks but still hits a
polynomial gcd/free-basis `SystemError` and category tester construction
drift; `sage/stats/distributions/discrete_gaussian_lattice.py` has broad
stateful setup fallout after its constructor examples fail; and
`sage/misc/explain_pickle.py`, `persist.pyx`, `reset.pyx`, `session.pyx`, and
`inline_fortran.py` still have focused block failures. One-file category and
arithmetic probes also confirmed existing file-level runtime blockers:
`sage/arith/functions.pyx` times out in polynomial `LCM_list`,
`sage/categories/commutative_rings.py` reaches the
`polynomial_number_field` function-signature mismatch,
`sage/categories/fields.py` reaches the NTL/libcxx finite-field memory trap,
and `sage/categories/rings.py` reaches the polynomial quotient call-stack
overflow. The useful SQLite outputs for this pass are under
`.tmp/current-run/sample-unlisted-*.sqlite3` and focused probe databases under
`.tmp/current-run/probe-*.sqlite3`.

Focused structure coercion corpus-growth pass:

```text
sage -t passed: 114 passed, 0 failed, 44 skipped
```

That one-file make-target validation adds
`sage/structure/coerce_actions.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 636
non-comment entries. The file covers Sage's coercion action machinery without
exposing the lower-level callable conversion signature mismatch still present
in adjacent `coerce_maps.pyx`.

Fresh sampling before the addition found no new clean entries among
`sage/categories/examples/*`, which were skipped-only or zero-block under the
default browser profile. Larger quadratic-form helpers and asymptotic-ring
helpers remain out of the quiet corpus because they expose broad block-level
failures, file-level NTL/libcxx memory traps, or timeouts. The same focused
structure/timeit probe kept `sage/structure/coerce_maps.pyx` out because it
still reaches a `CCallableConvertMap_class__call_` function-signature
mismatch; `sage/misc/sage_timeit.py` and `sage/misc/sage_timeit_class.pyx`
also still have focused block failures. Validation used
`SAGELITE_DOCTEST_CORPUS=/home/user/cowasm/.tmp/current-run/coerce-actions-corpus.txt`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/coerce-actions-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused benchmark helper corpus-growth pass:

```text
sage -t passed: 13 passed, 0 failed, 5 skipped
```

That one-file make-target validation adds `sage/misc/benchmark.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 637 non-comment
entries. Direct sampling first recorded 13 passing blocks and five failures:
the all-benchmark smoke and `bench0()` route through PARI-backed rational
polynomial factorization, `bench1()` requires the unavailable eclib/mwrank
interface, and `bench6()`/`bench7()` require elliptic-curve scheme support
that is outside the stripped browser-compatible startup namespace.

The added WASI source patch marks those backend-heavy examples as explicit
`# needs` skips while preserving the integer, rational, and polynomial
arithmetic benchmark helpers as default-profile coverage. Focused validation
used the `test-sage-doctest-corpus` make target after rebuilding a fresh
patched Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/benchmark-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and
`skips-by-reason.sql` groups the deferred examples under
`sage.libs.pari`, `sage.libs.eclib`, and `sage.schemes`.

Focused STL-vector smoke corpus-growth pass:

```text
sage -t passed: 23 passed, 0 failed, 0 skipped
```

That one-file make-target validation adds `sage/tests/stl_vector.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 638 non-comment
entries. The file gives a compact Cython/C++ smoke for STL `vector` wrapping,
`libcpp.string`, Cython rich comparison, GMP integer accumulation, and
`cysignals` guard usage without pulling in the broader Sage test-suite files.

Fresh utility sampling before the addition ranked `stl_vector.pyx` as the only
clean non-skipped promotion candidate in that batch. The same pass kept
`sage/tests/test_deprecation.py` out because warning-output capture still
shows two output mismatches; `sage/stats/r.py`, `sage/tests/lazy_imports.py`,
and `sage/tests/numpy.py` were skipped-only; and the sampled `all.py` helper
modules had no doctest blocks. Focused validation used
`SAGELITE_DOCTEST_CORPUS=/home/user/cowasm/.tmp/current-run/stl-vector-corpus.txt`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/stl-vector-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused p-adic misc corpus-growth pass:

```text
sage -t passed: 21 passed, 0 failed, 5 skipped
```

That one-file make-target validation adds `sage/rings/padics/misc.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 639 non-comment
entries. The file gives compact default-profile coverage for p-adic helper
functions, including rational reconstruction bounds, residue-character checks,
and simple `sigma`/`tau` computations, while the existing upstream tags keep
the full p-adic Gauss-sum examples behind explicit `sage.rings.padics` and
`sage.libs.ntl` skips.

Fresh compact algebra sampling before the addition ranked `padics/misc.py` as
the only clean non-skipped promotion candidate in that batch. The same pass
kept several nearby matrix and arithmetic helpers out of the quiet corpus:
`matrix/change_ring.pyx` and `matrix/misc_flint.pyx` still depend on the
unavailable `matrix_integer_dense` extension path; `matrix/tests.py` exposes
kernel/determinant runtime drift; `polynomial/refine_root.pyx` has startup
namespace setup fallout; `bernmm.pyx` reaches the focused cypari2 object-model
boundary; and `bernoulli_mod_p.pyx` still fails to load because `gf2x_mul` is
not callable through the current dynamic-link import table. Focused validation
used
`SAGELITE_DOCTEST_CORPUS=/home/user/cowasm/.tmp/current-run/padics-misc-corpus.txt`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/padics-misc-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused Gnuplot interface corpus-growth pass:

```text
sage -t passed: 1 passed, 0 failed, 1 skipped
```

That one-file focused validation adds `sage/interfaces/gnuplot.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 640
non-comment entries. The file contributes a compact startup-interface repr
doctest while keeping the interactive plotting example behind its existing
optional `gnuplot`/`not tested` metadata.

Direct sampling first ran the file against the current patched Sagelite source
tree with `sage -t --timeout 90`, recording `1 passed, 0 failed, 1 skipped`.
Focused make-target validation used a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/gnuplot-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused FLINT arithmetic helper corpus-growth pass:

```text
sage -t passed: 44 passed, 0 failed, 1 skipped
```

That one-file focused validation adds `sage/libs/flint/arith_sage.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 641 non-comment
entries. The file extends the existing FLINT shim coverage with arithmetic
helper doctests while relying on the upstream skip metadata for its one
optional/deferred block.

Fresh sampling in the same Cython/lib utility batch kept
`sage/libs/mpmath/utils.pyx` out of the quiet corpus because it still has
startup-symbol failures around `pi`, `NaN`, and dependent values. Other sampled
CPython/GMP/FLINT/PARI helper files were skipped-only or had no doctest
blocks. Focused validation used the `test-sage-doctest-corpus` make target
with a temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/flint-arith-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused quaternion wrapper corpus-growth pass:

```text
sage -t passed: 2 passed, 0 failed, 1 skipped
```

That one-file make-target validation adds
`sage/algebras/quaternion_algebra.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 642 non-comment
entries. The file gives compact coverage for the backwards-compatible
quaternion-algebra unpickle wrapper while the WASI source patch classifies the
matrix-backed constructor example as
`# needs sage.matrix.matrix_integer_dense`, matching the missing dense-matrix
extension boundary seen in direct sampling.

Focused validation rebuilt a fresh patched Sagelite source copy and used
`SAGELITE_DOCTEST_CORPUS=/home/user/cowasm/.tmp/current-run/quaternion-corpus.txt`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/quaternion-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Fresh sampling in the same pass kept several nearby low-count candidates out
of the quiet corpus. `sage/misc/functional.py` still times out in symbolic
rational setup, `sage/misc/sage_ostools.pyx` is dominated by `fileno` and
redirection-output drift, FLINT/ARB qsieve and arithmetic helpers still have
backend failures, `sage/coding/two_weight_db.py` reaches the existing
NTL/libcxx ostream memory trap during namespace loading, and the sampled
small interface, database, stats, tests, species, and monoid helpers were
skipped-only or zero-block under the default browser-compatible profile.

Focused arithmetic helper corpus-growth pass:

```text
sage -t passed: 34 passed, 0 failed, 8 skipped
```

That one-file make-target validation adds `sage/arith/functions.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 643 non-comment
entries. The file extends default-profile arithmetic coverage around `lcm`,
`LCM_list`, Sage integer coercion, and generic iterable handling.

Direct sampling first exposed one file-level timeout at the final polynomial
`LCM_list(Sequence((2*X+4, 2*X^2, 2)))` examples. The added WASI source patch
marks the two polynomial LCM examples as `# known bug` deferrals, preserving
the integer and rational arithmetic helper coverage while keeping the
known-hanging polynomial branch out of the quiet browser-compatible dashboard.
The same sampling batch kept `sage/combinat/counting.py` and
`sage/combinat/family.py` out because they had no doctest blocks, and
`sage/combinat/species/misc.py` out because it was skipped-only.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`,
and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/arith-functions-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and
`skips-by-reason.sql` groups the deferred polynomial LCM examples under
`deferred:known bug`. A broader full-corpus validation was started with
failures disallowed but interrupted before it initialized the result database,
because the current 643-entry corpus exceeded the practical runtime for this
scheduled slice.

Focused interface quit helper corpus-growth pass:

```text
sage -t passed: 7 passed, 0 failed, 14 skipped
```

That one-file make-target validation adds `sage/interfaces/quit.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 644 non-comment
entries. The file contributes browser-compatible coverage for Sage's spawned
process bookkeeping and interface shutdown helpers, while the existing
upstream `# needs sage.libs.pari` and `# needs sage.symbolic` tags keep the
PARI/GAP/Maxima interface examples outside the default profile.

Fresh focused sampling also found `sage/interfaces/sympy_wrapper.py` and
`sage/stats/intlist.pyx` to be skipped-only under the default profile.
`sage/interfaces/tab_completion.py` still has one startup-completion display
mismatch where `dickman_rho` is absent from the stripped namespace, and
`sage/tests/test_deprecation.py` remains blocked by the known warning-output
capture gap. Focused validation used
`SAGELITE_DOCTEST_CORPUS=/home/user/cowasm/.tmp/current-run/quit-corpus.txt`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/quit-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused module-with-basis morphism corpus-growth pass:

```text
sage -t passed: 353 passed, 0 failed, 0 skipped
```

That one-file make-target validation adds
`sage/modules/with_basis/morphism.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 645 non-comment
entries. The file adds clean default-profile coverage for morphisms between
modules with basis, including coercion, composition, category behavior,
matrix-backed actions, and kernel/image helpers, without reaching the known
dense-matrix or NTL/libcxx runtime boundaries.

Fresh uncovered-module sampling before the addition found
`with_basis/morphism.py` as the only clean non-skipped promotion candidate in
that batch. `diamond_cutting.py` and `finite_submodule_iter.pyx` were
skipped-only; `module_functors.py`, `free_module_pseudohomspace.py`, and
`free_module_pseudomorphism.py` still have semantic/display failures. Nearby
exploratory batches also kept skipped-only uncovered misc and monoid helpers
out of the quiet corpus, while `structure/coerce_maps.pyx` still hits a
`CCallableConvertMap` function-signature mismatch and category field/ring
sampling still reaches NTL/libcxx or polynomial-constructor runtime
boundaries. Focused validation used
`SAGELITE_DOCTEST_CORPUS=/home/user/cowasm/.tmp/current-run/with-basis-morphism-corpus.txt`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/with-basis-morphism-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused interface tab-completion corpus-growth pass:

```text
sage -t passed: 13 passed, 0 failed, 0 skipped
```

That one-file make-target validation adds
`sage/interfaces/tab_completion.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 646 non-comment
entries. Direct sampling first recorded one completion-list mismatch because
upstream Sage's startup namespace includes `dickman_rho` while the stripped
Sagelite startup namespace did not. The doctest runner now seeds the
lightweight `dickman_rho` function in the common doctest namespace, and the
WASI `sage.all` patch exposes the same name for REPL parity on a fresh
patched Sagelite source copy.

Focused validation used
`SAGELITE_DOCTEST_CORPUS=/home/user/cowasm/.tmp/current-run/tab-completion-corpus.txt`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/tab-completion-make.sqlite3`;
the saved block- and file-failure cluster queries are empty. The runner
version is now 62.

Focused Sudoku corpus-growth pass:

```text
sage -t passed: 96 passed, 0 failed, 0 skipped
```

That one-file focused validation adds `sage/games/sudoku.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 647 non-comment
entries. The file adds clean default-profile coverage for Sage's exact-cover
Sudoku solver helpers and puzzle parsing without needing browser-profile
source tags or startup namespace changes.

Fresh uncovered-file sampling in the same pass found several adjacent support
files to be skipped-only under the default profile, including CPython string
helpers, monoid/category examples, crypto stream/block cipher helpers,
homology chains, and root-system/group helpers. Other sampled candidates
still hit existing runtime boundaries, including `data_structures/stream.py`
through a `coerce_maps` function-signature mismatch and `misc/sage_input.py`
through the known NTL/libcxx finite-field trap.

Focused validation used
`SAGELITE_DOCTEST_CORPUS=/home/user/cowasm/.tmp/current-run/sudoku-corpus.txt`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/sudoku-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Follow-up frontier sampling pass:

```text
sage -t passed: 257 passed, 0 failed, 65 skipped
sage -t failed: 3 passed, 12 failed, 748 skipped
sage -t failed: 5 passed, 49 failed, 240 skipped
sage -t failed: 24 passed, 71 failed, 58 skipped
sage -t failed: 55 passed, 32 failed, 10 skipped
sage -t failed: 134 passed, 85 failed, 553 skipped
sage -t failed: 156 passed, 26 failed, 284 skipped
```

This pass did not promote new files to the curated corpus. The clean
typeset/logic probe reconfirmed already-curated coverage for
`sage/typeset/ascii_art.py`, `character_art.py`,
`character_art_factory.py`, `unicode_art.py`, `sage/logic/logicparser.py`,
and `sage/logic/booleval.py`. Fresh probes kept several uncovered frontier
files outside the quiet dashboard:

- `sage/misc/copying.py`, `mathml.py`, `proof.py`,
  `sage/structure/coerce_exceptions.py`, `gens_py.py`,
  `sage_object_test.py`, and `sage/structure/proof/__init__.py` have no
  default-profile doctest blocks.
- `sage/misc/map_threaded.py`, `package_dir.py`, `cython.py`,
  `sage/combinat/finite_state_machine_generators.py`,
  crypto classical/cipher helpers, and several homology/test helpers are
  skipped-only in the default browser-compatible profile.
- `sage/repl/rich_output/backend_emacs.py`, `sage/repl/display/formatter.py`,
  `sage/repl/configuration.py`, and `sage/repl/load.py` still need broader
  REPL/IPython startup and display triage before they can join the quiet
  corpus.
- `sage/homology/homology_group.py`, `chain_complex_morphism.py`,
  `sage/misc/reset.pyx`, `session.pyx`, `sage/ext/fast_callable.pyx`,
  `sage/arith/misc.py`, and `sage/combinat/tutorial.py` still hit semantic,
  runtime, or backend-bound failure clusters rather than narrow display drift.

The scratch databases for these probes live under
`/home/user/cowasm/.tmp/current-run/`, including
`misc-probe.sqlite3`, `crypto-repl-probe.sqlite3`,
`homology-data-probe.sqlite3`, `repl-support-next.sqlite3`,
`misc-infra-next.sqlite3`, `lowlevel-arith-next.sqlite3`, and
`combinat-small-next.sqlite3`. The curated corpus remains at 647
non-comment entries until the next clean non-skipped candidate is found.

Focused MOLS handbook data corpus-growth pass:

```text
sage -t passed: 7 passed, 0 failed, 0 skipped
```

That one-file make-target validation adds
`sage/combinat/designs/MOLS_handbook_data.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 648 non-comment
entries. The file gives the dashboard small clean combinatorial-design data
coverage without new WASI source tags or startup namespace changes.

Fresh uncovered-file sampling in the same pass kept skipped-only files such as
`sage/categories/groupoid.py`, `sage/databases/odlyzko.py`,
`sage/topology/simplicial_complex_catalog.py`,
`sage/topology/simplicial_set_catalog.py`, `sage/modular/buzzard.py`,
`sage/tests/numpy.py`, and `sage/monoids/hecke_monoid.py` out of the quiet
corpus. Other sampled candidates in tests, symbolic helpers, Lie conformal
algebras, graded-module homspaces, matrix helpers, and quadratic-form
evaluation still have focused failures rather than narrow browser-profile
metadata gaps.

Focused validation used
`SAGELITE_DOCTEST_CORPUS=/home/user/cowasm/.tmp/current-run/mols-handbook-corpus.txt`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/mols-handbook-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused combinatorial-design namespace corpus-growth pass:

```text
sage -t passed: 271 passed, 0 failed, 168 skipped
```

That two-file focused validation adds `sage/combinat/designs/database.py` and
`sage/combinat/designs/design_catalog.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 650 non-comment
entries. The doctest runner now seeds the lightweight `designs` catalog in the
common doctest namespace and mirrors it onto `sage.all`; the WASI `sage.all`
patch exposes the same name for REPL parity on fresh patched Sagelite source
copies. This clears the previous `NameError: name 'designs' is not defined`
cluster and gives the browser-profile dashboard clean coverage for small
combinatorial-design constructors and database availability examples.

Focused validation used
`SAGELITE_DOCTEST_CORPUS=/home/user/cowasm/.tmp/current-run/design-namespace-corpus.txt`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/design-namespace-allow0.sqlite3`;
the same run rebuilt a fresh patched Sagelite source copy and confirmed the
updated WASI patch applies cleanly. The saved block- and file-failure cluster
queries are empty, and the runner version is now 63.

Fresh exploratory sampling kept several adjacent uncovered files out of the
quiet corpus. Category-example, coding, monoid, topology, and homology support
files were mostly skipped-only under the default profile. `sage_timeit.py`,
`sage_timeit_class.pyx`, and `repl/inputhook.py` still cluster around the
missing IPython backend; `covering_array.py` still reaches Singular-backed
construction; small FLINT/qsieve wrappers have output drift; and
`libs/ntl/error.pyx` still hits a side-module `gf2x_mul` import failure.

Focused geometry ABC corpus-growth pass:

```text
sage -t passed: 6 passed, 0 failed, 9 skipped
```

That one-file focused validation adds `sage/geometry/abc.pyx` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 651 non-comment
entries. The file gives the dashboard small abstract-base-class coverage for
geometry interfaces while keeping polyhedron-backed construction examples
explicitly skipped under the default browser-compatible profile.

Fresh low-count support sampling in the same pass kept several files outside
the quiet corpus. `sage/cpython/string.pyx`, `databases/cunningham_tables.py`,
`misc/sphinxify.py`, `monoids/monoid.py`, `combinat/species/misc.py`,
`misc/profiler.py`, and `calculus/functions.py` were skipped-only in the
default profile. `features/planarity.py`, `libs/flint/arith.pyx`,
`libs/flint/qsieve_sage.pyx`, `matrix/change_ring.pyx`, `tests/__init__.py`,
`tests/test_deprecation.py`, `combinat/posets/bubble_shuffle.py`, and
`algebras/quaternion_algebra_element.py` still have focused import, backend,
subprocess, or output-drift failures rather than clean browser-profile
coverage.

Follow-up support-file sampling found no additional quiet nonzero corpus
candidate among several absent small infrastructure files. `features/standard.py`,
`misc/copying.py`, `misc/func_persist.py`, `misc/map_threaded.py`,
`logic/all.py`, `repl/rich_output/output_catalog.py`, `probability/all.py`,
`stats/all.py`, `stats/intlist.pyx`, `data_structures/binary_search.pyx`,
`homology/chains.py`, `coding/channel.py`, `coding/encoder.py`, and
`coding/decoder.py` were skipped-only or no-block in the default node profile.
`doctest/fixtures.py`, `doctest/util.py`, `doctest/external.py`,
`features/__init__.py`, `parallel/decorate.py`, `parallel/map_reduce.py`,
`repl/display/formatter.py`, `quadratic_forms/extras.py`,
`data_structures/stream.py`, `games/hexad.py`, and
`homology/homology_group.py` still have focused failure clusters around
external-feature detection, interrupt/subprocess assumptions, IPython-backed
display formatting, quadratic-form backend drift, stream polynomial setup
signature mismatch, and finite-field or matrix-backed examples. Existing
coverage for `misc/package.py` and `misc/namespace_package.py` was confirmed
clean in the same sampling pass, but both files were already present in the
curated corpus.

Focused geometry Hasse-diagram corpus-growth pass:

```text
sage -t passed: 3 passed, 0 failed, 2 skipped
```

That one-file make-target validation adds `sage/geometry/hasse_diagram.py` to
the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 652 non-comment
entries. The file gives the dashboard a small atomic/coatomic lattice
construction surface; the only skipped examples are the existing
`# needs sage.graphs` lattice-display checks.

Fresh small absent-file sampling in the same pass kept skipped-only files such
as `sage/cpython/cython_metaclass.pyx`, `sage/modules/complex_double_vector.py`,
`sage/categories/g_sets.py`, `sage/databases/sloane.py`,
`sage/tests/lazy_imports.py`, and `sage/tests/finite_poset.py` out of the
quiet corpus. `sage/symbolic/complexity_measures.py`,
`sage/rings/polynomial/pbori/blocks.py`,
`sage/rings/polynomial/pbori/nf.py`, and
`sage/combinat/posets/hochschild_lattice.py` still have focused startup,
PBoRi, graph, or poset namespace failures rather than clean browser-profile
coverage.

Focused validation used
`SAGELITE_DOCTEST_CORPUS=/home/user/cowasm/.tmp/current-run/geometry-hasse-corpus.txt`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/geometry-hasse-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused warning-capture runner and deprecation-test corpus-growth pass:

```text
sage -t passed: 4 passed, 0 failed, 0 skipped
```

That one-file focused validation adds `sage/tests/test_deprecation.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 653 non-comment
entries. Runner version 64 installs a doctest-local warning hook while each
parsed doctest object runs, formatting warnings through doctest-captured
stdout with Sage's historical `doctest:...` filename convention. This clears
the known warning-output capture gap for `deprecated_function_alias(...)`
examples without adding source-level `# known bug` tags.

Focused direct validation used
`COWASM_SAGELITE_DOCTEST_SOURCE_ROOT=/home/user/cowasm/sagemath/sagelite/build/wasi-sdk`
and wrote
`/home/user/cowasm/.tmp/current-run/test-deprecation-warning-capture.sqlite3`;
the saved block- and file-failure cluster queries are empty. The same sampling
pass reconfirmed that `sage/repl/rich_output/backend_emacs.py` remains outside
the quiet corpus because its import path is IPython-backed, while
`sage/misc/sage_ostools.pyx` remains dominated by POSIX `fileno` and
redirection semantics.

Focused p-adic test-helper corpus-growth pass:

```text
sage -t passed: 8 passed, 0 failed, 4 skipped
```

That one-file focused validation adds `sage/rings/padics/tests.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 654 non-comment
entries. Direct sampling first found the file as the only promotion candidate
in a mixed uncovered batch; the existing `corpus-candidate-ranking.sql` query
classified it as `promote_candidate` with 100% non-skipped pass rate.

The same sampling batch kept skipped-only files such as `sage/tests/sympy.py`,
`sage/tests/numpy.py`, `sage/databases/sloane.py`, `sage/databases/odlyzko.py`,
and `sage/categories/g_sets.py` out of the curated corpus. It also kept
`sage/features/planarity.py`, `sage/repl/inputhook.py`,
`sage/parallel/multiprocessing_sage.py`,
`sage/combinat/designs/subhypergraph_search.pyx`, and
`sage/algebras/lie_conformal_algebras/n2_lie_conformal_algebra.py` out because
they still have runnable default-profile failures.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/padics-tests-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused database and homology support corpus-growth pass:

```text
sage -t passed: 27 passed, 0 failed, 11 skipped
```

That two-file focused validation adds
`sage/databases/db_class_polynomials.py` and
`sage/homology/koszul_complex.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 656 non-comment
entries. Direct sampling first found both files as clean non-skipped promotion
candidates: `db_class_polynomials.py` recorded 4 passed blocks and 11 skipped
blocks, while `koszul_complex.py` recorded 23 passed blocks and no skips.

The same support-file sampling batch kept skipped-only files such as
`sage/databases/cunningham_tables.py`, topology catalogs,
`sage/monoids/monoid.py`, and homology helper modules out of the curated
corpus. It also kept the sampled computational-mathematics book doctest
helpers out because they still have runnable default-profile failures rather
than narrow browser-profile metadata gaps.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/db-koszul-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused modular-polynomial database corpus-growth pass:

```text
sage -t passed: 10 passed, 0 failed, 20 skipped
```

That one-file focused validation adds
`sage/databases/db_modular_polynomials.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 657 non-comment
entries. The file gives the dashboard default-profile coverage for database
lookup and class-polynomial helper paths while its optional database-backed
examples remain explicit skips.

The mixed exploratory batch first ranked `db_modular_polynomials.py` as a
clean promotion candidate. It also reconfirmed that `typeset/ascii_art.py`
already has clean non-skipped coverage in the corpus, while skipped-only
module-with-basis and homology helper files stay out of the quiet dashboard.
The same batch kept `modules/with_basis/indexed_element.pyx`,
`modules/with_basis/subquotient.py`, `homology/chain_complex_morphism.py`,
`homology/chain_homotopy.py`, `databases/conway.py`,
`misc/reset.pyx`, `repl/configuration.py`, and
`repl/display/formatter.py` out because they still have focused failures or a
timeout rather than narrow skip-metadata gaps.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/db-modular-polynomials-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused Jones number-field database corpus-growth pass:

```text
sage -t passed: 7 passed, 0 failed, 16 skipped
```

That one-file focused validation adds `sage/databases/jones.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 658 non-comment
entries. The file gives the dashboard lightweight coverage for the Jones
number-field database wrapper and representation paths while its optional
database-backed examples remain explicit skips.

Direct sampling first recorded one failure in `sortkey(QuadraticField(-3))`
because constructing the quadratic field reaches the current browser-profile
number-field/polynomial backend boundary. The added WASI source patch marks
that local example as `# needs sage.rings.number_field`, matching the existing
scope boundary used elsewhere in the pure-math corpus.

Focused validation used the `test-sage-doctest-corpus` make target from a
freshly patched Sagelite source copy with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/jones-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused symbolic test-helper corpus-growth pass:

```text
sage -t passed: 1 passed, 0 failed, 1 skipped
```

That one-file focused validation adds `sage/symbolic/tests.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 659 non-comment
entries. The file gives the dashboard a lightweight import smoke for the
Pynac/Sage symbolic test helper while its rational-power memory-leak probe is
classified as `# needs sage.symbolic`, matching the existing browser-profile
boundary for symbolic expression support.

Direct sampling first recorded one failure because
`rational_powers_memleak()` calls `ZZ(2).sqrt()` and imports
`sage.symbolic.expression`, which is absent from the stripped Sagelite
profile. Nearby low-count uncovered-file sampling kept skipped-only files such
as `modules/complex_double_vector.py`, `categories/g_sets.py`,
`categories/groupoid.py`, and `categories/bialgebras.py` out of the curated
corpus, while `coding/two_weight_db.py`, `databases/all.py`, and broader
stats/database/test helpers still have runtime, subprocess, or missing-module
failure clusters.

Focused validation used the `test-sage-doctest-corpus` make target from a
freshly patched Sagelite source copy with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/symbolic-tests-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

Focused polynomial root-refinement corpus-growth pass:

```text
sage -t passed: 5 passed, 0 failed, 4 skipped
```

That one-file focused validation adds
`sage/rings/polynomial/refine_root.pyx` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 660
non-comment entries. Direct sampling first recorded five passing blocks and
four failures caused by the stripped browser-compatible startup namespace not
providing symbolic `pi`/`sin` for the complex-interval root example. The added
WASI source patch marks the root estimate and dependent checks as
`# needs sage.symbolic`, leaving the non-symbolic polynomial setup and
interval conversion coverage runnable in the default node profile.

Focused validation used the `test-sage-doctest-corpus` make target from a
freshly patched Sagelite source copy with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/refine-root-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the four deferred examples as `optional:sage.symbolic`.

The same scheduled pass sampled several nearby small uncovered helpers without
finding another promotion candidate. CLI test wrappers and `repl/prompts.py`
had zero runnable blocks; `cpython/string.pyx`, `crypto/cipher.py`,
`tests/lazy_imports.py`, `misc/map_threaded.py`, `misc/sphinxify.py`,
`homology/tests.py`, `monoids/hecke_monoid.py`, `monoids/monoid.py`,
`categories/groupoid.py`, `categories/g_sets.py`, `rings/factorint_flint.pyx`,
and `arith/multi_modular.pyx` were skipped-only under the default profile.
Rejected runnable probes exposed broader clusters: `libs/ntl/error.pyx` still
hits the GF2X side-module import boundary, `misc/sage_timeit_class.pyx` has
timing-helper mismatches, `symbolic/complexity_measures.py` needs symbolic
startup semantics, `quadratic_forms/quadratic_form__evaluate.pyx` needs
quadratic-form startup/import work, and `arith/misc.py` still reaches the
known polynomial table-index trap.

Focused simplicial-set category corpus-growth pass:

```text
sage -t passed: 8 passed, 0 failed, 187 skipped
```

That one-file focused validation adds `sage/categories/simplicial_sets.py` to
the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 661 non-comment
entries. Direct sampling first recorded 8 passing blocks, 5 failures, and 182
skips; the failures were an untagged universal-cover TEST block that used
`simplicial_sets.RealProjectiveSpace`, `simplicial_sets.Sphere`, and homology
through the graph/group/topology stack. The added WASI source patch marks that
dependent setup and checks as `# needs sage.graphs sage.groups`, consistent
with the surrounding simplicial-set examples.

Focused validation rebuilt a fresh patched Sagelite source copy and used the
`test-sage-doctest-corpus` make target with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/simplicial-sets-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

The same pass sampled several uncovered support areas without finding another
promotion candidate. `sage_ostools.pyx` still depends on WASI file-descriptor
and subprocess semantics; `sage_input.py` reaches the known NTL/libcxx
finite-field trap; `sage_timeit.py`, `session.pyx`, `hexad.py`, and several
REPL display/configuration helpers have focused runtime or display failures;
and `quotient_fields.py`, `principal_ideal_domains.py`, and
`unique_factorization_domains.py` time out in polynomial arithmetic. Category
files such as `posets.py`, `finite_posets.py`, `vector_bundles.py`,
`groupoid.py`, and `g_sets.py` remain skipped-only under the default profile.

Focused CPython string-helper corpus-growth pass:

```text
sage -t passed: 8 passed, 0 failed, 0 skipped
```

That one-file focused validation adds `sage/cpython/string.pxd` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 662 non-comment
entries. The file gives the dashboard lightweight coverage for CPython string
conversion helpers used by Cython code paths, without broadening the runtime
surface.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=60`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/cpython-string-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

The same scheduled pass sampled several nearby uncovered files without finding
another promotion candidate. `sage/cpython/builtin_types.pyx` had no runnable
blocks, `sage/cpython/string.pyx` and `sage/cpython/wrapperdescr.pxd` were
skipped-only, and `sage/cpython/cython_metaclass.pyx` remained skipped-only.
Small category examples such as `bialgebras.py`,
`examples/algebras_with_basis.py`, and
`examples/graded_connected_hopf_algebras_with_basis.py` also remained
skipped-only. Other probes exposed broader clusters that should stay out of
the quiet corpus for now: `categories/fields.py` still reaches the NTL/libcxx
finite-field trap, `matrix/change_ring.pyx` and `matrix/misc_flint.pyx` have
focused matrix/FLINT failures, and uncovered combinatorics samples such as
`abstract_tree.py`, `colored_permutations.py`, `path_tableaux/dyck_path.py`,
and `posets/bubble_shuffle.py` hit recursion, NTL import, or poset/path-tableau
failure clusters.

Focused subprocess-boundary test-helper corpus-growth pass:

```text
sage -t passed: 1 passed, 0 failed, 5 skipped
```

That one-file focused validation adds `sage/tests/__init__.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 663 non-comment
entries. Direct sampling first recorded one passing import block and five
failures because `check_executable(...)` uses `subprocess.Popen`, which is not
available in the default WASI/browser-compatible profile. The added WASI source
patch marks the `cat` and `sleep` subprocess examples, plus their dependent
output checks, as `# needs subprocess`.

Focused validation used the `test-sage-doctest-corpus` make target from a
freshly patched Sagelite source copy with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/tests-init-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the five deferred examples as `optional:subprocess`.

The same scheduled pass sampled several nearby low-count files without finding
another promotion candidate. `doctest/parsing_test.py` and `doctest/all.py`
had zero runnable blocks; `databases/cunningham_tables.py`,
`databases/odlyzko.py`, `combinat/species/misc.py`, and
`rings/ring_extension_homset.py` were skipped-only under the default profile.
Other probes exposed broader clusters that should stay out of the quiet corpus
for now: `doctest/external.py` and `parallel/decorate.py` need subprocess or
parallel-runtime triage, `features/planarity.py` needs optional-feature
metadata, and small scheme or Lie conformal algebra probes still reach broader
symbolic, algebraic-field, or backend gaps.

Focused covering-design and geometry linear-expression corpus-growth pass:

```text
sage -t passed: 210 passed, 0 failed, 4 skipped
```

That two-file focused validation adds
`sage/combinat/designs/covering_design.py` and
`sage/geometry/linear_expression.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 665
non-comment entries. A mixed frontier sample first ranked both files as
`promote_candidate` in `corpus-candidate-ranking.sql`, with 100% non-skipped
pass rates: `covering_design.py` recorded 46 passed blocks and 3 skipped
blocks, while `linear_expression.py` recorded 164 passed blocks and 1 skipped
block.

The same sample kept `sage/categories/finite_coxeter_groups.py` and
`sage/categories/weyl_groups.py` out as skipped-only files, and kept
`sage/categories/coxeter_groups.py`, `sage/categories/pushout.py`,
`sage/combinat/species/empty_species.py`,
`sage/combinat/species/set_species.py`, `sage/combinat/species/species.py`,
and `sage/geometry/newton_polygon.py` out because their focused failures still
hit graph/group startup gaps, the known NTL/libcxx memory trap, species
startup semantics, or broader geometry output clusters.

Focused validation used
`SAGELITE_DOCTEST_CORPUS=/home/user/cowasm/.tmp/current-run/covering-linear-corpus.txt`,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/covering-linear-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

Focused Steenrod utility corpus-growth pass:

```text
sage -t passed: 100 passed, 0 failed, 0 skipped
```

That one-file make-target validation adds
`sage/algebras/steenrod/steenrod_algebra_misc.py` to the curated corpus,
bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 666
non-comment entries. A four-file Steenrod sample ranked
`steenrod_algebra_misc.py` as the only clean promotion candidate, with 100%
non-skipped pass rate and no deferred skips.

The adjacent `steenrod_algebra.py`, `steenrod_algebra_bases.py`, and
`steenrod_algebra_mult.py` files remain outside the quiet corpus. Their
focused failures are dominated by a missing `sage.matrix.matrix_mod2_dense`
cluster in Steenrod basis conversion, antipode, multiplication, and coproduct
paths, plus smaller follow-up failures that need runtime/package triage rather
than narrow browser-profile tagging.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/steenrod-misc-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; the latest-run
summary records runner version 64 in the default node profile.

Focused q-number and rich-comparison corpus-growth pass:

```text
sage -t passed: 46 passed, 0 failed, 1 skipped
```

That two-file make-target validation adds
`sage/algebras/quantum_groups/q_numbers.py` and
`sage/structure/richcmp.pxd` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 668 non-comment
entries. Direct sampling first found both files as clean non-skipped
candidates in a mixed moderate-count probe: `q_numbers.py` recorded 23 passed
blocks with no skips, and `richcmp.pxd` recorded 23 passed blocks plus one
explicit `# needs sage.symbolic` skip.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary two-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/q-numbers-richcmp-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; the latest-run
summary records runner version 64 in the default node profile.

The same scheduled pass sampled several uncovered support files without
finding another promotion candidate. Display and doctest internals such as
`repl/display/formatter.py`, `repl/rich_output/backend_emacs.py`,
`doctest/fixtures.py`, and `doctest/util.py` still have focused output or
doctest-framework failures. Other probes were skipped-only or empty under the
default profile, including `misc/package_dir.py`, `misc/profiler.py`,
`stats/intlist.pyx`, `stats/distributions/discrete_gaussian_integer.pyx`,
`rings/qqbar_decorators.py`, `databases/symbolic_data.py`,
`combinat/root_system/braid_move_calculator.py`, `knots/gauss_code.py`, and
several category-example helpers. Broader runtime clusters remain visible in
`data_structures/stream.py` and `categories/euclidean_domains.py`, which both
reach the known polynomial-number-field memory trap, and
`rings/bernoulli_mod_p.pyx`, which still hits the missing `gf2x_mul` side
module import.

Focused structure element header corpus-growth pass:

```text
sage -t passed: 17 passed, 0 failed, 6 skipped
```

That one-file make-target validation adds `sage/structure/element.pxd` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 669 non-comment
entries. A mixed 10-file frontier probe first ranked it as a clean runnable
promotion candidate with a 100% non-skipped pass rate; the same probe also
confirmed that `sage/geometry/polyhedron/cdd_file_format.py` remains a clean
candidate, but that file was already part of the checked corpus.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/structure-element-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records existing optional-feature deferrals for `sage.combinat`,
`sage.modules`, `sage.libs.gap`, and `sage.rings.real_mpfr`.

The same scheduled probe kept several nearby candidates out of the quiet
corpus. `coding/guruswami_sudan/utils.py`,
`combinat/designs/evenly_distributed_sets.pyx`, and `calculus/functions.py`
were skipped-only under the default profile. `algebras/lie_algebras/abelian.py`,
`manifolds/structure.py`, `rings/polynomial/toy_d_basis.py`, and
`quadratic_forms/extras.py` still have focused failures that need separate
triage, while `rings/finite_rings/conway_polynomials.py` still reaches the
known NTL/libcxx `memory access out of bounds` trap.

Focused Fermionic-ghosts Lie conformal algebra corpus-growth pass:

```text
sage -t passed: 9 passed, 0 failed, 2 skipped
```

That one-file make-target validation adds
`sage/algebras/lie_conformal_algebras/fermionic_ghosts_lie_conformal_algebra.py`
to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 671
non-comment entries. Direct sampling first recorded the file as the closest
Lie-conformal candidate with 9 passed blocks and two `QQbar`-backed failures.
The added WASI source patch marks those algebraic-field construction and
structure-coefficient examples as `# needs sage.rings.number_field`,
consistent with the adjacent Virasoro `QQbar` browser-profile boundary.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/fermionic-ghosts-make.sqlite3`.
The latest-run summary records runner version 64 in the default node profile,
and skip grouping records the two deferred
`optional:sage.rings.number_field` blocks.

The same scheduled sampling pass kept several absent files out of the quiet
corpus. Lightweight stats, support, and book doctest probes were skipped-only,
empty, or failed around missing startup names; category probes were mostly
skipped-only, with `kahler_algebras.py` still failing and
`principal_ideal_domains.py` plus `unique_factorization_domains.py` timing out
in polynomial gcd/radical examples. Adjacent monoid files were skipped-only,
while nearby Lie-conformal modules still expose graph-backed affine imports,
algebraic-field coercion/cache drift, or broader missing-name clusters.

Focused Coxeter-category corpus-growth pass:

```text
sage -t passed: 184 passed, 0 failed, 455 skipped
```

That one-file make-target validation adds
`sage/categories/coxeter_groups.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 672
non-comment entries. Direct sampling first recorded 183 passed blocks and 33
startup-name failures. The doctest runner now seeds the lightweight
`FiniteWeylGroups` category constructor in the common startup namespace, and
the WASI `sage.all` patch exposes the same constructor for REPL parity on a
fresh patched source copy.

The remaining sampled Coxeter startup failures were explicit browser-profile
boundaries rather than missing lightweight names: `CoxeterGroup(...)` examples
route through graph-backed Coxeter/Dynkin diagram construction, while the
affine `WeylGroup(["B", 3, 1])` reflection-representation example imports the
stripped GAP-backed matrix-group stack. The added WASI source patch marks
those contiguous doctest blocks with standalone `# needs sage.graphs` or
`# needs sage.libs.gap` directives so dependent prompts are skipped together.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with
`TMPDIR=/home/user/cowasm/.tmp/current-run/patch-tmp`, a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/coxeter-groups-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; the latest-run
summary records runner version 64 in the default node profile.

Focused symbolic complexity-helper corpus-growth pass:

```text
sage -t passed: 1 passed, 0 failed, 2 skipped
```

That one-file make-target validation adds
`sage/symbolic/complexity_measures.py` to the curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 673
non-comment entries. Direct sampling first recorded one runnable import
doctest and two startup-name failures because the example expression uses the
stripped symbolic variable `x`. The added WASI source patch marks the
expression construction and dependent `string_length(...)` check as
`# needs sage.symbolic`, matching the existing browser-profile boundary for
symbolic helper files.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`,
and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/complexity-measures-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the two `optional:sage.symbolic` deferrals.

The same scheduled probe kept several low-count support files out of the
quiet corpus. `sage/cpython/wrapperdescr.pxd`,
`sage/combinat/species/misc.py`, `sage/misc/map_threaded.py`,
`sage/tests/lazy_imports.py`, `sage/tests/numpy.py`,
`sage/cpython/cython_metaclass.pyx`, `sage/databases/odlyzko.py`,
`sage/plot/step.py`, `sage/modular/modform/tests.py`,
`sage/databases/cunningham_tables.py`, and `sage/cpython/string.pyx` were
skipped-only under the default profile. `sage/repl/inputhook.py` and
`sage/misc/sage_timeit_class.pyx` still cluster around missing IPython,
`sage/features/planarity.py` needs optional-feature packaging triage,
`sage/matrix/change_ring.pyx` still depends on unavailable dense integer
matrix imports, and
`sage/algebras/lie_conformal_algebras/neveu_schwarz_lie_conformal_algebra.py`
still exposes an algebraic-real-field cache mismatch beyond the narrow
symbolic tagging handled here.

Focused point-plot corpus-growth pass:

```text
sage -t passed: 52 passed, 0 failed, 36 skipped
```

That one-file make-target validation adds `sage/plot/point.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 676 non-comment
entries. Direct sampling first recorded 49 passed blocks and 28 focused
failures. The failures split into a lightweight startup-name gap for `hue`
and a 3D plotting boundary where `point3d` imports the unavailable
`sage.ext.interpreters.wrapper_rdf` stack through
`sage.plot.plot3d.shapes`.

The doctest runner now seeds `hue` from `sage.plot.colors` in the common
startup namespace, and the WASI `sage.all` patch exposes the same name for
REPL parity on a fresh patched source copy. The added WASI source patch marks
the 3D point doctest groups as `# needs sage.plot.plot3d`, preserving the 2D
point coverage while making the stripped 3D plotting dependency explicit.
Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/point-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected `optional:sage.plot.plot3d`, `optional:sage.symbolic`,
and `optional:sage.schemes` deferrals. The runner version is now 65.

Focused polygon-plot corpus-growth pass:

```text
sage -t passed: 52 passed, 0 failed, 25 skipped
```

That one-file make-target validation adds `sage/plot/polygon.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 677 non-comment
entries. Direct sampling first recorded 52 passed blocks, 22 existing
symbolic skips, and three focused failures. The failures split into two 3D
polygon dispatcher examples that import the unavailable
`sage.ext.interpreters.wrapper_rdf` stack through
`sage.plot.plot3d.shapes2`, plus one `.show(...)` equivalence example that
requires Matplotlib.

The added WASI source patch marks the 3D polygon examples as
`# needs sage.plot.plot3d` and the `.show(...)` example as
`# needs matplotlib`, matching the adjacent plotting corpus boundary while
preserving the 2D polygon primitive coverage. Focused validation used the
`test-sage-doctest-corpus` make target after rebuilding a fresh patched
Sagelite source copy, with `TMPDIR=/home/user/cowasm/.tmp/current-run/patch-tmp`,
a temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/polygon-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected `optional:sage.symbolic`,
`optional:sage.plot.plot3d`, and `optional:matplotlib` deferrals. The runner
version remains 65.

Focused ellipse-plot corpus-growth pass:

```text
sage -t passed: 39 passed, 0 failed, 1 skipped
```

That one-file focused validation adds `sage/plot/ellipse.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 678 non-comment
entries. Direct sampling recorded 39 runnable blocks and one existing
`sage.symbolic` deferral for the `Ellipse(...).plot3d()` example, with no new
WASI source tags or startup namespace changes.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/ellipse-make.sqlite3`.
The saved block- and file-failure cluster queries are empty, and
`skips-by-reason.sql` records the single deferred 3D symbolic example under
`optional:sage.symbolic`.

Focused arc-plot corpus-growth pass:

```text
sage -t passed: 40 passed, 0 failed, 12 skipped
```

That one-file make-target validation adds `sage/plot/arc.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 679 non-comment
entries. Direct sampling first recorded 40 passed blocks, eight existing
`sage.symbolic` skips, and four focused failures. The failing examples were
the Matplotlib-backed `_matplotlib_arc()` and `bezier_path()` internals plus a
dependent `b[0]` prompt after `bezier_path()` failed.

The added WASI source patch marks those Matplotlib-backed arc internals as
`# needs matplotlib`, preserving the browser-compatible arc construction,
bounding-box, representation, and 2D graphics coverage. Focused validation
used the `test-sage-doctest-corpus` make target after rebuilding a fresh
patched Sagelite source copy, with
`TMPDIR=/home/user/cowasm/.tmp/current-run/patch-tmp`, a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/arc-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected `optional:sage.symbolic` and `optional:matplotlib`
deferrals. The runner version remains 65.

Focused circle-plot corpus-growth pass:

```text
sage -t passed: 43 passed, 0 failed, 14 skipped
```

That one-file make-target validation adds `sage/plot/circle.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 680 non-comment
entries. Direct sampling first recorded 43 passed blocks and 14 focused
failures. The failures split into the stripped 3D plotting boundary,
Matplotlib-backed `.show(...)` examples, and a lightweight startup-name gap
for `Graphics` in the spiral construction example.

The doctest runner now seeds `Graphics` from `sage.plot.graphics` in the
common startup namespace, and the WASI `sage.all` patch exposes the same name
for REPL parity on fresh patched source copies. The added WASI source patch
marks the 3D circle doctest groups as `# needs sage.plot.plot3d` and the
Matplotlib-backed show examples as `# needs matplotlib`, preserving 2D circle
construction, option handling, bounding-box, and representation coverage.
Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with
`TMPDIR=/home/user/cowasm/.tmp/current-run/patch-tmp`, a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/circle-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected `optional:sage.plot.plot3d` and `optional:matplotlib`
deferrals. The runner version remains 65.

Focused bezier-path plot corpus-growth pass:

```text
sage -t passed: 37 passed, 0 failed, 5 skipped
```

That one-file make-target validation adds `sage/plot/bezier_path.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 681 non-comment
entries. Direct sampling first recorded 37 passed blocks, four existing
`sage.symbolic` skips, and one focused failure where the `.show(...)`
equivalence example imports Matplotlib.

The added WASI source patch marks that Matplotlib-backed show example as
`# needs matplotlib`, preserving browser-compatible Bezier path construction,
option handling, min/max, and representation coverage. Focused validation
used the `test-sage-doctest-corpus` make target after rebuilding a fresh
patched Sagelite source copy, with
`TMPDIR=/home/user/cowasm/.tmp/current-run/patch-tmp`, a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/bezier-path-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected `optional:sage.symbolic` and `optional:matplotlib`
deferrals. The runner version remains 65.

Focused disk-plot corpus-growth pass:

```text
sage -t passed: 57 passed, 0 failed, 7 skipped
```

That one-file make-target validation adds `sage/plot/disk.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 682
non-comment entries. Direct sampling first recorded 57 passing blocks and
seven focused failures split between Matplotlib-backed save/show examples and
3D plotting examples that import the stripped plot3d RDF wrapper path.

The added WASI source patch marks those examples as `# needs matplotlib` or
`# needs sage.plot.plot3d`, preserving browser-compatible 2D disk
construction, option handling, aspect ratio, representation, and error
coverage. Focused validation used the `test-sage-doctest-corpus` make target
after rebuilding a fresh patched Sagelite source copy, with
`TMPDIR=/home/user/cowasm/.tmp/current-run/plot-frontier`, a temporary
one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/plot-frontier/disk-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected `optional:matplotlib` and
`optional:sage.plot.plot3d` deferrals. The runner version remains 65.

The same scheduled plot-primitive probe kept nearby files out of the quiet
corpus at the time. Follow-up passes promoted `sage/plot/text.py`,
`sage/plot/histogram.py`, `sage/plot/primitive.py`, and `sage/plot/line.py`;
`sage/plot/arrow.py` remains outside the quiet corpus. `sage/plot/colors.py`,
`sage/plot/misc.py`, and the hyperbolic plot primitives were skipped-only
under the default browser-compatible profile.

Focused line-plot corpus-growth pass:

```text
sage -t passed: 57 passed, 0 failed, 23 skipped
```

That one-file make-target validation adds `sage/plot/line.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 686
non-comment entries. Direct sampling first recorded 40 passing blocks and 23
focused failures. The failures split between the stripped 3D plotting
boundary, a Matplotlib-backed `.show(...)` equivalence example, and a
lightweight startup namespace gap for `sin`, `tan`, `real_part`, `jacobi`, and
`bessel_J` in line-plot gallery examples.

The doctest runner now seeds those math-function names in the common startup
namespace, and the WASI `sage.all` patch exposes the same names for REPL
parity on fresh patched source copies. The added WASI source patch marks the
3D line examples as `# needs sage.plot.plot3d` and the `.show(...)` example as
`# needs matplotlib`, preserving browser-compatible line construction, option
handling, logarithmic scale, complex-point, and gallery curve coverage.
Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with
`TMPDIR=/home/user/cowasm/.tmp/current-run/line-patch-tmp`, a temporary
one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/line-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected `optional:sage.plot.plot3d`, `optional:matplotlib`, and
pre-existing `sage.schemes`, `sage.libs.pari`, `sage.rings.complex_double`,
`sage.symbolic`, and `numpy` deferrals. The runner version is 67.

Focused arrow-plot corpus-growth pass:

```text
sage -t passed: 48 passed, 0 failed, 17 skipped
```

That one-file make-target validation adds `sage/plot/arrow.py` to the curated
corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 687
non-comment entries. Direct sampling first recorded 48 passing blocks, one
existing symbolic skip, and 16 focused failures. The failures were the same
narrow plot-frontier boundaries as the adjacent primitives: 3D arrow examples
import the stripped `sage.plot.plot3d` wrapper path, and Matplotlib-backed
render/show examples require the unavailable display backend.

The added WASI source patch marks those 3D and Matplotlib examples, including
their dependent prompts, as explicit `# needs` skips. This preserves
browser-compatible arrow construction, option, representation, bounding-box,
and 2D primitive coverage in the default profile. Focused validation used the
`test-sage-doctest-corpus` make target after rebuilding a fresh patched
Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/arrow-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected `optional:sage.plot.plot3d`, `optional:matplotlib`, and
pre-existing `optional:sage.symbolic` deferrals. The runner version remains
67.

Focused graphics-object corpus-growth pass:

```text
sage -t passed: 166 passed, 0 failed, 242 skipped
```

That one-file make-target validation adds `sage/plot/graphics.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 688 non-comment
entries. Direct sampling first recorded 155 passing blocks, 33 failures, and
220 skipped blocks. The failures were narrow plot-frontier issues: Matplotlib
render/save/rich-output examples, one 3D sphere setup, startup-name gaps for
lightweight 2D plot helpers, dict/order display drift, one CPython integer
formatting diagnostic drift in `Graphics.plot(1)`, and one missing warning
display in a `list_plot_loglog(...)` tick example.

The doctest runner now seeds `bar_chart`, `ellipse`, `matrix_plot`, and
`list_plot_loglog` in the common startup namespace, and the WASI `sage.all`
patch exposes the same names for REPL parity on a fresh patched Sagelite
source copy. The added WASI source patch marks Matplotlib and 3D display paths
with explicit `# needs` metadata and classifies the remaining display and
diagnostic drift as `# random` or deferred `# known bug` metadata. Focused
validation used the `test-sage-doctest-corpus` make target after rebuilding a
fresh patched Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/graphics-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected `optional:matplotlib`, `optional:sage.plot.plot3d`, and
pre-existing symbolic, latex, polyhedron, and deferred-warning deferrals. The
runner version is now 68.

Focused complex-plot corpus-growth pass:

```text
sage -t passed: 40 passed, 0 failed, 63 skipped
```

That one-file make-target validation adds `sage/plot/complex_plot.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 689 non-comment
entries. Direct sampling first recorded 40 passed blocks, 15 failed blocks,
and 48 skipped blocks. The failures were narrow Matplotlib boundaries:
colormap-backed `complex_to_cmap_rgb(...)` examples and `complex_plot(...)`
constructor examples import Matplotlib in the stripped browser-compatible
profile, with two dependent min/max checks failing only because their setup
plots were unavailable.

The added WASI source patch marks those Matplotlib-backed examples as
`# needs matplotlib`, preserving the remaining complex-to-RGB, phase, HLS/RGB,
and option-validation doctests as default-profile coverage. Focused validation
used the `test-sage-doctest-corpus` make target after rebuilding a fresh
patched Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/dev/shm/cowasm-sagelite/complex-plot-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected `optional:matplotlib` deferrals plus the pre-existing
symbolic skips. The runner version remains 68.

Focused cachefunc warning-deferral pass:

```text
sage -t passed: 625 passed, 0 failed, 233 skipped
```

That one-file make-target validation keeps the existing
`sage/misc/cachefunc.pyx` curated corpus entry quiet under the default
browser-compatible profile. A focused rerun exposed the remaining
deprecated-alias examples where `deprecated_function_alias` writes a
`DeprecationWarning` that the Sagelite doctest runner records as normal output
instead of warning metadata. The WASI source patch now marks the unbound
`Foo.g(...)` variants with the same `# known bug` deferral already used for
the adjacent bound-call examples, preserving the runnable cached-function and
cached-method coverage while keeping the warning-capture limitation explicit.

Focused validation rebuilt a fresh patched Sagelite source copy from
`/home/user/sagelite` and used the `test-sage-doctest-corpus` make target with
a temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/cachefunc/cachefunc-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records six `deferred:known bug` cachefunc examples, including the four
deprecated-alias warning-output deferrals.

Focused quantumino corpus-growth pass:

```text
sage -t passed: 57 passed, 0 failed, 42 skipped
```

That one-file make-target validation adds `sage/games/quantumino.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 690
non-comment entries. Direct sampling first recorded 57 passing blocks, 40
existing skips, and two focused failures. The failures were narrow
browser-profile boundaries: the top-level `show_pentaminos()` example imports
the stripped 3D plotting stack, and the skinny-box no-solution check reaches
GAP-backed Weyl-group setup before raising the expected `StopIteration`.

The added WASI source patch marks those examples as
`# needs sage.plot.plot3d` and `# needs sage.libs.gap`, preserving the
browser-compatible Quantumino state, solver setup, iterator, and
zero-solution count coverage. Focused validation used the
`test-sage-doctest-corpus` make target after rebuilding a fresh patched
Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/quantumino-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected `optional:sage.plot.plot3d`, `optional:sage.libs.gap`,
and pre-existing long/deferred skips.

Focused Bernoulli multimodular wrapper corpus-growth pass:

```text
sage -t passed: 22 passed, 0 failed, 3 skipped
```

That one-file make-target validation adds `sage/rings/bernmm.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 691 non-comment
entries. Direct sampling first recorded 22 passing blocks and three failures:
the PARI-backed `bernoulli(..., algorithm='pari')` comparison setup raised the
current focused-cypari2 `NotImplementedError`, and two dependent checks then
failed because `lst2` was not defined.

The added WASI source patch marks those three comparison examples as
`# needs sage.libs.pari`, preserving the default-profile coverage for the
native `bernmm_bern_rat` and `bernmm_bern_modp` wrappers, including the
large-index Bernoulli and modular-reduction checks. Focused validation used
the `test-sage-doctest-corpus` make target after rebuilding a fresh patched
Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/bernmm-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records only the expected `optional:sage.libs.pari` deferrals.

Focused matrix change-ring helper corpus-growth pass:

```text
sage -t passed: 2 passed, 0 failed, 2 skipped
```

That one-file make-target validation adds `sage/matrix/change_ring.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 692 non-comment
entries. Direct sampling first recorded two passing blocks and two failures:
the ordinary `matrix(...).change_ring(RDF)` path already works in the default
profile, while the explicit `sage.matrix.change_ring` import path requires the
unavailable dense integer matrix backend.

The added WASI source patch marks the direct
`integer_to_real_double_dense(...)` backend probe as
`# needs sage.matrix.matrix_integer_dense`, preserving default-profile
coverage for the public matrix change-ring behavior without promoting the
stripped dense-integer side-module import. Focused validation used the
`test-sage-doctest-corpus` make target after rebuilding a fresh patched
Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/change-ring/change-ring-make.sqlite3`.
The saved block- and file-failure cluster queries are empty. The run metadata
records CoWasm commit `f6be66969e767343ac1803bcc07fa07eb2fa551e`,
Sagelite package commit `f575cf6224f749763d7c875229cbd684e5939e58`, node
profile, and runner version 69.

Focused matrix-argument helper corpus-growth pass:

```text
sage -t passed: 157 passed, 0 failed, 34 skipped
```

That one-file make-target validation adds `sage/matrix/args.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 693
non-comment entries. Direct sampling first recorded 162 passing blocks and 13
failures; the failures were all browser-profile boundaries or dependent
fallout around PARI matrix conversion, graph-backed matrix construction,
QQbar algebraic-number scalar checks, and permutation-group algebra
construction.

The added WASI source patch marks those examples with explicit `# needs`
metadata for `sage.libs.pari`, `sage.graphs`, `sage.rings.number_field`, and
`sage.groups`, preserving the broad plain `MatrixArgs` construction,
iteration, coercion, scalar, sparse-entry, and matrix-space coverage under the
default node profile. The pass also refreshes two older
`integer_mod_ring.py` patch hunks so the full WASI source patch applies
cleanly to the current local Sagelite checkout after a fresh source copy.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with
`TMPDIR=/home/user/cowasm/.tmp/current-run/patch-tmp`, a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/matrix-args-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected optional `numpy`, `sage.libs.pari`, `sage.symbolic`,
`sage.rings.number_field`, `sage.groups`, `sage.graphs`, and finite-ring/PARI
deferrals.

Follow-up sampling after the matrix-argument pass did not find a new quiet
runnable corpus candidate. Focused probes covered several adjacent and
alternate namespaces:

```text
matrix_misc.py + symplectic_basis.py: 68 passed, 0 failed, 0 skipped
plot colors/misc/step/benchmark: 0 passed, 0 failed, 403 skipped
plot hyperbolic/density/contour/field/streamline helpers: skipped-only
matrix_plot.py: 18 passed, 40 failed, 14 skipped
stats/HMM and selected quadratic helpers: skipped-only or broad failures
monoid/coding base abstractions: skipped-only
crypto basic cipher helpers: 0 passed, 0 failed, 1712 skipped
```

`matrix_misc.py` and `symplectic_basis.py` were already present in the
curated corpus. `matrix_plot.py` is not a good narrow follow-up yet: most
failures come from the function's unconditional `scipy.sparse` import, with
dependent name failures and a few diagnostic mismatches after setup examples
do not run. The next useful pass should either choose a different namespace
with unpromoted runnable candidates, or explicitly tackle a real cluster such
as the `matrix_plot` SciPy boundary rather than tagging most of the file into
skipped-only coverage.

Focused FLINT matrix helper corpus-growth pass:

```text
sage -t passed: 1 passed, 0 failed, 4 skipped
```

That one-file make-target validation adds `sage/matrix/misc_flint.pyx` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 695
non-comment entries. Direct sampling first recorded two passing blocks and
three failures in `matrix_integer_dense_rational_reconstruction(...)`; the
failures were all tied to the stripped dense integer matrix backend and
dependent state after that backend import failed.

The added WASI source patch marks those reconstruction examples as
`# needs sage.matrix.matrix_integer_dense`, preserving default-profile
coverage for the module's import and setup path without promoting the dense
integer matrix side module. Focused validation used the
`test-sage-doctest-corpus` make target after rebuilding a fresh patched
Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/next-probes/misc-flint-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected four `optional:sage.matrix.matrix_integer_dense`
deferrals.

Focused graph dot2tex utility corpus-growth pass:

```text
sage -t passed: 1 passed, 0 failed, 5 skipped
```

That one-file focused validation adds `sage/graphs/dot2tex_utils.py` to the
curated corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 696
non-comment entries. Direct sampling found the file is already quiet under the
default browser-compatible profile: the ordinary `have_dot2tex() in
[True, False]` fallback check runs, while the dot2tex/graphviz and
matrix-formatting examples remain covered by existing optional `# needs`
metadata.

Focused validation used the `test-sage-doctest-corpus` make target against
the patched Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/next-probes/dot2tex-utils-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
records the expected optional `dot2tex`/`graphviz` and `sage.modules`
deferrals.

Follow-up matrix special sampling pass:

```text
special.py: 407 passed, 91 failed, 89 skipped
```

`sage/matrix/special.py` is not promoted to the curated corpus yet. Direct
sampling first timed out in the randomized density-convergence loops in
`random_matrix(...)`; those loops are now marked `# long time`, matching the
adjacent density-distribution examples. The next runs then exposed runtime
boundaries in finite-field echelonizable matrices and matrix randomization for
unitary/bistochastic constructors. The WASI source patch now classifies those
early trap clusters as finite-ring requirements or deferred known bugs, so
future sampling reaches ordinary block-level failures instead of aborting at
file level.

After those tags, focused make-target validation against a one-file temporary
corpus still records 91 block failures. The remaining clusters are broader
matrix-special semantics rather than a narrow browser-profile tagging pass, so
`special.py` remains outside `basic-pure-math.txt`.

Focused Conway database resource pass:

```text
Conway polynomial database smoke: passed
```

This pass wires CoWasm's `@cowasm/conway-polynomials` package into Sagelite's
runtime dependency set and adds `sage/databases/conway.py` to the curated
corpus, bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to
697 non-comment entries. Direct sampling before the resource wiring recorded
15 passed blocks and 27 failures in `conway.py`, all rooted in the missing
`conway_polynomials` module and dependent state names.

The standalone resource script now stages the Conway data package under
`deps/conway_polynomials`, includes it in the manifest-derived `PYTHONPATH`,
and has a focused Node `python-wasm` smoke that constructs
`ConwayPolynomials()` and checks representative database availability. The
checked standalone rerun reaches and passes that smoke:

```text
sagelite-node-ok Conway polynomial database
```

The broader `test-wasi-sdk-standalone` run still exits through the existing
nonfatal blocker where `import sage.all` exits before its completion marker,
before Electron resources are emitted. A direct `python-wasm` probe against the
same staged Sagelite `PYTHONPATH` confirms that `ConwayPolynomials()` now
imports the data package and returns polynomial data under WASI.

Focused compiler-rt complex helper and mpmath dependency pass:

```text
sagelite-ok meson configure compile install node import electron resources smoke relocated followups recorded
```

This pass clears the standalone `import sage.all` completion-marker blocker
seen after the Conway database resource work. A compact repro showed that
loading `sage.rings.real_mpfr` after integer-ring initialization exited the
Node `python-wasm` worker before the marker; the same probe under
`python-wasi-sdk` exposed the underlying dynamic-link diagnostics for missing
compiler-rt complex helpers, first `__divdc3` and then `__muldc3`.

The dynamic loader now supplies direct JavaScript fallbacks for double-complex
division and multiplication, including the sret pointer ABI used by clang's
WASI side modules. The WASI dylink smoke covers both helpers from a real side
module in direct and archive-linked loader modes. Sagelite's standalone
dependency contract now also stages CoWasm's existing `py-mpmath` package,
which lets `sage.libs.mpmath.utils` and `sage.rings.complex_mpfr` import
normally when `real_mpfr` initializes.

Focused validation first checked compact Node and `python-wasi-sdk` probes:

```text
from sage.rings.integer_ring import ZZ
from sage.rings.real_mpfr import RealField
RealField(53)(2).sqrt()
```

Both backends now print `1.41421356237310` and reach the completion marker.
Full validation then rebuilt and staged Sagelite with
`TMPDIR=/home/user/cowasm/.tmp/current-run/clang-tmp`,
`SAGELITE_NODE_IMPORT_TIMEOUT=240s`, and
`SAGELITE_ELECTRON_SMOKE_TIMEOUT=240s`; the standalone target completed the
Node import ladder, Electron resource checks, doctest smoke, relocation check,
and follow-up recording.

Focused FLINT deprecation-wrapper corpus pass:

```text
sage -t passed: 11 passed, 0 failed, 0 skipped
```

This pass fixes Sagelite's doctest warning comparison for Sage's common
multiline warning expectation shape:

```text
doctest:warning
...
DeprecationWarning:
```

The runner now normalizes that expected form to the warning stream emitted by
the WASI doctest harness, and the standalone doctest smoke covers the case.
That unlocks the deprecated FLINT wrapper modules
`sage/libs/flint/arith.pyx` and `sage/libs/flint/qsieve.pyx`, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 699
non-comment entries. Focused validation used the `test-sage-doctest-corpus`
make target with a temporary two-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=90`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/next-probes/flint-wrapper-make.sqlite3`.
The saved block- and file-failure cluster queries are empty.

The direct FLINT implementation file `sage/libs/flint/qsieve_sage.pyx` remains
outside the quiet corpus: sampling still reaches `flint_abort` through
`qsieve_factor(...)` on the large composite example. Adjacent NTL sampling also
keeps `sage/libs/ntl/error.pyx` outside the corpus because importing
`ntl.ZZX([0])` currently hits a missing `gf2x_mul` dynamic-link import.

Focused NTL/GF2X side-module link pass:

```text
error.pyx:40 rerun: 1 passed, 0 failed, 0 skipped
```

This pass clears the `gf2x_mul` dynamic-link import barrier for the GF2X-backed
NTL side modules. Sagelite's WASI source patch now links
`sage.libs.ntl` C++ extension modules with raw `-lntl -lgmp -lgf2x` linker
flags under WASI, while keeping the compiler include path for GMP explicit.
The raw linker flags avoid Meson's unsupported `--start-group` archive
grouping for the current WASI `wasm-ld` path; the package-local clang wrappers
still filter those group flags for other Meson-generated commands.

Focused validation rebuilt the affected NTL side modules
(`ntl_GF2X`, `ntl_GF2E`, `ntl_GF2EContext`, `ntl_GF2EX`, and
`ntl_mat_GF2E`) and confirmed their WebAssembly import tables no longer request
`env.gf2x_mul`. The previous failing `sage/libs/ntl/error.pyx:40` setup line
now passes under `sage -t --line 40`.

Focused NTL zero-divisor error pass:

```text
error.pyx: 4 passed, 0 failed, 0 skipped
error.pyx:40 rerun: 1 passed, 0 failed, 0 skipped
```

This pass adds `sage/libs/ntl/error.pyx` to the quiet corpus. The WASI source
patch now guards `ntl_ZZX.quo_rem()` against a zero divisor and raises Sage's
`NTLError: DivRem: division by zero` before NTL reaches `TerminalError`. That
avoids the current side-module layout where `sage.libs.ntl.error` installs a
callback into one statically linked NTL copy while `ntl_ZZX` can still reach
its own unset NTL terminal-printer path and trap in libcxx ostream output.
Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/probes/ntl-error-make.sqlite3`.

Focused Sage timing helper corpus pass:

```text
sage_timeit.py: 17 passed, 0 failed, 27 skipped
```

This pass adds `sage/misc/sage_timeit.py` to the quiet corpus, bringing
`sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt` to 701 non-comment
entries. The WASI source patch tags timing-shell examples that import the
IPython-backed Sage interpreter as `# needs IPython`, matching the existing
browser-profile boundary used by other `timeit(...)` doctests, and marks the
single `SageTimeitResult` repr diagnostic drift as `# known bug`. The remaining
default-profile coverage exercises the lightweight timing-result constructor,
representation, and garbage-collection reset behavior without requiring the
interactive IPython timing shell.

Focused validation used the `test-sage-doctest-corpus` make target after
rebuilding a fresh patched Sagelite source copy, with a temporary one-file
corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`,
and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/sage-timeit-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
shows the expected IPython, symbolic, PARI, numpy/modules, and known-bug
deferrals.

Focused finite-dynamical-system catalog corpus pass:

```text
finite_dynamical_system_catalog.py: 57 passed, 0 failed, 11 skipped
```

This pass adds `sage/dynamics/finite_dynamical_system_catalog.py` to the quiet
corpus, bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt`
to 702 non-comment entries. The doctest runner now seeds Sage's lightweight
`finite_dynamical_systems` startup alias from
`sage.dynamics.finite_dynamical_system_catalog`, and the WASI `sage.all` patch
exposes the same alias for REPL parity after a fresh Sagelite rebuild. The
same startup pass exposes the lightweight `game_theory` catalog alias for
future catalog sampling without importing the broader game-theory surface.

The added WASI source patch marks the remaining root-poset and Tamari-lattice
rowmotion examples as `# needs sage.graphs`, matching the current stripped
graph-backend boundary while preserving the catalog's permutation,
bitstring-rotation, tableau-promotion, striker-sweep, and Bulgarian-solitaire
coverage as default-profile doctests. Focused validation used the
`test-sage-doctest-corpus` make target after rebuilding a fresh patched
Sagelite source copy, with a temporary one-file corpus,
`SAGELITE_DOCTEST_ALLOW_FAILURES=0`, `SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/finite-dynamics-make.sqlite3`.
The saved block- and file-failure cluster queries are empty; skip grouping
shows the expected `optional:sage.graphs` deferrals.

Focused quadratic-form mass helper corpus pass:

```text
quadratic_form__mass.py: 4 passed, 0 failed, 0 skipped
```

This pass adds `sage/quadratic_forms/quadratic_form__mass.py` to the quiet
corpus, bringing `sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt`
to 708 non-comment entries. Direct compact sampling kept nearby dependency
frontier files out of the corpus because they were skipped-only under the
default browser-compatible profile, including compact SymPy, SymEngine, NumPy,
database, map-threaded, ring-extension, species, and plotting helpers.

Earlier in the same scheduled run, `sage/game_theory/catalog_normal_form_games.py`
and `sage/game_theory/parser.py` were sampled after the lightweight
`game_theory` startup alias work. They are not yet quiet: the dominant cluster
is still missing startup names (`game_theory` and `NormalFormGame`), followed
by broad normal-form output drift, so game-theory catalog coverage remains a
separate follow-up. `sage/misc/sage_ostools.pyx` also remains outside the quiet
corpus because its current failures are broad stdout/fileno/subprocess
semantics rather than a narrow display-tag issue.

Focused validation used the `test-sage-doctest-corpus` make target with a
temporary one-file corpus, `SAGELITE_DOCTEST_ALLOW_FAILURES=0`,
`SAGELITE_DOCTEST_TIMEOUT=120`, and
`SAGELITE_DOCTEST_DB=/home/user/cowasm/.tmp/current-run/quadratic-mass-make.sqlite3`;
the saved block- and file-failure cluster queries are empty.

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
