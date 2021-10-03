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
