# BRiAl

This package builds BRiAl, SageMath's Boolean polynomial algebra library, for
the CoWasm wasi-sdk standalone toolchain.

The standalone smoke builds the static BRiAl and BRiAl Groebner archives
against the existing M4RI and Boost.Cropped ports. It links a C++ probe that
checks Boolean polynomial arithmetic, monomial reduction, Groebner basis
construction, and normal-form computation under the WASI runner.
