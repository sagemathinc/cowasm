# A standard xgcd implementation for Python copied from a random webpage.
# This of course quickly overflows with Javascript "integers" = doubles'
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
    from time import time
    t = time()
    s = 0
    for i in range(n):
        s += xgcd(92250 - i, 922350 + i)[0]
    print(s, time() - t)


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


if __name__ == "__main__":
    print("inverse_mod(7,15) = ", inverse_mod(7,15))
    bench_xgcd()