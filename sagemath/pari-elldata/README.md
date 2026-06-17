# PARI Elldata For SageMath

This package provides SageMath's standard `pari_elldata` data package for
CoWasm. PARI uses `elldata` for elliptic-curve tables used by functions such
as `ellsearch`.

CoWasm installs the files under `dist/wasm/share/pari/elldata`, matching PARI's
shared-data layout.
