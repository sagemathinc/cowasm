# Symmetrica for CoWasm

This package builds Symmetrica 3.1.0 as a static library for CoWasm's pinned
wasi-sdk standalone toolchain.

Symmetrica provides representation theory, symmetric-function, and
combinatorics routines used by SageMath. The current WASI smoke verifies that
the library configures, builds, installs headers, links into a WASI executable,
and exercises factorials, Pascal binomial identities, partitions, Kostka
numbers, Kostka tableaux, and Schur products under the WASI runner.
