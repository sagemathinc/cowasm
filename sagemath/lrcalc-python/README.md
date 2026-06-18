# lrcalc_python

lrcalc_python is SageMath's Python binding for the Littlewood-Richardson
calculator.

This package builds the upstream Cython extension as a wasi-sdk Python side
module against the existing CoWasm `lrcalc` static library. The smoke test
imports the extension in `python-wasm` and checks Littlewood-Richardson
coefficients, Schur products, skew Schur expansions, coproducts, and Schubert
polynomial multiplication.
