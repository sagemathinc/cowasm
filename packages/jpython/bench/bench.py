def time(f, *args):
    from time import time
    t = time()
    f(*args)
    return int((time() - t) * 1000)


benchmarks = []


def register(name, f):
    global benchmarks
    benchmarks.append((name, f))


def all():
    t = 0
    for (name, f) in benchmarks:
        s = time(f)
        t += s
        print(name, s, "ms")
    print("Total...", t, "ms")
