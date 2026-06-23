# Real PARI/cypari2 Runtime Plan

This plan addresses the remaining hard part behind Sagelite's current
`cypari2` support: replacing the build-support placeholder with a real
runtime that can call PARI from `python-wasm` without traps, stale global
state, or poisoned error recovery.

The immediate target is Node.js/Electron. Browser support is a later runtime
milestone and should not drive this first port.

## Current State

CoWasm already has a useful split:

- `sagemath/pari` builds PARI/GP and `libpari` for the `wasi-sdk` standalone
  path.
- `sagemath/pari` validates real setjmp/longjmp support before building PARI.
- `sagemath/pari` runs a `gp` smoke and a C `libpari` smoke for arithmetic,
  `primepi`, factorization, modular order, polynomial irreducibility,
  elliptic-curve cardinality, and PARI error recovery.
- `sagemath/cypari2` currently installs the pinned `cypari2` 2.2.4 Cython
  include surface, generated `pari.desc` declarations, and an ABI-compatible
  `cypari2.gen` placeholder side module.
- The current `cypari2` runtime intentionally fails closed with
  `NotImplementedError`; it is enough for Sagelite build/import but not enough
  for actual PARI-backed mathematics.
- Sagelite's Node/Electron smoke currently imports `cypari2`, constructs
  `Pari`, and verifies that PARI calls fail closed.

Progress snapshot:

- Date: 2026-06-20
- Change: Phase 1 now has a private `cypari2._pari_runtime_probe` CPython side
  module in `sagemath/cypari2`. It links CoWasm `libpari.a`, `libgmp.a`, and
  explicit static `libsetjmp.a`, imports under `python-wasm`, evaluates PARI
  expressions, catches an `e_INV` error from `1/0`, and successfully computes
  again in the same Python process.
- Validation:
  `make -C sagemath/cypari2 test-wasi-sdk-standalone`
- Important detail: the first working side-module probe does not link
  `libwasi-emulated-signal.a`. The static signal archive is not PIC enough for
  side-module linking, and the minimal PARI arithmetic/error-recovery path does
  not need it. cysignals and interrupt behavior remain later phases.
- Change: Phase 2 now has a private `cypari2._pari_cython_probe` Cython side
  module. It cimports cypari2's generated `paridecl.pxd`, calls PARI through
  that declaration layer for ordinary expression evaluation, uses the same
  proven static `libsetjmp.a` link path, catches an `e_INV` error from `1/0`,
  and computes again afterward in the same Python process.
- Validation:
  `make -C sagemath/cypari2 test-wasi-sdk-standalone`
- Change: the generated public `cypari2.pari_instance.Pari` wrapper now routes
  one-argument string expressions through the private Cython PARI probe and
  returns a lightweight display object. This makes `Pari()("2+3")`,
  `Pari()("primepi(10000)")`, and `Pari()("factorback(factor(360))")` work
  under `python-wasm` while the full `Gen` object model and error translation
  remain follow-up work.

That means the work is not "port PARI" from scratch. It is specifically:

```text
make PARI's already-working WASI setjmp/longjmp behavior survive inside
CPython extension side modules and cypari2's Cython/Python object model.
```

## Focused Target: Sage Integer Factorization

The concrete user-visible failure that should drive the next milestone is:

```python
from sage.all import factor
factor(9349949894994)
```

In the current Sagelite shell this reaches Sage's integer factorization path,
then fails at the placeholder `cypari2.gen._missing_runtime` implementation
when `factor_using_pari` first calls `pari.get_debug_level()`.

Use this as the first real `Gen` object-model target. It is narrow enough to
test quickly, but it exercises the important cypari2/PARI boundary instead of
only string evaluation.

### Minimal Call Chain To Support

Trace and support the exact Sage path before broadening cypari2:

```text
sage.all.factor(...)
  -> sage.arith.misc.factor(...)
  -> sage.rings.integer.Integer.factor(...)
  -> sage.rings.factorint_pari.factor_using_pari(...)
  -> cypari2.Pari.get_debug_level()
  -> cypari2.Pari.set_debug_level(...) or Pari.default("debug", ...)
  -> cypari2.Pari(n)
  -> cypari2.Gen.factor(limit=-1, proof=...)
  -> factor-matrix access and conversion back into Sage integers
```

The first failure is `get_debug_level`, but the milestone is not done when that
single method exists. It is done when the returned PARI factor matrix can be
kept alive, indexed, converted, and used by Sage without process exit,
`NotImplementedError`, stale-stack memory, or swallowed PARI exceptions.

Do not solve this by adding a Sage-side Python fallback around
`factor_using_pari`. A temporary diagnostic bridge is fine during reduction,
but the durable fix must live at the cypari2 boundary because many later Sage
paths need the same `Pari` and `Gen` semantics.

### API Surface For The First Factorization Milestone

Implement the smallest real subset that the factorization path needs:

- `Pari.default("debug")`, `Pari.default("debug", value)`,
  `Pari.get_debug_level()`, and `Pari.set_debug_level(level)`.
- `Pari.__call__` for Python `int`, Sage `Integer`/integer-like objects, and
  strings. String support can keep using the proven private PARI evaluator
  until the real `Gen` constructor replaces it.
- `objtogen` for exact integers, with explicit failure for unsupported Python
  types.
- `Gen.__repr__`/`__str__` for display and smoke diagnostics.
- `Gen.__int__`/`__index__` for exact PARI integers.
- `Gen.factor(limit=-1, proof=None)`, implemented through PARI `factor(...)`
  and the `factor_proven` flag handling used by upstream cypari2.
- Matrix/vector access needed for PARI factor results:
  `Gen.nrows()`, `Gen.ncols()`, `Gen.__getitem__`, `Gen.__iter__`, and
  `Gen.python_list()` if Sage uses it in this path.

Everything outside that list should still fail explicitly. Avoid pretending
the complete cypari2 object model is available before the stack/lifetime tests
prove it.

### Implementation Slices

1. Record the native contract.
   Inspect the exact Sagelite/Sage sources that are bundled into the current
   resource tree and write down every cypari2 method called by
   `factor_using_pari`. Use that trace to keep the port from expanding into
   unrelated PARI methods.

2. Promote debug/default handling before `Gen`.
   Add a Cython smoke proving `Pari().get_debug_level()` returns an integer,
   `set_debug_level(0)` round-trips through PARI's `debug` default, and a
   later `Pari()("13*17")` still works. This removes the current first
   blocker while keeping the test small.

3. Add integer `objtogen` and `Pari.__call__(int)`.
   Use PARI integer construction directly for machine-size values and a
   decimal-string path for arbitrary Python integers. The result must be a
   real `Gen`, not the current lightweight display-only value.

4. Establish conservative `Gen` ownership.
   The first implementation can copy returned `GEN` values into stable storage
   more aggressively than upstream cypari2 if that simplifies correctness.
   The invariant is that no Python `Gen` may reference PARI stack memory that
   can be invalidated by a later PARI call. Once that passes, optimize toward
   upstream's stack/clone strategy.

5. Implement `Gen.factor()` and factor-matrix readers.
   Start with integer inputs. Verify `factor(360)` first, then a larger
   integer. Add matrix indexing and `int(...)` conversion only as far as the
   Sage factorization path requires.

6. Replace placeholder `PariError`.
   Move from `RuntimeError`/`NotImplementedError` to real PARI error
   translation before marking the runtime as available. Repeated `1/0`
   followed by successful arithmetic must stay green.

7. Flip Sagelite expectations.
   Once cypari2 owns the real path, change Sagelite's smoke from expecting
   fail-closed PARI behavior to expecting real integer factorization through
   the Sage shell.

### Validation Ladder For This Target

Keep these tests in ascending order so failures stay local:

```python
from cypari2 import Pari

pari = Pari()
old_debug = pari.get_debug_level()
pari.set_debug_level(0)
assert pari.get_debug_level() == 0
pari.set_debug_level(old_debug)
assert str(pari("13*17")) == "221"
```

```python
from cypari2 import Pari

pari = Pari()
g = pari(360)
assert int(g) == 360
F = g.factor()
assert F.ncols() == 2
product = 1
for i in range(F.nrows()):
    product *= int(F[i, 0]) ** int(F[i, 1])
assert product == 360
```

```python
from cypari2 import Pari

pari = Pari()
n = 9349949894994
F = pari(n).factor()
product = 1
for i in range(F.nrows()):
    product *= int(F[i, 0]) ** int(F[i, 1])
assert product == n
```

Then verify the actual user surface:

```sage
from sage.all import factor, prod

n = 9349949894994
F = factor(n)
assert prod(p**e for p, e in F) == n
```

For day-to-day compile tests, keep `360` and one medium integer in the fast
smoke. The reported `9349949894994` case should remain a milestone smoke and
can move into a slower test group if the complete factorization is too slow
under Node.js/Electron.

### Risk Notes Specific To `Gen.factor`

- PARI factorization returns a matrix whose entries are owned by the returned
  `GEN`. Indexing must keep the parent object alive or clone referenced
  entries before returning child `Gen` objects.
- `factor_proven` is global PARI state. `Gen.factor(proof=...)` must restore
  the previous value even when PARI raises.
- `set_debug_level` and `factor_proven` updates are process-global. The first
  runtime can document single-process, single-thread expectations, but tests
  must still restore old state.
- A direct string call such as `Pari()("factor(n)")` is not enough validation.
  It bypasses Python integer conversion, `Gen.factor()`, matrix indexing, and
  Sage conversion, which are the parts that matter here.

## First Success Criteria

The first real runtime milestone is complete when all of these pass in one
reproducible target:

```sh
make -C sagemath/cypari2 test-wasi-sdk-standalone
make -C sagemath/sagelite test-wasi-sdk-standalone
```

with `sagemath/cypari2` proving:

```python
from cypari2 import Pari
from cypari2.handle_error import PariError

pari = Pari()
assert str(pari("2+3")) == "5"
assert str(pari("primepi(10^6)")) == "78498"
assert str(pari("factorback(factor(360))")) == "360"
assert "Mod" in str(pari("Mod(2,101)"))

try:
    pari("1/0")
except PariError as err:
    assert "impossible inverse" in str(err)
else:
    raise AssertionError("PARI division by zero did not raise PariError")

assert str(pari("13*17")) == "221"
```

and with a dependent Cython smoke proving that a third-party extension can
`cimport` cypari2 declarations and either receive or construct a PARI-backed
object without import-time type failures.

For Sagelite, the smoke should stop expecting `NotImplementedError` and should
instead run a small real PARI check under both the normal Node path and the
Electron-shaped resource path. It should also prove the Sage-facing integer
factorization path:

```sage
from sage.all import factor, prod

n = 9349949894994
F = factor(n)
assert prod(p**e for p, e in F) == n
```

## Non-Goals For The First Runtime Port

Do not let these expand the first real-cypari2 milestone:

- full cypari2 doctest success;
- full Sage doctest success;
- browser execution;
- threading;
- high-performance tuning;
- complete PARI data-package coverage beyond files needed by the first smoke;
- GAP, Singular, Maxima, ECL, or external command runtimes;
- interrupt UX parity with native Sage.

The first milestone is about safe, repeatable PARI calls and error recovery
inside Python side modules.

## Invariants

Keep these true while porting:

- The existing build-support include surface must keep working until the real
  runtime replaces it.
- Every runtime step must have a focused `sagemath/cypari2` smoke before it is
  used to change Sagelite.
- PARI errors must become Python exceptions, not WASM traps or process exits.
- After a caught PARI error, later PARI computations must still work.
- Side modules must retain the CoWasm extension contract:
  - `dylink.0` section;
  - imported memory;
  - expected `PyInit_*` exports;
  - no accidental `needed_dynlibs` records;
  - no unresolved host-library dependency outside the CoWasm runtime contract.
- Do not silently stub real PARI functionality once the package claims runtime
  support. Fail unsupported paths explicitly.

## Phase 0: Record The Runtime Boundary

Goal: make the current placeholder/runtime distinction mechanically obvious.

Actions:

1. Add a status marker to `sagemath/cypari2/dist/wasi-sdk` that says whether
   the package is `build-support-only` or `runtime`.
2. Keep `cypari2.BUILD_SUPPORT_ONLY = True` until real runtime smoke coverage
   passes.
3. Add a README section listing the exact runtime modules that are still
   placeholders.

Validation:

```sh
make -C sagemath/cypari2 test-wasi-sdk-standalone
PYTHONPATH=sagemath/cypari2/dist/wasi-sdk bin/python-wasm - <<'PY'
import cypari2
assert cypari2.BUILD_SUPPORT_ONLY is True
PY
```

Exit criteria:

- Future agents can tell immediately whether `cypari2` is still a build
  support package or a real runtime package.

## Phase 1: Prove CPython Side-Module plus libpari plus SJLJ

Goal: isolate the hardest ABI question before involving cypari2's Cython
object model.

Create a tiny CPython extension side module, for example
`cypari2._pari_runtime_probe`, built inside `sagemath/cypari2` and linked
directly against:

- `libpari.a`;
- `libgmp.a`;
- `libsetjmp`;
- `wasi-emulated-signal`;
- the CoWasm CPython extension ABI.

The probe should export Python functions like:

```python
eval_long("2+3") == 5
eval_string("factorback(factor(360))") == "360"
check_error_recovery() == "caught=e_INV recovered=221"
```

The implementation should call `pari_init`, `gp_read_str`, `itos`, PARI's
error-catching macros, and a second successful expression after the error.

Build notes:

- Start from the flags that make `sagemath/pari` pass today:
  - `-mllvm -wasm-enable-sjlj`
  - `-mllvm -wasm-use-legacy-eh=false`
  - `-lsetjmp`
  - `-lwasi-emulated-signal`
- Combine those with the existing side-module flags used by
  `sagemath/cypari2`:
  - `-fPIC`
  - `-shared`
  - `-nostdlib`
  - `-Wl,--allow-undefined`
  - `-Wl,--no-entry`
  - explicit `PyInit_*` export
- Audit the resulting `.so` before import.

Validation:

```sh
make -C sagemath/cypari2 test-wasi-sdk-standalone
PYTHONPATH=sagemath/cypari2/dist/wasi-sdk bin/python-wasm - <<'PY'
from cypari2 import _pari_runtime_probe as probe
assert probe.eval_long("2+3") == 5
assert probe.eval_long("primepi(10000)") == 1229
assert probe.check_error_recovery() == "caught=e_INV recovered=221"
assert probe.eval_long("13*17") == 221
PY
```

Exit criteria:

- PARI setjmp/longjmp works inside a CPython side module.
- The side module can recover from a PARI error and continue in the same
  Python process.
- Any failure is reduced to either a linker/runtime ABI issue or a PARI
  initialization issue, not cypari2 Cython complexity.

This is the most important gate. Do not start replacing cypari2 modules before
this is green.

## Phase 2: Prove A Minimal Cython PARI Side Module

Goal: add Cython to the proven CPython/libpari/SJLJ boundary without importing
the full cypari2 object graph.

Add a small generated `.pyx` probe in `sagemath/cypari2/src/test-wasi-sdk-standalone.sh`
that:

- `cimport`s from the generated `cypari2.paridecl`;
- calls `pari_init` if needed;
- evaluates `gp_read_str("2+3")`;
- converts the result with `itos`;
- catches `1/0` and then computes `13*17`.

Keep this as a probe module, not the public `cypari2` runtime.

Validation:

```python
from cypari2 import _pari_cython_probe as probe
assert probe.eval_long("2+3") == 5
assert probe.check_error_recovery() == "caught=e_INV recovered=221"
```

Exit criteria:

- Cython-generated code can call PARI through the generated `.pxd` surface.
- Cython-generated code does not change the working setjmp/longjmp behavior.

## Phase 3: Bring Up cypari2 Runtime Modules In Dependency Order

Goal: replace placeholders with the upstream cypari2 runtime modules in a
controlled order.

The upstream source already contains these Cython modules:

- `string_utils.pyx`
- `stack.pyx`
- `custom_block.pyx`
- `convert.pyx`
- `closure.pyx`
- `handle_error.pyx`
- `gen.pyx`
- `pari_instance.pyx`

Do not install all real modules at once and then debug from a broad import
failure. Build and import-audit them in dependency order.

Recommended order:

1. `string_utils`
2. `stack`
3. `handle_error`
4. `convert`
5. `gen`
6. `pari_instance`
7. `closure`
8. `custom_block`

If the real dependency order differs, update this plan with the observed
Cython/import dependency trace.

For each module:

1. Compile it as a WASI side module with the same SJLJ/link flags proven in
   Phase 1.
2. Audit side-module structure.
3. Import the module under `python-wasm`.
4. Add one behavioral assertion if the module has public behavior.
5. Only then install it into `dist/wasi-sdk/cypari2`.

Exit criteria:

- `from cypari2 import Pari` imports the real upstream-backed modules.
- `Pari()` constructs a runtime object without using the placeholder
  `_missing_runtime` path.

## Phase 4: Make Error Translation Correct

Goal: ensure PARI errors become Python `PariError` instances and do not poison
the PARI stack or the Python process.

Required checks:

```python
from cypari2 import Pari
from cypari2.handle_error import PariError

pari = Pari()

for _ in range(10):
    try:
        pari("1/0")
    except PariError as err:
        assert "impossible inverse" in str(err)
    else:
        raise AssertionError("missing PariError")
    assert str(pari("13*17")) == "221"
```

Add separate checks for:

- syntax error recovery;
- user error recovery, such as `error("test")`;
- stack overflow or stack resize behavior if it can be made deterministic;
- repeated construction and deletion of `Pari()` objects;
- multiple `Pari()` instances in the same Python process.

Exit criteria:

- No caught PARI error leaves `avma`, the PARI error state, or Python's
  exception state corrupted.
- Repeated error/recovery loops do not leak enough memory to break a short
  smoke.

## Phase 5: Validate GEN Ownership And Conversion Semantics

Goal: prove that `Gen` objects are safe enough for Sagelite's first PARI-backed
paths.

Start with small exact values:

```python
pari = Pari()
a = pari("2")
b = pari("3")
assert str(a + b) == "5"
assert str(pari("[1,2,3]")[1]) == "2"
assert str(pari("factor(360)")) != ""
assert str(pari("factorback(factor(360))")) == "360"
```

Then add stack/heap lifetime checks:

- hold a `Gen` after a later PARI call;
- hold components returned by indexing;
- force enough allocations to trigger cypari2 stack movement;
- delete many `Gen` objects and run another PARI expression;
- convert Python `int`, `str`, list, and rational-like values.

Exit criteria:

- Basic `Gen` arithmetic, indexing, string conversion, and lifetime behavior
  work in one Python process.
- Failures become Python exceptions, not traps.

## Phase 6: Clarify cysignals And Interrupt Semantics

Goal: avoid confusing PARI error recovery with user interrupt support.

cypari2 uses cysignals APIs around PARI calls. The first runtime milestone
only needs safe error recovery. It does not need native Sage-quality interrupt
behavior.

Actions:

1. Identify which cysignals functions are actually reached by the first smoke:
   `sig_on`, `sig_off`, `sig_block`, `sig_unblock`, `sig_check`, and any
   alarm-related path.
2. Add a smoke that proves the reached functions are safe under Node.js.
3. Keep interrupt-heavy doctests disabled or explicitly marked follow-up until
   CoWasm's interrupt model is ready.

Exit criteria:

- cysignals calls used by normal PARI evaluation do not trap.
- Unsupported interrupt behavior is documented as a runtime gap, not hidden as
  a flaky failure.

## Phase 7: Flip Sagelite From Fail-Closed To Real PARI

Goal: make real PARI support visible at the Sagelite milestone level.

Change the Sagelite Node and Electron smokes from:

```python
try:
    pari("primepi(10^6)")
except NotImplementedError:
    pass
```

to:

```python
pari = Pari()
assert str(pari("primepi(10^6)")) == "78498"
assert str(pari("factorback(factor(360))")) == "360"
```

Then advance the Electron smoke contract and manifest schema.

Also review `sagemath/sagelite/src/patches/01-wasi-optional-host-libs.patch`
for PARI-specific lazy-load or fail-closed gates that can now be relaxed.
Keep gates for unrelated systems such as GAP or Singular.

Validation:

```sh
make -C sagemath/cypari2 test-wasi-sdk-standalone
make -C sagemath/sagelite test-wasi-sdk-standalone
make -C desktop/electron test-sagelite-manifest
```

Exit criteria:

- Sagelite's milestone smoke uses real PARI calls under both Node and
  Electron-shaped resource layouts.
- The Electron resource manifest includes any additional cypari2/PARI runtime
  files required by real execution.

## Phase 8: Package PARI Runtime Data Deliberately

Goal: keep data-file behavior explicit.

The first real cypari2 smoke should use only PARI functionality that does not
need large optional data packages. When a later Sagelite feature needs PARI
data, add it as a separate resource contract.

Track likely data follow-ups:

- `pari-elldata`
- `pari-galdata`
- `pari-galpol`
- `pari-nftables`
- `pari-seadata`
- `pari-seadata-small`

Exit criteria:

- The first runtime port does not accidentally depend on source-tree absolute
  paths.
- Any data dependency copied into Electron resources is listed in the manifest
  and covered by SHA-256.

## Phase 9: Broaden Mathematical Coverage

Only after the first real runtime smoke is green:

1. Add cypari2 method coverage:
   - `factor`
   - `znorder`
   - `polisirreducible`
   - `ellinit` and `ellcard`
   - matrices through `matid`
2. Add Sage PARI-backed paths:
   - integer factorization paths that use PARI;
   - algebraic number constructors that require PARI;
   - elliptic-curve helpers that are already dependency-ready.
3. Add failure tests for unsupported data or external systems.

Exit criteria:

- PARI-backed Sagelite functionality expands behind focused smokes instead of
  relying on broad `sage.all` import success.

## What Is Really Difficult

### setjmp/longjmp In Side Modules

PARI's standalone C smoke proves setjmp/longjmp in a normal WASI executable.
cypari2 must prove the harder case: setjmp/longjmp in a dynamically loaded
CPython side module. The generated side module may import exception tags or
setjmp helpers differently from a standalone executable. If this fails, debug
the minimal Phase 1 extension first.

### Longjmp Across Python And Cython Frames

PARI must not longjmp out past Python/Cython frames in a way that skips Python
exception cleanup. cypari2's error callbacks, cysignals, and stack reset logic
exist to translate that into Python exceptions. The port is only correct when
errors are caught repeatedly and later computations still work.

### PARI Global State

PARI has global stack and error state. Multiple `Pari()` objects, repeated
`pari_init`, `pari_close`, stack resizing, and Python object finalizers can
interact badly. Avoid claiming broad runtime support until the tests cover
same-process repetition.

### GEN Ownership

PARI objects may live on the PARI stack or heap. cypari2 moves objects when the
stack changes and clones objects for Python lifetime. Bugs here will show up
as use-after-free, stale strings, or traps after unrelated later PARI calls.

### cysignals Under WASI

cysignals was designed around native signal behavior. CoWasm can support the
subset needed for ordinary error recovery, but interrupt-heavy behavior needs
its own milestone.

### Electron Resource Completeness

Real cypari2 may need more files than the placeholder package. Any additional
`.so`, Python helper, PARI data file, or runtime library must be copied into
Electron resources and reflected in the manifest contract.

## Recommended Commit Sequence

Prefer small commits:

1. `sagemath/cypari2: mark build support runtime boundary`
2. `sagemath/cypari2: add libpari side-module probe`
3. `sagemath/cypari2: add cython pari probe`
4. `sagemath/cypari2: compile real handle_error module`
5. `sagemath/cypari2: compile real gen module`
6. `sagemath/cypari2: enable real Pari string calls`
7. `sagemath/cypari2: test pari error recovery`
8. `sagelite: use real cypari2 PARI smoke`
9. `desktop/electron: require real cypari2 runtime resources`

Each commit should include a targeted validation command in the commit body if
the result is important long-term.

## Stop Conditions

Stop and write down the blocker if any of these occur:

- Phase 1 side-module probe cannot link with SJLJ flags.
- Phase 1 imports but traps on a caught PARI error.
- A caught PARI error prevents a later `13*17` computation.
- The real `Gen` module imports but corrupts later unrelated Python extension
  imports.
- Electron resources pass local Node tests only because they read from the
  source tree or absolute build paths.

In those cases, keep the current fail-closed `cypari2` behavior in Sagelite
until the reduced blocker is fixed.
