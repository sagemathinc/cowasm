# libsemigroups For SageMath

libsemigroups is a C++ library for computing with finite semigroups and
monoids. SageMath lists it as an optional package, and GAP's Semigroups
package also uses it for core finite-semigroup algorithms.

This package builds libsemigroups 2.7.4 for CoWasm's wasi-sdk standalone
target as a static archive. The smoke test links a WASI C++ probe against
`libsemigroups.a` and verifies a transformation semigroup with 88 elements
and 18 rewriting rules under the WASI runner.
