# Combinatorial Designs For SageMath

This package provides SageMath's standard `combinatorial_designs` data package
for CoWasm. Sage uses this data for design-theory constructions, including the
Handbook of Combinatorial Designs table of mutually orthogonal Latin squares.

CoWasm installs the file under `dist/wasm/share/combinatorial_designs`,
mirroring Sage's shared-data layout.

The package currently contains:

- `MOLS_table.txt`, the 10,000-entry lower-bound table for mutually orthogonal
  Latin squares.

The test target checks that the table is installed and parseable under CoWasm
CPython.
