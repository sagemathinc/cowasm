# e-antic

e-antic is a C/C++/Python library for arithmetic in real embedded algebraic
number fields. SageMath uses it for exact arithmetic and comparisons in real
number fields.

This package builds the upstream `libeantic` C archive for the wasi-sdk
toolchain against the existing CoWasm GMP, MPFR, FLINT, and Boost.Cropped
ports. The standalone smoke test links a C probe against the installed archive
and verifies an embedded square-root field, generator arithmetic, sign
comparison, flooring, and string formatting under the WASI runner.

The current CoWasm smoke intentionally builds only the C library. The upstream
C++ wrapper still hits old Boost.MPL enum diagnostics with the cropped Boost
headers, and the Python wrapper depends on a separate cppyy/Python packaging
path.
