from bench import register, all

from nt import gcd, xgcd, inverse_mod, pi

def operator_add(n=100000):
    class A:
        def __add__(self, right):
            pass

    a = A()
    b = A()
    for i in range(n):
        a + b


register("operator_add", operator_add)



def bench_gcd(n=10**5):
    s = 0
    for i in range(n):
        s += gcd(92250, 922350 + i)
    return s


register("gcd", bench_gcd)


def bench_xgcd(n=10**5):
    s = 0
    for i in range(n):
        s += xgcd(92250, 922350 + i)[0]
    return s


register("xgcd", bench_xgcd)

def bench_inverse_mod(n=10**5):
    s = 0
    for i in range(1, n):
        s += inverse_mod(i, 1073741827)   # nextprime(2^30)


register("bench_inverse_mod", bench_inverse_mod)


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

if __name__ == '__main__':
    all('numbers')
