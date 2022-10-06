from bench import register, all

from nt import xgcd, pi
from nt cimport gcd, xgcd_c, inverse_mod

def test_pi(n=100000):
    assert pi(n) == 9592


register("pi(10**5)", pi)

cdef class A:
    cdef int i
    def __init__(self, int i):
        self.i = i

    def value(self):
        return self.i

    def __add__(self, right):
        return A((<A>self).i + (<A>right).i)

def operator_add(int n=100000):

    a = A(2)
    b = A(3)
    cdef int i
    for i in range(n):
        c = a + b
    assert c.value() == 5


register("operator_add", operator_add)


def bench_gcd(int n=10**5):
    cdef int s = 0
    cdef int i
    for i in range(n):
        s += gcd(92250, 922350 + i)
    assert s == 2414484
    return s


register("gcd", bench_gcd)


def bench_xgcd_py(n=10**5):
    s = 0
    for i in range(n):
        s += xgcd(92250, 922350 + i)[0]
    assert s == 2414484
    return s

# 10x slower, of course
# register("xgcd_py", bench_xgcd_py)


def bench_xgcd(int n=10**5):
    cdef int s = 0, cx, cy, i
    for i in range(n):
        s += xgcd_c(92250, 922350 + i, &cx, &cy)
    assert s == 2414484
    return s


register("xgcd", bench_xgcd)


def bench_inverse_mod(long long n=10**5):
    cdef long long i, s = 0
    for i in range(1, n):
        s += inverse_mod(i, 1073741827)  # nextprime(2^30)
    assert s == 53532319533988


register("bench_inverse_mod", bench_inverse_mod)


def sum_loop(int n=1000000):
    cdef int s = 0, i
    for i in range(0, n, 3):
        s += 1
    assert s == 333334
    return s


register("sum_loop", sum_loop)


def sum_range(long long n=1000000):
    n = sum(range(0, n, 3))
    assert n == 166666833333


register("sum_range", sum_range)


def sum_reversed(long long n=1000000):
    n = sum(reversed(list(range(0, n, 3))))
    assert n == 166666833333


register("sum_reversed", sum_reversed)

if __name__ == '__main__':
    all('numbers')
