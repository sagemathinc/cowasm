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
  - runs `# random` tests while accepting their output without comparison;
  - skips `# long time` unless `--long` is passed;
  - supports `--optional`, feature-filtered `--optional=FEATURE`, `--long`,
    `--timeout`, and `--sqlite`;
  - seeds the namespace with `sage.all` and, where possible, the tested Sage
    module globals.
- The Sagelite standalone target has a smoke test that runs `sage -t`, checks
  SQLite aggregate counts, and checks that random doctests are recorded as
  unchecked passed blocks.

Useful recent sample:

```sh
cd /home/user/sagelite/src/sage/rings
/home/user/cowasm/sagemath/sagelite/bin/sage -t integer_ring.pyx
```

Recent result after the optional/random refinements:

```text
integer_ring.pyx: 200 passed, 13 failed, 17 skipped
```

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
- make it easy to rerun a single failed file or block.

## Phase 2: Curated Compatibility Corpus

Do not start by running every Sage file. Start with a curated corpus that
matches the current pure-math target and grows deliberately.

### Initial Corpus

Create a file such as:

```text
sagemath/sagelite/src/doctest-corpus/basic-pure-math.txt
```

Suggested first entries:

```text
/home/user/sagelite/src/sage/rings/integer.pyx
/home/user/sagelite/src/sage/rings/integer_ring.pyx
/home/user/sagelite/src/sage/rings/rational.pyx
/home/user/sagelite/src/sage/rings/rational_field.py
/home/user/sagelite/src/sage/rings/finite_rings/finite_field_constructor.py
/home/user/sagelite/src/sage/rings/finite_rings/integer_mod_ring.py
/home/user/sagelite/src/sage/rings/polynomial/polynomial_ring_constructor.py
/home/user/sagelite/src/sage/matrix/constructor.py
```

Add more only after the dashboard can explain failures well.

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

### Example Clusters From `integer_ring.pyx`

Current remaining failures include:

- number-field construction via `sqrt(...)`;
- root-finding paths in `ZZ._roots_univariate_polynomial`;
- dependent `NameError` failures after a setup block fails;
- missing module paths that should either be ported, skipped by an accurate
  tag, or classified as a known package gap.

These are good clusters. Do not patch individual doctest expectations.

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
- the fast Sagelite standalone smoke remains separate and still passes up to
  the known Electron-shaped resource blocker.
