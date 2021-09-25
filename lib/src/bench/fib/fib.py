def fib(n):
    if n == 1 or n == 0:
        return 1
    return fib(n - 1) + fib(n - 2)


def bench(n=35):
    from time import time
    t = time()
    print(fib(n), f"{(time() - t) * 1000} ms")
