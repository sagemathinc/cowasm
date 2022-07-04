# vim:fileencoding=utf-8
# License: BSD Copyright: 2015, Kovid Goyal <kovid at kovidgoyal.net>

def double(f):
    return def (x):
        return 2 * f(x)

def triple(f):
    return def(x):
        return 3 * f(x)

@double
def half(x):
    return x // 2

@double
def f1(x):
    return x

@double
@triple
def f2(x):
    return x

def append_one(f):
    return def(x):
        ans = f(x)
        ans.push(1)
        return ans

def append_two(f):
    return def(x):
        ans = f(x)
        ans.push(2)
        return ans

@append_two
@append_one
def f3():
    return []

o = {'double':double}

@o.double
def f4():
    return 1

assrt.equal(2, half(2))
assrt.equal(4, f1(2))
assrt.equal(12, f2(2))
assrt.equal(2, f4())
assrt.deepEqual([1, 2], f3())

def multiply(amt):

    def wrapper(f):
        return def ():
            return amt * f()

    return wrapper

@multiply(2)
def two():
    return 1

@multiply(3)
def three():
    return 1

@multiply(2)
@multiply(2)
def four():
    return 1

assrt.equal(2, two())
assrt.equal(3, three())
assrt.equal(4, four())
