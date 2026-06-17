# Cunningham Tables For SageMath

This package provides SageMath's `cunningham_tables` data package for CoWasm.

It installs `cunningham_prime_factors.sobj`, the Sage object file containing
prime factors from the Cunningham tables, into:

- `dist/wasm/share/cunningham_tables`
- `dist/wasi-sdk/share/cunningham_tables`

The package is data-only and is intended for Sage/Sagelite number-theory
lookups in the browser runtime.
