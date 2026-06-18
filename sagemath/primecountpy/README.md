# primecountpy

primecountpy is SageMath's Python binding for the primecount C++ library.

This package builds the upstream Cython extension as a wasi-sdk Python side
module against the existing CoWasm `primecount`, `primesieve`, and `cysignals`
ports. The smoke test imports the extension in `python-wasm` and checks
`prime_pi`, `prime_pi_128`, `nth_prime`, and `phi`.
