# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>

a = {1:1}
assrt.ok(not isinstance(a, dict))

from __python__ import dict_literals, overload_getitem
a = {1:1}
assrt.ok(isinstance(a, dict))
assrt.equal(a[1], 1)
a[2] = 2
assrt.equal(a[2], 2)
assrt.deepEqual(list(a.keys()), [1, 2])
from __python__ import no_dict_literals, no_overload_getitem


a = {1:1}
assrt.ok(not isinstance(a, dict))

def f():
    from __python__ import dict_literals
    a = {1:1}
    assrt.ok(isinstance(a, dict))

a = {1:1}
assrt.ok(not isinstance(a, dict))

class S:
    from __python__ import bound_methods

    def __init__(self):
        self.a = 3

    def val(self):
        return self.a if self else None

f = S().val
assrt.equal(f(), S().val())

class U:

    def __init__(self):
        self.a = 3

    def val(self):
        return self.a if self else None

f = U().val
assrt.equal(f(), None)

class C:

    def __init__(self):
        self.a = 3

    def uval1(self):
        return self.a if self else None

    from __python__ import bound_methods

    def bval(self):
        return self.a

    from __python__ import no_bound_methods

    def uval2(self):
        return self.a if self else None

c = C()
u1, u2 = c.uval1, c.uval2
f = c.bval
assrt.equal(u1(), None)
assrt.equal(u2(), None)
assrt.equal(f(), 3)
