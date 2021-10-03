import bench

register = bench.register
all = bench.all


def operator_add(n=100000):
    class A:
        def __add__(self, right):
            pass

    a = A()
    b = A()
    for i in range(n):
        a + b


register("operator_add", operator_add)


def gcd(a, b):
    while b:
        c = a % b
        a = b
        b = c
    return a


def bench_gcd(n=10**6):
    s = 0
    for i in range(n):
        s += gcd(92250, 922350 + i)
    return s


register("gcd", bench_gcd)


def xgcd(a, b):
    prevx, x = 1, 0
    prevy, y = 0, 1
    while b:
        q, r = divmod(a, b)
        x, prevx = prevx - q * x, x
        y, prevy = prevy - q * y, y
        a, b = b, r
    return a, prevx, prevy


def bench_xgcd(n=10**6):
    s = 0
    for i in range(n):
        s += xgcd(92250, 922350 + i)[0]
    return s


register("xgcd", bench_xgcd)

from math import sqrt
def trial_division(N, bound=0, start=2):
    if N <= 1:
        return N
    m = 7
    i = 1
    dif = [6, 4, 2, 4, 2, 4, 6, 2]
    if start > 7:
        m = start % 30
        if m <= 1:
            i = 0
            m = start + (1 - m)
        elif m <= 7:
            i = 1
            m = start + (7 - m)
        elif m <= 11:
            i = 2
            m = start + (11 - m)
        elif m <= 13:
            i = 3
            m = start + (13 - m)
        elif m <= 17:
            i = 4
            m = start + (17 - m)
        elif m <= 19:
            i = 5
            m = start + (19 - m)
        elif m <= 23:
            i = 6
            m = start + (23 - m)
        elif m <= 29:
            i = 7
            m = start + (29 - m)
    if start <= 2 and N % 2 == 0:
        return 2
    if start <= 3 and N % 3 == 0:
        return 3
    if start <= 5 and N % 5 == 0:
        return 5
    limit = round(sqrt(N))
    if bound != 0 and bound < limit:
        limit = bound
    while m <= limit:
        if N % m == 0:
            return m
        m += dif[i % 8]
        i += 1

    return N


def is_prime(N):
    return N > 1 and trial_division(N) == N


def pi(n=100000):
    s = 0
    for i in range(1, n + 1):
        if is_prime(i):
            s += 1
    return s


register("pi(X)", pi)



def sum_loop(n=1000000):
    s = 0
    for i in range(0, n, 3):
        s += 1
    return s

register("sum_loop", sum_loop)

def sum_range(n=1000000):
    return sum(range(0, n, 3))

register("sum_range", sum_range)

def sum_reversed(n=1000000):
    return sum(reversed(list(range(0, n, 3))))

register("sum_reversed", sum_reversed)
