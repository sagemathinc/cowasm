"""Small Sage-like symbolic algebra smoke tests for the SymPy bundle."""

from sympy import Matrix, Poly, QQ, Rational, factor, groebner, symbols
from sympy.polys.polyerrors import PolynomialError


x, y = symbols("x y")

# Exact rational arithmetic is central to Sage-style symbolic work.
assert Rational(2, 3) + Rational(5, 7) == Rational(29, 21)

# Polynomial factorization and coefficient-domain handling should work without
# any optional native extensions.
assert factor(x**4 - 1) == (x - 1) * (x + 1) * (x**2 + 1)
assert Poly(x**3 + 2 * x + 1, x, domain=QQ).eval(Rational(1, 2)) == Rational(
    17, 8
)

# Groebner bases are a useful proxy for higher-level exact algebra workflows.
basis = groebner([x * y - 1, y**2 - 1], x, y, order="lex")
assert [poly.as_expr() for poly in basis.polys] == [x - y, y**2 - 1]

# Matrix inversion should stay exact over the rationals.
assert Matrix([[1, 2], [3, 5]]).inv() == Matrix([[-5, 2], [3, -1]])

# Error recovery matters for an interactive Sage/Sagelite-style runtime.
try:
    Poly(1 / x, x)
except PolynomialError:
    pass
else:
    raise AssertionError("Poly(1 / x, x) did not raise PolynomialError")
