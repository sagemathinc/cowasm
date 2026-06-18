# Stein-Watkins Mini Database For SageMath

This package provides SageMath's optional `database_stein_watkins_mini`
elliptic-curve database for CoWasm.

It installs the compressed Stein-Watkins data files under
`dist/wasm/share/stein_watkins`, matching the `SAGE_SHARE/stein_watkins`
layout expected by Sage's `sage.databases.stein_watkins` module:

- `a.000.bz2` and `a.001.bz2`, all-conductor tables for the first two
  conductor ranges.
- `p.00.bz2`, the first prime-conductor table.

The package is data-only and is intended for Sage/Sagelite elliptic-curve
database lookups in the browser runtime.
