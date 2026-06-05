# Matplotlib Reconnaissance

Date: 2026-06-05

This is a reconnaissance note, not a port.  The immediate goal is to identify
the smallest useful CoWasm matplotlib target and the build blockers before
spending porting time.

## Current CoWasm Package

`python/py-matplotlib` is intentionally disabled:

- package version: `3.6.2`
- source: upstream matplotlib release tarball
- current `all` target does nothing
- current `test` target prints `matplotlib not done at all` and exits false
- current install rule runs `pnpm-exec cpython setup.py build` with an empty
  `PYTHONPATH`

Running the existing install rule as a probe reaches setuptools dependency
resolution and then tries to build `numpy>=1.19` from PyPI inside the wasm
Python.  That recurses into PEP 517 build dependencies such as `ninja`,
`cmake`, and `setuptools-scm`.

The first fix is therefore not freetype or rendering.  The matplotlib build
must use the existing CoWasm `@cowasm/py-numpy`, `@cowasm/py-pip`, and related
package outputs, following the same pattern as `python/py-pandas`.

## Pyodide Reference

The local `/home/user/pyodide` checkout is useful for lock metadata and docs,
but current package recipes live in the separate `pyodide/pyodide-recipes`
repository.  The reference inspected for this note was a shallow clone of that
repo in `/tmp/pyodide-recipes`.

Current Pyodide recipes build matplotlib `3.10.8`.  The Pyodide lock metadata
in `/home/user/pyodide` also records matplotlib `3.8.4` in the 0.28 test lock.

Pyodide's matplotlib runtime dependencies are:

- `contourpy`
- `cycler`
- `fonttools`
- `kiwisolver`
- `numpy`
- `packaging`
- `Pillow`
- `pyparsing`
- `python-dateutil`
- `pytz`

CoWasm already has working `numpy`, and `python/py-pandas` already bundles
`dateutil`, `pytz`, and `six` into its wasm package output.  That reduces the
first dependency gap.

Pyodide's matplotlib recipe patches are:

- disable a `threading.Timer` warning path in font cache construction;
- hardcode the font cache path to `matplotlib/fontlist.json`;
- add a browser `webagg` backend that talks to Pyodide JS APIs;
- fix a 32-bit cast in the Agg wrapper;
- use Emscripten system freetype instead of bundled freetype.

Only some of those belong in CoWasm's first pass.  The browser `webagg` backend
is useful later, but it depends on Pyodide-specific JS APIs.  The font cache,
freetype, and 32-bit Agg fixes are the more relevant wasm build lessons.

## Native Library Shape

CoWasm already has `core/libpng`, built for wasm against `core/zlib`.

CoWasm does not currently appear to have a freetype package.  Pyodide relies on
Emscripten's freetype port and links matplotlib with a legacysjlj freetype
variant.  `/home/user/emscripten/tools/ports/freetype.py` is a concise source
for a freetype build recipe: it builds freetype from source against zlib,
installs headers under `freetype2`, and emits pkg-config metadata.

For CoWasm, a new `core/freetype` package is likely needed before real
matplotlib rendering works.  This should be modeled after existing CoWasm core
libraries, not imported wholesale from Emscripten.

Matplotlib `3.6.2` uses the older `setup.py` and `setupext.py` build path.  It
can be configured with `mplsetup.cfg`:

- `backend = Agg`
- `system_freetype = True`
- optionally `system_qhull = True`
- `enable_lto = False` for faster/debuggable builds

It also bundles AGG and Qhull sources.  Leaving bundled Qhull enabled may be
reasonable for the first pass; using system freetype looks more important.

## Recommended First Target

Do not start with interactive browser plotting.

The first supported target should be headless plotting:

```python
import matplotlib
matplotlib.use("Agg")
from matplotlib import pyplot as plt

plt.plot([1, 2, 3])
plt.savefig("/tmp/cowasm-matplotlib-smoke.png")
```

A second smoke should save SVG:

```python
import io
import matplotlib
matplotlib.use("svg")
from matplotlib import pyplot as plt

plt.plot([1, 2, 3])
out = io.BytesIO()
plt.savefig(out, format="svg")
assert out.getvalue().startswith(b"<?xml")
```

This is enough for many class/notebook workflows because CoCalc can display a
generated image file or inline SVG without requiring matplotlib to own browser
events.

## Suggested Work Order

1. Fix `python/py-matplotlib` so it builds against existing CoWasm packages
   instead of trying to install `numpy` from PyPI inside wasm.
2. Add/package pure-Python wheel dependencies that should be straightforward:
   `packaging`, `pyparsing`, `cycler`, and `fonttools`.
3. Reuse or split out `dateutil`, `pytz`, and `six` from the pandas package
   output so matplotlib does not depend on importing pandas just to get them.
4. Try `kiwisolver` as the first compiled dependency.  It is small and mostly
   C++.
5. Try `contourpy` next.  It depends on NumPy and C++ extension builds.
6. Add `core/freetype`, using the Emscripten freetype port as a reference but
   matching CoWasm's package layout and Zig/WASI toolchain.
7. Link matplotlib against CoWasm `core/freetype`, `core/libpng`, and
   `core/zlib`; set `backend = Agg` and hardcode font cache behavior.
8. Defer `Pillow` until after basic PNG/SVG matplotlib output works.  Pillow is
   valuable, but Pyodide's recipe brings in more image libraries and can become
   its own porting project.
9. Defer browser `webagg` until headless `Agg` and SVG savefig are green in
   Node and in the browser smoke harness.

## Open Questions

- Should CoWasm keep matplotlib at `3.6.2` until it works, then upgrade, or
  jump closer to Pyodide's current recipe?  The conservative answer is to make
  `3.6.2` work first because it matches the existing CPython `3.11.2` era and
  setup.py build patterns already used in this repo.
- Should `dateutil`, `pytz`, and `six` become separate `python/py-*` packages?
  Probably yes, because matplotlib and pandas both need them.
- Should the first image smoke require PNG bytes, or is SVG enough?  SVG is
  useful but does not prove the Agg renderer and freetype path.  The better
  first supported target is both SVG and PNG.
