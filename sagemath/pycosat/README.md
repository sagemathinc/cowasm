# pycosat

pycosat is SageMath's optional Python binding to the PicoSAT Boolean
satisfiability solver.

This package builds pycosat's bundled PicoSAT C extension as a wasi-sdk Python
side module. The smoke test imports it in `python-wasm` and checks SAT,
UNSAT, bounded UNKNOWN, and solution enumeration behavior.
