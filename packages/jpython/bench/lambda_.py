from bench import register, all


# Test speed of lambda
def speed_test(n=10**6):
    f = lambda a, b: a + b
    for i in range(n):
        f(2, 3)


register("lambda speed test (1)", speed_test)


# Test speed of lambda
def speed_test_2(n=10**6):
    f = lambda a, b=10, **kwds: a + b
    for i in range(n):
        f(2)


register("lambda speed test (2)", speed_test_2)

if __name__ == '__main__':
    all()
