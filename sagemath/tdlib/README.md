# tdlib

tdlib is the treedec C++ library for tree decompositions used by SageMath graph
computations.

This package builds a header-only WASI SDK standalone tdlib baseline against
the cropped Boost headers. The standalone smoke installs the treedec headers,
links a small C++ probe with the pinned wasi-sdk exception runtime archives,
and verifies a cycle graph tree decomposition through the WASI runner.
