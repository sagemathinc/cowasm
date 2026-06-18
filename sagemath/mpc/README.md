# MPC

GNU MPC provides correctly rounded multiple-precision complex arithmetic on top
of GMP and MPFR. SageMath uses it for high-precision complex numbers and for
analytic routines that need predictable real and imaginary rounding behavior.

The standalone WASI smoke builds a static `libmpc.a` against the CoWasm GMP and
MPFR ports, links a C probe, and checks arithmetic plus elementary complex
functions: powers, division, square roots, `exp(i*pi)`, `log(-1)`, and
`sin(pi/2)`.
