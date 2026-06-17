# Reflexive Polytope Databases For SageMath

This package provides SageMath's standard `polytopes_db` data package for
CoWasm. Sage uses this database for 2- and 3-dimensional reflexive polytopes,
next to PALP-backed lattice polytope functionality.

CoWasm installs the files under `dist/wasm/share/polytopes_db`, mirroring
Sage's shared-data layout.

The package contains:

- `reflexive_polytopes_2d`
- `reflexive_polytopes_3d`
- PALP `Full2d` database shards
- PALP `Full3d` database shards

The test target checks that the data files are installed and have the expected
PALP text structure under CoWasm CPython.
