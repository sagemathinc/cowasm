# PARI/GP

This package builds PARI/GP and libpari for CoWasm's wasi-sdk standalone
toolchain. SageMath relies on PARI for fast number-theory computations and
elliptic-curve arithmetic.

The standalone smoke builds a static PARI installation against the existing GMP
port after checking wasi-sdk setjmp support. It links a libpari C probe for
integer arithmetic, `primepi`, factorization round-tripping, modular group
order, polynomial irreducibility, elliptic-curve cardinality, and PARI error
recovery, and also validates the installed `gp` runtime under the WASI runner.
