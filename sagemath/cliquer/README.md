# Cliquer For SageMath

Cliquer provides exact clique-search routines for weighted and unweighted
graphs. SageMath ships it as a standard graph-theory dependency.

This package builds Cliquer as a CoWasm wasi-sdk standalone static library. The
port applies a small WASI time-compatibility patch, installs the upstream
headers and archive, and links a C smoke probe that checks maximum clique size,
single-clique search, all-clique enumeration, weighted clique search, and graph
edge accounting under the WASI runner.
