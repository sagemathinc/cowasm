# Buckygen For SageMath

Buckygen generates nonisomorphic fullerene graphs. SageMath can use it as an
optional graph generator alongside `benzene` and `plantri`.

This package builds the upstream `buckygen` command as a wasi-sdk standalone
executable. The smoke test checks Sage-style count-only execution, the
specialized C60 IPR fullerene generator, and both graph6 and planar-code output
under the WASI runner.
