import sage.all
xgcd = sage.all.xgcd
Integer = sage.all.Integer

def bench_xgcd0():
    s = 0
    n = Integer(92250)
    for i in range(10**6):
        s += n.xgcd(Integer(922350 + i))[0]
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
