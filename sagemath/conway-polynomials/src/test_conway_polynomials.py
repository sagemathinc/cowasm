import conway_polynomials


db = conway_polynomials.database()

assert db[2][5] == (1, 0, 1, 0, 0, 1)
assert db[2][17] == (1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)
assert db[23][19] == (18, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)
assert db[307][1] == (302, 1)
assert db[40013][2] == (2, 40009, 1)
assert conway_polynomials.database() is db

for prime, degree in ((2, 5), (23, 19), (40013, 2)):
    polynomial = db[prime][degree]
    assert len(polynomial) == degree + 1
    assert polynomial[-1] == 1

print("conway-polynomials-ok p2n5 p23n19 p40013n2 cached")
