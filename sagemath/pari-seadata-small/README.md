# PARI Seadata Small For SageMath

This package provides SageMath's standard `pari_seadata_small` data package for
CoWasm. PARI uses `seadata` when `ellap` handles large primes; this small data
set is intended for primes up to 350 bits.

CoWasm installs the files under `dist/wasm/share/pari/seadata`, matching PARI's
shared-data layout.
