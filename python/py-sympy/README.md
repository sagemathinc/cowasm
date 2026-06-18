# WebAssembly build of the sympy python library

The WASI smoke test runs SymPy against the CoWasm Python runtime with the
mpmath bundle on `PYTHONPATH`, covering import, core expression behavior, exact
symbolic algebra, Groebner bases, matrices, calculus, and polynomial error
recovery.
