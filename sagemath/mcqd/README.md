# MCQD

MCQD is Janez Konc's exact branch-and-bound maximum clique implementation used
by SageMath graph-theory workflows.

This package builds the upstream `mcqd` command-line program for CoWasm's
wasi-sdk standalone target and installs the upstream header under
`include/mcqd`. The public `Maxclique` API is implemented in that header, so
Sage-facing C++ probes can include it directly without a separate archive.

The standalone smoke test compiles a small C++ API probe that runs both `mcq`
and `mcqdyn` on a graph with a known 3-clique. It also packages a DIMACS sample,
runs the installed `mcqd` executable under the WASI runner, and checks both the
reported clique vertices and the two size reports from upstream's static and
dynamic variants.
