# Various ways to compute Fibonacci numbers go here.

from bench import register, all

cdef inline int rfib(int n):
    if n == 1 or n == 0:
        return 1
    return rfib(n - 1) + rfib(n - 2)

def fib(n=30):
    return rfib(n)

register("cython: recursive fibonacci", fib)

if __name__ == '__main__':
    all()
