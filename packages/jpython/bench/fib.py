# Various ways to compute Fibonacci numbers go here.

from bench import register, all


def rfib(n=30):
    if n == 1 or n == 0:
        return 1
    return rfib(n - 1) + rfib(n - 2)


register("recursive fibonacci", rfib)

if __name__ == '__main__':
    all()
