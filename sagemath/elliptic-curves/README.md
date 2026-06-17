# @cowasm/elliptic-curves

SageMath elliptic-curve database package for CoWasm.

This installs the Sage `elliptic_curves` data package into
`dist/wasm/share/elliptic_curves`:

- `common/allcurves.00000-09999`, a small Cremona database subset up to
  conductor 9999.
- `ellcurves/rank*`, William Stein's database of interesting elliptic curves.

The package is data-only and is intended for Sage/Sagelite elliptic-curve
lookups in the browser runtime.
