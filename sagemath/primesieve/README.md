# primesieve

primesieve is a fast prime generator library used by SageMath number-theory
packages, including primecount.

This package builds the upstream static `libprimesieve.a` archive for the
wasi-sdk toolchain. The standalone smoke test links a C probe against the
installed archive and verifies prime counting, nth-prime lookup, twin-prime
counting, interval generation, and iterator behavior under the WASI runner.
