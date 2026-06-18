# PARI Seadata For SageMath

This package provides SageMath's standard `pari_seadata` data package for
CoWasm. PARI uses `seadata` when `ellap` handles large primes; this full data
set extends the small SEA tables to primes below 500.

CoWasm installs the files under `dist/wasm/share/pari/seadata`, matching PARI's
shared-data layout.
