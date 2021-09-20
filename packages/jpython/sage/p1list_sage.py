def bench1(n):
    import sage.all
    from sage.modular.modsym.p1list import p1_normalize_int
    from time import time
    t = time()
    s = 0
    for a in range(n):
        s += p1_normalize_int(46100, 39949, a)[0]
    print(s, time() - t)
