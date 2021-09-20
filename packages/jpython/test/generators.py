# vim:fileencoding=utf-8
# License: BSD
# Copyright: 2015, Kovid Goyal <kovid at kovidgoyal.net>

def g1():
    yield 1
    yield 2

def g2():
    for i in range(2):
        yield from g1()

def g3():
    data = yield 1
    yield data

class A:

    def __init__(self):
        self.items = [1, 2, 3]

    def __iter__(self):
        for x in self.items:
            yield x

assrt.deepEqual([x for x in g1()], [1, 2])
assrt.deepEqual([x for x in g2()], [1, 2, 1, 2])
assrt.deepEqual([x for x in A()], [1, 2, 3])

g = g3()
assrt.equal(g.next().value, 1)
assrt.equal(g.next('a').value, 'a')

a = (x for x in range(3))
assrt.deepEqual(list(a), [0, 1, 2])
a = ([x, x**2] for x in range(3))
assrt.deepEqual(list(a), [[0, 0], [1, 1], [2, 4]])
assrt.deepEqual(list(x for x in range(3)), [0, 1, 2])
def t(a, b):
    assrt.deepEqual(list(a), list(b))
t((x for x in range(1)), (y for y in range(1)))
