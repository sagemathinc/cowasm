# KnotInfo Database For SageMath

This package provides SageMath's `database_knotinfo` package for CoWasm. It
installs the KnotInfo and LinkInfo CSV tables together with the small Python
helper module used to read them.

The package is data-only and is intended for Sage/Sagelite knot-theory
functionality. CoWasm installs the module under `dist/wasm/database_knotinfo`,
matching Python's import layout for `database_knotinfo`.
