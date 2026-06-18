# primecount

primecount provides fast algorithms for counting primes. SageMath uses it for
number-theory computations that need efficient prime-counting functions.

This package builds the upstream static `libprimecount.a` archive for the
wasi-sdk toolchain against the existing CoWasm primesieve port. The standalone
smoke test links a C probe against both archives and verifies `pi(10^6)`, the
1000th prime, a small partial sieve value, and the string-returning C API under
the WASI runner. It also links a C++ probe against the installed headers and
archive, covering the namespace API, string overload, thread accessor, and
`primecount_error` exception path.
