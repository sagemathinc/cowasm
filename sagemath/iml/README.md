# IML

IML is the Integer Matrix Library from the University of Waterloo. SageMath
uses it for exact integer linear algebra, including modular matrix operations,
rational system solving, and integer nullspace/kernel computations.

This package builds the upstream static `libiml.a` archive for CoWasm's
wasi-sdk standalone target against the existing CoWasm GMP and GSL CBLAS
ports. The standalone smoke test verifies that the installed headers and
archive link into a WASI executable, then checks a modular determinant, modular
rank, rational solution reconstruction, and a deterministic integer nullspace
computation under the WASI runner.
