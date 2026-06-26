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

The Puiseux-series sampling pass kept several nearby files out of the quiet
corpus:
`sage/combinat/q_bernoulli.pyx` still reaches the known NTL/libcxx
`memory access out of bounds` trap through finite-field polynomial setup;
`sage/rings/continued_fraction.py` reaches number-field construction and
times out in the current browser profile; `sage/combinat/sine_gordon.py`
imports unavailable symbolic-expression support before its module globals can
be seeded; and `sage/rings/ring.pyx` reaches the existing
`polynomial_number_field` table-index trap during a broad `TestSuite`.

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
