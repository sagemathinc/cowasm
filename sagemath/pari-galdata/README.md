# PARI Galdata For SageMath

This package provides SageMath's standard `pari_galdata` data package for
CoWasm. PARI uses `galdata` when `polgalois` computes Galois groups in degrees
8 through 11.

CoWasm installs the files under `dist/wasm/share/pari/galdata`, matching PARI's
shared-data layout.
