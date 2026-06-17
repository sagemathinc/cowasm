# Graph Databases For SageMath

This package provides SageMath's standard `graphs` data package for CoWasm.
Sage installs these files under `SAGE_SHARE/graphs`; CoWasm mirrors that layout
inside `dist/wasm/share/graphs`.

The package currently contains:

- `graphs.db`, the SQLite graph database.
- `brouwer_srg_database.json`, the strongly regular graph parameter database.
- `smallgraphs.txt`, named small graph encodings.
- `isgci_sage.xml`, graph-class metadata from ISGCI.

The test target checks that these data files are installed and parseable under
CoWasm CPython.
