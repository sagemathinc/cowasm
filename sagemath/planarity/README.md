# Planarity

Planarity is SageMath's packaged edge-addition graph planarity suite. Sage uses
it for graph planarity testing, embeddings, and Kuratowski-style obstruction
workflows.

This package builds a wasi-sdk standalone `planarity` command plus the static
`libplanarity.a` archive. The smoke test links a C probe against the installed
library, checks planar and nonplanar graph classification, runs upstream's
installed sample regression suite under the WASI runner, and verifies that the
command-line tool can write a planar embedding for a sample graph.
