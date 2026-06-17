# rw

rw computes rank-width and rank-decompositions of graphs. SageMath uses it
from graph-theory code that needs exact rank-width calculations.

This package builds a wasi-sdk standalone `librw.a` archive and installs the
upstream `rw.h` header. The smoke test links a small C probe against the
archive and checks rank-width values for empty, path, complete, cycle,
disconnected matching, and complete bipartite graphs under the WASI runner.
