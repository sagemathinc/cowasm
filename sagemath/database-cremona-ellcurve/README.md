# Cremona Elliptic-Curve Database For SageMath

This package provides SageMath's optional `database_cremona_ellcurve`
database for CoWasm.

It installs John Cremona's SQLite elliptic-curve database at
`dist/wasm/share/cremona/cremona.db`, matching the `SAGE_SHARE/cremona`
layout expected by Sage's elliptic-curve database code.

The package is data-only and is intended for Sage/Sagelite elliptic-curve
lookups in the browser runtime.
