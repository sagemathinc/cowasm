from bench import register, all

from nt import gcd, xgcd, inverse_mod, pi


def test_pi(n=100000):
    assert pi(n) == 9592


register("pi(10**5)", pi)


def operator_add(n=100000):
    class A:
        def __init__(self, i):
            self.i = i

        def __add__(self, right):
            return A(self.i + right.i)

    a = A(2)
    b = A(3)
    for i in range(n):
        c = a + b
    assert c.i == 5


register("operator_add", operator_add)


def bench_gcd(n=10**5):
    s = 0
    for i in range(n):
        s += gcd(92250, 922350 + i)
    assert s == 2414484
    return s


register("gcd", bench_gcd)


def bench_xgcd(n=10**5):
    s = 0
    for i in range(n):
        s += xgcd(92250, 922350 + i)[0]
    assert s == 2414484
    return s


register("xgcd", bench_xgcd)


def bench_inverse_mod(n=10**5):
    s = 0
    for i in range(1, n):
        s += inverse_mod(i, 1073741827)  # nextprime(2^30)
    assert s == 53532319533988


register("bench_inverse_mod", bench_inverse_mod)


def sum_loop(n=1000000):
    s = 0
    for i in range(0, n, 3):
        s += 1
    assert s == 333334
    return s


register("sum_loop", sum_loop)


def sum_range(n=1000000):
    n = sum(range(0, n, 3))
    assert n == 166666833333


register("sum_range", sum_range)


def sum_reversed(n=1000000):
    n = sum(reversed(list(range(0, n, 3))))
    assert n == 166666833333


register("sum_reversed", sum_reversed)

if __name__ == '__main__':
    all('numbers')
