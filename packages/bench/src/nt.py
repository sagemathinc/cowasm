# mypy
# A little pure python number theory library, which is useful
# as a foundation for some microbenchmarks

from math import sqrt
from typing import Tuple


def gcd(a: int, b: int) -> int:
    while b:
        c = a % b
        a = b
        b = c
    return a


def xgcd(a: int, b: int) -> Tuple[int, int, int]:
    prevx, x = 1, 0
    prevy, y = 0, 1
    while b:
        q, r = divmod(a, b)
        x, prevx = prevx - q * x, x
        y, prevy = prevy - q * y, y
        a, b = b, r
    return a, prevx, prevy


def inverse_mod(a: int, N: int) -> int:
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


def trial_division(N: int, bound: int = 0, start: int = 2) -> int:
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


def is_prime(N: int) -> bool:
    return N > 1 and trial_division(N) == N


def pi(n: int = 100000) -> int:
    s = 0
    for i in range(1, n + 1):
        if is_prime(i):
            s += 1
    return s
