"""Small Sage-like numerical smoke tests for the mpmath bundle."""

from mpmath import findroot, lu_solve, matrix, mp, polyroots, quad, zeta


mp.dps = 80

sqrt2 = mp.sqrt(2)
assert abs(sqrt2**2 - 2) < mp.mpf("1e-75")
assert abs(zeta(2) - mp.pi**2 / 6) < mp.mpf("1e-75")
assert abs(quad(lambda x: x**2, [0, 1]) - mp.mpf(1) / 3) < mp.mpf("1e-75")

cube_root = findroot(lambda x: x**3 - 2, (1, 2))
assert abs(cube_root**3 - 2) < mp.mpf("1e-70")

roots = sorted(polyroots([1, 0, -2]), key=lambda z: z.real)
assert abs(roots[0] + sqrt2) < mp.mpf("1e-70")
assert abs(roots[1] - sqrt2) < mp.mpf("1e-70")

solution = lu_solve(matrix([[2, 1], [1, 3]]), matrix([1, 2]))
assert abs(solution[0] - mp.mpf(1) / 5) < mp.mpf("1e-75")
assert abs(solution[1] - mp.mpf(3) / 5) < mp.mpf("1e-75")

print(
    "mpmath-ok dps=%s zeta2=pi^2/6 integral=1/3 root2=%s matrix=%s,%s"
    % (
        mp.dps,
        mp.nstr(cube_root, 20),
        mp.nstr(solution[0], 20),
        mp.nstr(solution[1], 20),
    )
)
