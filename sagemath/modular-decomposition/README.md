# Modular Decomposition For SageMath

This package builds SageMath's `modular_decomposition` graph library for the
CoWasm wasi-sdk standalone toolchain. Sage uses it for modular decomposition of
graphs into parallel, series, and prime components.

The port compiles the upstream `dm.c` source into `libmodular_decomposition.a`
and installs the public header as `modular_decomposition.h`. The smoke test
links a C probe against the installed archive and checks representative empty,
complete, and path graph decompositions under the WASI runner.
