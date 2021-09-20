# A standard xgcd implementation for Python copied from a random webpage.
# This of course quickly overflows with Javascript "integers" = doubles'

from numba import jit

@jit(nopython=True)
def xgcd(a, b):
    prevx, x = 1, 0
    prevy, y = 0, 1
    while b:
        q, r = divmod(a, b)
        x, prevx = prevx - q * x, x
        y, prevy = prevy - q * y, y
        a, b = b, r
    return a, prevx, prevy

@jit(nopython=True)
def bench_xgcd0():
    s = 0
    for i in range(10**6):
        s += xgcd(92250, 922350 + i)[0]
    return s

def bench_xgcd():
    from time import time
    t = time()
    print(bench_xgcd0(), time() - t)


def inverse_mod(a, N):
    """
    Compute multiplicative inverse of a modulo N.
    """
    if a == 1 or N <= 1:  # common special cases
        return a % N
    [g, s, _] = xgcd(a, N)
    if g != 1:
        raise ZeroDivisionError
    b = s % N
    if b < 0:
        b += N
    return b
