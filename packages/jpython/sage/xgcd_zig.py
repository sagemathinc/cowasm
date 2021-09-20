

def bench_xgcd(xgcd):
    from time import time
    t = time()
    s = 0
    for i in range(10**6):
        s += xgcd(92250, 922350 + i)
    print(s, time() - t)


