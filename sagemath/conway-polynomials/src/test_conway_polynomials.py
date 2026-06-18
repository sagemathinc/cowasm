import conway_polynomials


def trim(poly):
    poly = tuple(coef for coef in poly)
    while len(poly) > 1 and poly[-1] == 0:
        poly = poly[:-1]
    return poly


def sub_mod(left, right, prime):
    length = max(len(left), len(right))
    result = [0] * length
    for i in range(length):
        left_coef = left[i] if i < len(left) else 0
        right_coef = right[i] if i < len(right) else 0
        result[i] = (left_coef - right_coef) % prime
    return trim(result)


def mul_mod(left, right, modulus, prime):
    result = [0] * (len(left) + len(right) - 1)
    for i, left_coef in enumerate(left):
        for j, right_coef in enumerate(right):
            result[i + j] = (result[i + j] + left_coef * right_coef) % prime
    return rem_mod(result, modulus, prime)


def rem_mod(poly, modulus, prime):
    result = [coef % prime for coef in poly]
    modulus = trim(tuple(coef % prime for coef in modulus))
    lead_inverse = pow(modulus[-1], -1, prime)

    while len(result) >= len(modulus):
        scale = result[-1] * lead_inverse % prime
        if scale:
            offset = len(result) - len(modulus)
            for i, coef in enumerate(modulus):
                result[offset + i] = (result[offset + i] - scale * coef) % prime
        result.pop()

    return trim(result or (0,))


def gcd_mod(left, right, prime):
    left = trim(tuple(coef % prime for coef in left))
    right = trim(tuple(coef % prime for coef in right))
    while right != (0,):
        left, right = right, rem_mod(left, right, prime)
    inverse = pow(left[-1], -1, prime)
    return tuple((coef * inverse) % prime for coef in left)


def pow_mod(base, exponent, modulus, prime):
    result = (1,)
    base = rem_mod(base, modulus, prime)
    while exponent:
        if exponent & 1:
            result = mul_mod(result, base, modulus, prime)
        base = mul_mod(base, base, modulus, prime)
        exponent >>= 1
    return result


def prime_factors(value):
    factors = set()
    divisor = 2
    while divisor * divisor <= value:
        while value % divisor == 0:
            factors.add(divisor)
            value //= divisor
        divisor += 1 if divisor == 2 else 2
    if value > 1:
        factors.add(value)
    return factors


def assert_irreducible(prime, degree, polynomial):
    x = (0, 1)
    assert pow_mod(x, prime**degree, polynomial, prime) == x
    for factor in prime_factors(degree):
        power = pow_mod(x, prime ** (degree // factor), polynomial, prime)
        assert gcd_mod(polynomial, sub_mod(power, x, prime), prime) == (1,)


def assert_primitive(prime, degree, polynomial):
    x = (0, 1)
    order = prime**degree - 1
    assert pow_mod(x, order, polynomial, prime) == (1,)
    for factor in prime_factors(order):
        assert pow_mod(x, order // factor, polynomial, prime) != (1,)


db = conway_polynomials.database()

assert db[2][5] == (1, 0, 1, 0, 0, 1)
assert db[2][17] == (1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)
assert db[23][19] == (
    18,
    5,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
)
assert db[307][1] == (302, 1)
assert db[40013][2] == (2, 40009, 1)
assert conway_polynomials.database() is db

for prime, degree in ((2, 5), (23, 19), (40013, 2)):
    polynomial = db[prime][degree]
    assert len(polynomial) == degree + 1
    assert polynomial[-1] == 1
    assert_irreducible(prime, degree, polynomial)

for prime, degree in ((2, 5), (40013, 2)):
    assert_primitive(prime, degree, db[prime][degree])

print(
    "conway-polynomials-ok p2n5 p23n19 p40013n2 "
    "irreducible primitive cached"
)
