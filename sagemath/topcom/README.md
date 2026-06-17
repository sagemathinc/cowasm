# TOPCOM

TOPCOM computes triangulations of point configurations and oriented matroids.
SageMath exposes these tools through its geometry and polyhedral computation
interfaces.

The standalone WASI smoke builds TOPCOM against the existing CoWasm GMP/GMPXX
and cddlib ports, then runs small triangulation and facet computations through
the WASI runner.
