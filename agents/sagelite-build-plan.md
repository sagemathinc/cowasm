# Sagelite Build And Import Plan

This plan gets CoWasm from the current state to a WASI build of
`/home/user/sagelite` that installs, imports, and supports basic Sage-style
exact mathematics under Node.js. It deliberately stops before the much larger
goal of passing the full Sagelite/Sage test suite, and it treats browser
support as a later runtime milestone.

The target milestone is:

```text
python-wasm under Node.js can import sagelite-built modules and run a small
exact-math smoke.
```

That means build failures, import crashes, missing mandatory Cython bindings,
and broken core arithmetic are blockers. Optional runtime packages such as
SciPy, plotting helpers, notebook widgets, documentation tooling, and external
viewer/runtime packages are not first-build blockers unless they are imported
unconditionally during `import sage` or `import sage.all`.

## Ground Truth Snapshot

Snapshot source:

- Sagelite checkout: `/home/user/sagelite`
- Sagelite commit: `875c1cc836d`
- Main metadata: `/home/user/sagelite/pyproject.toml`
- Main build files:
  - `/home/user/sagelite/meson.build`
  - `/home/user/sagelite/src/meson.build`
  - `/home/user/sagelite/src/sage/meson.build`
- CoWasm Sage package tree: `/home/user/cowasm/sagemath`

Current Sagelite metadata:

- Python requirement: `>=3.12, <3.15`
- Build backend: `mesonpy`
- Direct runtime dependencies: 85
- Direct `sagelite-*` companion/runtime dependencies: 35
- Direct non-`sagelite-*` Python dependencies: 50
- Build-system requirements: `cypari2`, `meson-python`, `cysignals`,
  `cython`, `gmpy2`, `jinja2`, `memory_allocator`, `numpy`
- Cython-related files under `/home/user/sagelite/src`: about 520

Current CoWasm state:

- Python 3.14.6 is the active Python target and is within Sagelite's supported
  version range.
- `python/py-cython` exists.
- `python/py-platformdirs` exists and is wired into the Sagelite Node.js import
  ladder for `sage.env`.
- WASI side-module extension import infrastructure exists.
- Sage-style Cython extension smokes already exist for:
  - `sagemath/cysignals`
  - `sagemath/memory-allocator`
  - `sagemath/lrcalc-python`
  - `sagemath/primecountpy`
  - `sagemath/pycosat`
  - `sagemath/pplpy`, but only for a narrow API subset
- `/home/user/cowasm/sagemath` contains 94 package directories.

## Success Criteria

The first successful Sagelite milestone is the Node.js/Electron milestone. It
is complete when all of the following are true in one reproducible target:

1. A CoWasm package target, probably `sagemath/sagelite`, configures and builds
   Sagelite against the CoWasm Python 3.14 WASI SDK runtime.
2. Sagelite's generated extension modules are WASI side modules with:
   - a `dylink.0` section;
   - imported memory;
   - expected `PyInit_*` exports;
   - no accidental dependency on unavailable host shared libraries.
3. The built tree installs into a CoWasm package-local site-packages layout.
4. `python-wasm` can run under Node.js:

   ```sh
   python-wasm -c "import sage"
   python-wasm -c "import sage.all"
   ```

5. A small exact-math smoke passes under `python-wasm`, for example:

   ```python
   from sage.all import ZZ, QQ, PolynomialRing, factor, prime_pi

   assert ZZ(2) + ZZ(3) == 5
   assert QQ(6, 15) == QQ(2, 5)
   R = PolynomialRing(QQ, "x")
   x = R.gen()
   assert (x + 1) * (x - 1) == x**2 - 1
   assert factor(2**31 - 1) is not None
   assert prime_pi(10**6) == 78498
   ```

6. The plan records remaining crashes and missing optional functionality as
   follow-up issues instead of letting them blur the first-build milestone.

For this milestone, "works" means the Node.js runtime path works. That is the
path needed for server-side use and for an Electron app, including Electron on
Windows. Browser execution is intentionally deferred.

## Current Validation Snapshot

Snapshot source:

- Date: 2026-06-19
- Command: `make -C sagemath/sagelite test-wasi-sdk-standalone`
- Result: pass
- Final marker:
  `sagelite-ok meson configure compile install node import electron resources smoke relocated no followups`

This target now completes the Node.js/Electron milestone path end to end:

- configures Sagelite with Meson against the CoWasm Python 3.14 WASI SDK
  runtime and package-local compiler wrappers;
- compiles and installs the generated Sagelite WASI side modules;
- audits installed Sage side modules for `dylink.0`, imported memory,
  `PyInit_*` exports, and accidental `needed_dynlibs` records;
- runs Node.js `python-wasm` imports for `sage`, `sage.env`,
  `sage.structure.element`, and `sage.all`;
- passes exact arithmetic, linear algebra, modular arithmetic, and FLINT
  fail-closed runtime smokes under Node.js;
- stages `dist/wasi-sdk/electron-resources`, writes the Electron resource
  manifest, validates the copied side-module inventory and required-resource
  SHA-256 digests, and passes both staged and relocated Electron-shaped
  resource smokes.

The build produced 471 installed Sagelite side modules and 515 Electron
resource side modules in the validation run. The Electron smoke still emits
Sagelite lazy-import warnings about `at_startup=True`; those warnings did not
block the milestone and should be tracked separately only if they become noisy
for users.

Follow-up snapshot:

- Date: 2026-06-20
- Change: schema 6 Electron resource manifests add `requiredResourceSha256`.
  Sagelite now hashes every required resource file when staging
  `electron-resources`, and the Electron runtime/Forge validators reject
  corrupted, stale, or key-mismatched required resources before launching the
  worker.
- Change: schema 6 manifests now require a non-empty `requiredResourcePaths`
  array and a matching `requiredResourceSha256` object. This keeps Electron
  bundles from silently accepting a digest-less manifest that claims the current
  Sagelite resource contract.
- Change: schema 6 manifest validation now requires `nativeLibraryPaths` to
  match the current Sagelite Electron runtime-library contract exactly and to
  remain covered by `sideModulePaths`, so bundles with stale or unexpected
  native `.so` resources fail before worker startup.
- Change: schema 7 manifest validation now also requires every
  `nativeLibraryPaths` entry to appear in `requiredResourcePaths`, giving the
  Electron validators SHA-256 coverage for the `libcxx.so` runtime libraries
  that the Sagelite worker depends on.
- Change: schema 8 manifest validation makes `nativeLibraryPaths` and
  `sideModulePaths` mandatory instead of optional. This prevents current-schema
  Electron bundles from omitting the runtime-library contract or the complete
  copied `.so` inventory while still passing startup validation.
- Change: schema 9 manifests advance the smoke contract to
  `exact-arithmetic-matrix-cypari2-failclosed-v3`. The Node.js and
  Electron-shaped smokes now import `cypari2`, instantiate `Pari`, and assert
  that PARI calls fail closed with the expected CoWasm WASI
  `NotImplementedError` until the compiled PARI runtime is ported.
- Change: the Electron runtime now passes the resolved Sagelite resource root
  into the Python worker as `COWASM_SAGELITE_RESOURCE_ROOT`, and the staged and
  relocated Electron smoke asserts that the variable matches the active
  resource working directory.
- Change: the Electron Forge after-copy resource normalizer now rejects
  staging trees with multiple copied Sagelite resource candidates before
  renaming or validating them. This prevents Darwin-style staging layouts from
  silently choosing one copied resource tree when both the generic `resources`
  parent and an `.app/Contents/Resources` parent contain Sagelite resources.
- Change: schema 10 manifest validation now requires the packaged Electron
  smoke tools, `sagelite-manifest-common.cjs` and
  `sagelite-electron-smoke.cjs`, to be listed in `requiredResourcePaths` and
  covered by `requiredResourceSha256`. This catches resource bundles that can
  validate core Sagelite files but cannot run the packaged smoke from the
  copied bundle root.
- Change: schema 11 manifest validation now also requires
  `site-packages/sage/all.py` and `python.wasm` to be listed in
  `requiredResourcePaths` and covered by `requiredResourceSha256`. This makes
  the Sage entrypoint and packaged Python runtime explicit mandatory resources,
  instead of relying on later worker startup failures to catch stale bundles.
- Change: schema 12 manifest validation closes the manifest object over the
  supported field set. Unknown keys now fail during Sagelite resource staging,
  Electron Forge packaging validation, and Electron runtime discovery instead
  of being silently ignored.
- Change: schema 13 manifest validation now requires `site-packages/sage/env.py`
  to be listed in `requiredResourcePaths` and covered by
  `requiredResourceSha256`. This makes the Sage environment module explicit in
  the Electron resource contract instead of relying on a later `sage.env`
  import failure to catch incomplete bundles.
- Change: schema 14 manifest validation now requires the core exact-arithmetic
  and matrix startup resources used by the `sage.all` Electron smoke to be
  listed in `requiredResourcePaths` and covered by `requiredResourceSha256`.
  This catches incomplete packaged bundles before worker launch when they are
  missing the initial Sage element, integer, rational, modular, polynomial, or
  matrix modules.
- Change: schema 15 manifest validation now also requires the smoke's
  dependency-side resources, including `cypari2`, `primecountpy`, `cysignals`,
  `memory_allocator`, `gmpy2`, NumPy core startup files, and the initialized
  FLINT `fmpz_poly_sage` helper, to be listed in `requiredResourcePaths` and
  covered by `requiredResourceSha256`. This makes the shared Electron
  validator enforce the same smoke-resource contract that the Sagelite staging
  target already writes.
- Change: schema 16 manifest validation now also requires marker files for the
  pure-Python runtime dependency roots used on the packaged Electron
  `PYTHONPATH`: Jinja2, MarkupSafe, platformdirs, and Cython. This catches
  copied dependency directories that exist but are empty or stale before the
  worker reaches `sage.all` startup.
- Change: schema 17 manifest validation now requires the three WASI FLINT
  polynomial placeholder modules to be listed in `requiredResourcePaths` and
  covered by `requiredResourceSha256`. This keeps the packaged Electron smoke's
  fail-closed FLINT import checks from depending on unverified copied files.
- Change: schema 18 manifest validation now also requires the pure-Python
  exact-arithmetic startup modules behind `QQ`, `Integers`, and `GF` to be
  listed in `requiredResourcePaths` and covered by `requiredResourceSha256`.
  This catches bundles missing rational-field, modular-ring, or prime
  finite-field constructors before the Electron worker starts.

## Runtime Milestones

### Milestone 1: Node.js And Electron

This is the primary target.

The runtime assumptions for the first milestone are:

- JavaScript host: Node.js, including the Node runtime embedded in Electron.
- Filesystem: Node-backed filesystem semantics, not browser IndexedDB or OPFS.
- WASI execution: the existing CoWasm Node runtime path used by `python-wasm`.
- Dynamic modules: CPython side modules load through the CoWasm loader in the
  Node runtime.
- Packaging: assets may be copied into an Electron application bundle later,
  but the first gate can run from the normal CoWasm workspace layout.

Node/Electron-specific validation should include:

```sh
python-wasm -c "import sage"
python-wasm -c "import sage.all"
python-wasm -c "from sage.all import ZZ, QQ; print(ZZ(2) + QQ(1, 3))"
```

Later, once the workspace target works, add an Electron-shaped smoke:

- run from a packaged asset directory instead of the source tree;
- verify dynamic side modules and data files load through relative bundled
  paths;
- verify Windows path handling with drive letters and backslashes where the
  host Node runtime exposes them;
- verify no build-time absolute paths are required at runtime.

### Milestone 2: Browser

Browser support is a separate project after the Node/Electron milestone.

Browser-specific issues should not block the first Sagelite build/import unless
they expose a bug in the shared side-module ABI. Browser work will need its own
plan for:

- asset packaging and lazy loading;
- filesystem persistence;
- side-module and data-file fetch behavior;
- interrupt behavior in workers;
- memory pressure and startup latency;
- browser-compatible subprocess substitutes for features that expect external
  command-line tools.

## Non-Goals For The First Milestone

These should not block the first successful build/import milestone:

- Full Sagelite or Sage doctest success.
- Full `sage.all` feature parity.
- SciPy-backed numerical code paths.
- Plotting, notebook widgets, Jupyter integration, MathJax, D3, Three.js,
  Graphviz, PDF/PNG conversion, or Poppler.
- GAP, Singular, Maxima, FriCAS, ECL, and other large external systems unless
  current Sagelite imports hard-require them.
- Runtime packages that Sagelite declares for broad wheel convenience but that
  can be lazy-imported or feature-gated.

The first milestone should keep those dependencies absent, stubbed, or
feature-disabled until an import trace proves they are mandatory.

## Blocker Classification

### Hard Build Blockers

These must work before the first realistic Sagelite build:

- Python 3.14 target runtime and headers.
- Cython under the CoWasm Python environment.
- `meson-python` and `meson` orchestration in a form that can drive CoWasm
  cross compilation.
- `jinja2`, because Sagelite's build-system requirements include it.
- `numpy` with headers available to Meson/Cython.
- `cysignals`, including its `.pxd` files.
- `gmpy2`, including headers and C API capsule support.
- `memory_allocator`, including its `.pxd` files.
- `cypari2`, including importable Python module, `.pxd` files, and a linkable
  PARI dependency.
- Meson dependency discovery for required native libraries.

`cypari2` is the highest-value current hard blocker. PARI itself exists in
CoWasm, but Sagelite's build imports `cypari2`, adds cypari2's Cython include
path, and links Sage modules against `libpari`.

### Hard Native Library Surface

Sagelite's Meson files currently probe or require these libraries. The first
build should either provide them with pkg-config/cross-file entries or make
their Sagelite modules explicitly optional on WASI.

Already present in CoWasm and should be wired into Meson first:

- `gmp`
- `gmpxx`
- `mpfr`
- `mpc`
- `mpfi`
- `flint`
- `pari`
- `gsl`
- `zlib`
- `libpng`
- `m4ri`
- `m4rie`
- `eclib`
- `ecm`
- `fflas-ffpack`
- `givaro`
- `linbox`
- `ntl`
- `iml`
- `bliss`
- `cliquer`
- `mcqd`
- `planarity`
- `sirocco`
- `libbraiding`
- `libhomfly`
- `gc`
- `coxeter3`
- `brial`
- `tdlib`
- `rw`
- `meataxe`

Likely missing or not first-build blockers; gate these on WASI instead of
forcing them into the initial build:

- `gap` / `libgap`
- `Singular`
- `gdlib`
- `openmp`
- `ecl`
- `maxima`
- large external command runtimes such as Graphviz, Poppler, pdf2svg, MathJax,
  D3, Three.js, Tides, Latte, and Flatter

### Runtime Dependencies That Are Not Build Blockers

These appear in Sagelite's runtime dependencies but should not block the first
build if they can be absent until a specific code path imports them:

- `scipy`
- `cvxopt`
- `dot2tex`
- `imageio-ffmpeg`
- `igraph`
- `ipykernel`
- `ipython`
- `ipywidgets`
- `jupyter-client`
- `jupyter-jsmol`
- `khoca`
- `Mathics3` on Python versions where it applies
- `pexpect`
- `phitigra`
- `pillow`
- `platformdirs`
- `pypandoc-binary`
- `regina`
- `pytest`
- `requests`
- `sphinx`
- `sphinx-copybutton`
- `symengine`
- `pkgconfig`
- `traitlets`

For the first milestone, build Sagelite with `--no-deps` style semantics and
install only the dependencies needed to build and import the chosen smoke path.

## Phase 0: Create A Reproducible Status Target

Goal: make the current dependency state machine-checkable so future agents do
not re-audit it manually.

Actions:

1. Add a script or make target that reads `/home/user/sagelite/pyproject.toml`
   and reports:
   - build-system requirements;
   - direct runtime requirements;
   - direct `sagelite-*` companion requirements;
   - local CoWasm coverage.
2. Normalize names such as:
   - `memory_allocator` -> `sagemath/memory-allocator`
   - `lrcalc` -> `sagemath/lrcalc-python`
   - `sagelite-mwrank-runtime` -> `sagemath/eclib` command-line/runtime gap
   - `sagelite-pari-data` -> `pari-*` data package bundle
   - `sagelite-database-polytopes` -> `sagemath/polytopes-db`
3. Commit the script or status document only if it will be maintained. If not,
   keep this plan as the source of truth and update it after major milestones.

Validation:

```sh
python3 <status-script>
git diff --check
```

Exit criteria:

- There is an agreed list of hard blockers versus runtime-only deps.
- `cypari2`, `meson-python`, `jinja2`, and Sagelite Meson integration are
  identified as first-order blockers.

## Phase 1: Define The CoWasm Sagelite Package Boundary

Goal: add a controlled CoWasm package target for Sagelite instead of attempting
an opaque stock `pip install sagelite`.

Preferred shape:

```text
sagemath/sagelite/
  Makefile
  package.json
  README.md
  src/test-wasi-sdk-standalone.sh
```

The package should:

- use `/home/user/sagelite` as the source checkout during local development;
- later allow a tarball or pinned commit source;
- build into `sagemath/sagelite/dist/wasi-sdk`;
- stage dependencies from sibling CoWasm package `dist/wasi-sdk` directories;
- set `PYTHONPATH`, `PKG_CONFIG_PATH`, compiler wrappers, and Meson cross
  inputs explicitly;
- disable build isolation;
- avoid automatically installing all runtime dependencies.

Do not initially rely on `pip install .` as the only build driver. A direct
`meson setup`, `meson compile`, `meson install` path will be easier to debug.
Once the controlled Meson build works, wrap it in `pip`/`mesonpy` behavior if
needed.

Validation:

```sh
make -C sagemath/sagelite test-wasi-sdk-standalone
```

Early expected result:

- This should fail at the first missing build blocker. Capture the exact
  failure in the package README and then eliminate blockers one at a time.

Exit criteria:

- A repeatable target reaches Meson configure with the CoWasm Python, compiler,
  and dependency paths selected intentionally.

## Phase 2: Make Build-System Python Dependencies Available

Goal: satisfy Sagelite's build-system requirements under the CoWasm Python
environment.

Already present and should be validated together:

- `cython`
- `cysignals`
- `gmpy2`
- `memory_allocator`
- `numpy`

Need to add or package:

- `meson`
- `meson-python`
- `jinja2`

Approach:

1. Add pure-Python package targets for `meson`, `meson-python`, and `jinja2`
   if they are not already usable through `python-wasm -m pip`.
2. Prefer packaging them as `.tar.xz` bundles in the same style as existing
   pure-Python packages.
3. Validate both host-side build-driver use and target-side import use. Meson
   itself may run on the host, but Sagelite's Meson scripts call Python to
   import modules such as `numpy`, `cysignals`, `gmpy2`, and `cypari2`. The
   plan must make clear which Python is executing each probe.

Validation:

```sh
python-wasm -c "import Cython, numpy, cysignals, gmpy2, memory_allocator"
python-wasm -c "import mesonbuild, mesonpy, jinja2"
```

Exit criteria:

- All non-`cypari2` build-system Python dependencies import under the selected
  Python environment.
- Their include paths and `.pxd` files are discoverable from Meson/Cython.

## Phase 3: Port `cypari2`

Goal: provide the mandatory Sagelite PARI Python/Cython binding.

Why this is a blocker:

- Sagelite lists `cypari2` in `build-system.requires`.
- Sagelite's `src/meson.build` imports `cypari2`.
- It adds cypari2's Cython include path to the project.
- It builds Sage modules against PARI through that dependency.

Prerequisites:

- `sagemath/pari` WASI SDK static library and headers.
- `sagemath/gmp` WASI SDK static library and headers.
- CPython 3.14 WASI SDK extension imports.
- Cython side-module build path.
- setjmp/longjmp behavior understood enough for PARI error recovery in an
  extension-module context.

Implementation steps:

1. Create `sagemath/cypari2`.
2. Build the upstream Cython extension as a CPython 3.14 WASI side module.
3. Install:
   - importable `cypari2` Python package;
   - generated `.so` extension modules;
   - cypari2 `.pxd` files;
   - headers or metadata needed by downstream Cython modules.
4. Link against the CoWasm PARI and GMP archives.
5. Keep side-module exception and setjmp behavior explicit. PARI uses error
   recovery heavily; a module that imports but traps on PARI errors is not
   sufficient for Sagelite.

Smoke tests:

```python
from cypari2 import pari

assert str(pari("2+3")) == "5"
assert "Mat" in str(pari("matid(2)").type())
assert str(pari("factor(2^31-1)")) != ""

try:
    pari("1/0")
except Exception:
    pass

assert str(pari("2+2")) == "4"
```

Add a dependent Cython smoke:

- write a tiny `.pyx` that cimports a cypari2 `.pxd`;
- build it as a WASI side module;
- import it under `python-wasm`;
- call a function that constructs or receives a PARI object.

Exit criteria:

- `python-wasm -c "import cypari2; from cypari2 import pari; print(pari('2+3'))"`
  works.
- A dependent Cython module can cimport cypari2.
- PARI error recovery does not poison later computations.

## Phase 4: Wire Native Libraries Into Meson

Goal: make Sagelite's Meson dependency detection see the CoWasm libraries.

Actions:

1. Ensure each CoWasm library needed by Sagelite installs either:
   - a valid `.pc` file under `dist/wasi-sdk/lib/pkgconfig`; or
   - a Meson cross/native file entry; or
   - a known `-I`, `-L`, and `-l` override in the Sagelite package build.
2. Start with libraries that Sagelite's top-level `src/meson.build` probes:
   - `gmp`, `gmpxx`, `mpfr`, `mpc`, `mpfi`
   - `flint`
   - `pari`
   - `gsl` and CBLAS
   - `zlib`, `libpng`
   - `m4ri`, `m4rie`
   - `eclib`, `ecm`
   - `fflas-ffpack`, `givaro`, `linbox`, `ntl`
   - `iml`
   - graph libraries from `sage/graphs/meson.build`
   - optional libraries from `sage/libs/meson.build`
3. For each dependency, add a small Meson or compiler smoke before attempting
   the full Sagelite build. Prefer mathematical behavior over link-only tests.

Representative smokes:

- GMP/MPFR/MPC: integer, rational, real, complex arithmetic.
- PARI: `factor(2^31-1)` and error recovery.
- FLINT: integer polynomial multiplication and factorization.
- NTL: exact integer polynomial arithmetic.
- GSL/CBLAS: matrix-vector product and a special function.
- LinBox/FFLAS/Givaro: finite-field matrix multiply and rank.
- eclib: elliptic curve conductor and point arithmetic.
- M4RI/M4RIE: binary/extension-field matrix operations.

Exit criteria:

- Sagelite Meson configure can find the provided native libraries without
  falling back to host paths.
- Missing host-only libraries fail as disabled optional features, not as
  configure aborts.

## Phase 5: Make Sagelite Meson WASI-Aware

Goal: prevent Sagelite from treating every non-Windows system as a full POSIX
system with GAP, Singular, GD, ECL, Maxima, and external commands.

Current issue:

- Several checks use `required: not is_windows`.
- WASI is not Windows, but it also is not a full POSIX host.
- Without a WASI platform gate, Meson will turn many optional mathematical and
  external-system features into hard build requirements.

Implementation options:

1. Preferred upstreamable shape:
   - define `is_wasi = host_machine.system() == 'wasi'` or equivalent;
   - replace inappropriate `required: not is_windows` with
     `required: not is_windows and not is_wasi` where the feature can be absent;
   - keep true core dependencies required.
2. CoWasm-local first-build shape:
   - patch the Sagelite checkout during `sagemath/sagelite` build;
   - pass Meson options that disable optional feature groups;
   - document every disabled feature.

Do not silently stub libraries that Sage core assumes are present. If a module
needs a missing library, either:

- disable that module explicitly; or
- port the library and add a smoke test.

Initial candidates to gate off for first import:

- GAP and `libgap`
- Singular
- GD/image output
- ECL and Maxima
- OpenMP
- Graphviz-like command runtimes
- PDF/image conversion runtimes

Exit criteria:

- Meson configure distinguishes "not available on WASI yet" from "missing
  accidentally".
- The first Sagelite build does not require GAP or Singular unless we choose
  to port them before the first import milestone.

## Phase 6: Build A Minimal Sagelite Extension Set

Goal: build a reduced but coherent Sagelite extension set that supports import
and exact arithmetic.

Strategy:

1. Do not try to build all 520 Cython-related files on the first attempt.
2. Start with the core import chain:
   - `sage`
   - `sage.env`
   - `sage.structure`
   - `sage.rings.integer`
   - `sage.rings.rational`
   - `sage.rings.polynomial`
   - `sage.arith`
   - enough of `sage.all` to run exact-math smoke tests
3. Let import traces drive the next module batch.
4. When a missing module is optional, patch the import path to lazy-import or
   feature-gate it.
5. When a missing module is core, add the dependency and build it.

Useful first Cython module groups:

- `sage/cpython`
- `sage/ext`
- `sage/structure`
- `sage/categories`
- `sage/rings/integer*`
- `sage/rings/rational*`
- `sage/rings/polynomial` core pieces
- `sage/arith`
- `sage/libs/pari` once `cypari2` is working
- `sage/functions/prime_pi.pyx` after `primecountpy`

Node.js validation after each batch:

```sh
python-wasm -c "import sage.env"
python-wasm -c "import sage.structure.element"
python-wasm -c "from sage.rings.integer_ring import ZZ; print(ZZ(2)+ZZ(3))"
python-wasm -c "from sage.all import ZZ, QQ"
```

Exit criteria:

- A minimal extension set builds repeatedly.
- Import failures are ordinary Python exceptions with useful traces, not WASM
  traps or loader crashes.

## Phase 7: Full Sagelite Build Attempt

Goal: attempt the real Sagelite build after the minimal extension set and
mandatory bindings are ready.

Command shape should be captured in `sagemath/sagelite/src/test-wasi-sdk-standalone.sh`.
The exact command will evolve, but it should include:

- `COWASM_TOOLCHAIN=wasi-sdk`
- CoWasm `cowasm-cc`, `cowasm-c++`, `cowasm-ar`, `cowasm-ranlib`
- selected Python 3.14 WASI SDK config vars
- explicit `PYTHONPATH` for staged build-system packages
- explicit `PKG_CONFIG_PATH` for all staged native dependencies
- `--no-build-isolation` semantics
- `--no-deps` semantics
- Meson setup args:
  - `--default-library=static`
  - `-Dbuild-docs=false`
  - explicit disabled feature options for unavailable WASI systems

First full-build validation:

```sh
make -C sagemath/sagelite clean-wasi-sdk
make -C sagemath/sagelite test-wasi-sdk-standalone
```

If build fails:

1. Classify the failure:
   - missing Python build dependency;
   - missing native dependency;
   - wrong include/lib path;
   - Cython compile error;
   - linker side-module error;
   - runtime import trap;
   - optional dependency imported too early.
2. Add a focused package smoke or Sagelite import smoke for the failure before
   fixing broad code.
3. Keep commits small and package-prefixed.

Exit criteria:

- Sagelite installs into `sagemath/sagelite/dist/wasi-sdk`.
- Extension modules are present and have expected WASI side-module structure.

## Phase 8: Import And Basic Runtime Stabilization

Goal: turn a built tree into a usable import.

Node.js import ladder:

```sh
python-wasm -c "import sage"
python-wasm -c "import sage.env; print(sage.env.SAGE_VERSION)"
python-wasm -c "import sage.all"
python-wasm -c "from sage.all import ZZ, QQ, PolynomialRing"
python-wasm -c "from sage.all import factor, prime_pi"
```

Basic exact-math smoke:

```python
from sage.all import ZZ, QQ, PolynomialRing, factor, prime_pi

assert ZZ(2) + ZZ(3) == ZZ(5)
assert QQ(6, 15) == QQ(2, 5)
R = PolynomialRing(QQ, "x")
x = R.gen()
assert (x + 1) * (x - 1) == x**2 - 1
assert prime_pi(10**6) == 78498
assert factor(2**31 - 1) is not None
```

Expected failure classes after first import:

- unconditional imports of missing runtime extras;
- hard-coded POSIX filesystem assumptions;
- subprocess assumptions for command-line runtimes;
- signal/interrupt assumptions;
- dynamic-loader function-table signature mismatches;
- C++ exception or setjmp behavior in side modules;
- package data lookup paths under `SAGE_SHARE`.

Fix policy:

- If the failure is in an optional feature, make it lazy or feature-gated.
- If the failure is in core exact arithmetic, fix the dependency or runtime.
- If the failure is a WASM trap, reduce it to a package-level smoke before
  changing broad Sagelite code.

Exit criteria:

- `import sage.all` works.
- Basic exact arithmetic smoke passes.
- Remaining failures are documented as feature gaps or test failures.

## Phase 9: Post-Milestone Expansion

Only after build/import/basic exact math works:

1. Expand core algebra:
   - more polynomial arithmetic;
   - finite fields;
   - matrices;
   - FLINT-backed number theory;
   - PARI-backed algebraic number operations.
2. Expand graph features:
   - bliss;
   - cliquer;
   - nauty;
   - planarity;
   - graph databases.
3. Expand geometry/polyhedra:
   - fix `pplpy` function-table mismatch;
   - port `pynormaliz`;
   - add PALP/TOPCOM smoke integration.
4. Expand bindings:
   - `fpylll`;
   - `pynormaliz`;
   - possibly `symengine`.
5. Decide whether to port large systems:
   - Singular;
   - GAP/libgap;
   - Maxima/ECL;
   - SciPy.

## Recommended Work Order

Highest leverage sequence:

1. Add `sagemath/sagelite` package skeleton that reaches Meson configure.
2. Package `meson`, `meson-python`, and `jinja2` if needed.
3. Port `cypari2`.
4. Wire native library pkg-config/cross-file discovery for the libraries that
   already exist in CoWasm.
5. Make Sagelite Meson WASI-aware so missing optional systems do not block.
6. Build a minimal extension set.
7. Attempt full Sagelite build with `--no-deps` semantics.
8. Fix import chain until `import sage.all` works.
9. Add exact-math smoke and make it the package regression test.

## Commit And Validation Discipline

Use small commits with package/area prefixes:

- `python/py-jinja2: package jinja2 for sagelite builds`
- `python/py-meson: package meson for sagelite builds`
- `sagemath/cypari2: add WASI side-module smoke`
- `sagemath/sagelite: add Meson configure probe`
- `sagemath/sagelite: build core integer modules`

Every dependency port should include:

- a native or Python import smoke;
- a mathematical behavior check when applicable;
- a statement of what is intentionally unsupported.

Every Sagelite build commit should include:

- the exact configure/build command in a script or Makefile;
- one new import or build gate;
- no broad cleanup unrelated to the current failure.

## Current First-Build Risk Register

Known high risks:

- `cypari2` may expose PARI setjmp/longjmp issues in a Python side module.
- Meson may execute probes with the wrong Python interpreter unless the build
  target pins host versus target Python deliberately.
- `required: not is_windows` checks in Sagelite can turn optional POSIX
  systems into hard WASI failures.
- C++ side modules may hit function-table signature mismatches similar to the
  current `pplpy` gap.
- `SAGE_SHARE` data layout must be staged coherently from CoWasm data packages.
- Building hundreds of Cython modules may reveal missing CPython config vars or
  sysconfig assumptions not covered by current small extension smokes.

Risk controls:

- Keep `cypari2` as a standalone package with its own dependent Cython smoke.
- Add a tiny Meson/Cython fixture before building all of Sagelite.
- Add explicit WASI feature gates to Sagelite's Meson detection.
- Prefer side-module structure checks before runtime import checks.
- Use import-ladder tests after every meaningful build expansion.
