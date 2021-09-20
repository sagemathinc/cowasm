# globals: assrt

def nothing():
    pass
assrt.equal(nothing(), undefined)

add = def(a, b):
    return a+b
def sub(a, b):
    return a-b

mul = None
(def():
    nonlocal mul
    mul = def(a, b):
        return a*b

    div = def(a, b):  # noqa:unused-local
        return a/b
)()

assrt.equal(add(1,2), 3)
assrt.equal(sub(1,2), -1)
assrt.equal(mul(2,2), 4)
# for some reason input to throws must be of type block, hence the 'def' wrapper
assrt.throws(
    def():
        div(6,3)  # noqa: undef
    ,
    /div is not defined/
)

arr = [8,4]
assrt.equal(add(*arr), 12)
assrt.ok(Array.isArray(arr))

def sum(*args):
    ttl = 0
    for i in args:
        ttl += i
    return ttl
assrt.equal(sum(1,2,3), 6)
assrt.equal(sum(1,*[2,3]), 6)

num = 4
def():
    nonlocal num
    num = 5
.call(this)

assrt.equal(num, 5)

x = "foo"
y = 5
def swap(x, y):
    return y, x
x, y = swap(x, y)
assrt.equal(x, 5)
assrt.equal(y, "foo")

count = 0
f, r = (def():
    def fake_increment():
        count += 1
    def real_increment():
        nonlocal count
        count += 1
    return fake_increment, real_increment
).call(this)

f()
assrt.equal(count, 0)
r()
assrt.equal(count, 1)

st = "this is a string"
assrt.equal(jstype(st), v"typeof st")

# testing inlined functions
inlined = [
    def(x): return x+1;, def(x): return x+2;,
    def(x): return x+3
    ,
    def(x): return x+4
]
assrt.equal(inlined[0](1), 2)
assrt.equal(inlined[1](1), 3)
assrt.equal(inlined[2](1), 4)
assrt.equal(inlined[3](1), 5)

# decorators
def makebold(fn):
    def wrapped(arg):
        return "<b>" + fn(arg) + "</b>"
    return wrapped

def makeitalic(fn):
    def wrapped(arg):
        return "<i>" + fn(arg) + "</i>"
    return wrapped

@makebold
@makeitalic
def hello(something):
    return "hello " + something

assrt.equal(hello("world"), "<b><i>hello world</i></b>")
assrt.equal(hello.__module__, '__main__')
assrt.equal(hello.__argnames__.length, 1)
assrt.equal(hello.__argnames__[0], 'arg')


def simple_wrapper(f):
    f.test_attr = 'test'
    return f


@simple_wrapper
def fw(x):
    pass

assrt.equal(fw.__module__, '__main__')
assrt.equal(fw.__argnames__.length, 1)
assrt.equal(fw.__argnames__[0], 'x')
# just because something is a reserved keyword in RapydScript, doesn't mean other libraries won't attempt to use it
# let's make sure we parse that correctly
five = {}
v"five.is = function(n) { return 5 == n };"
assrt.ok(five.is(5))

# function assignment via conditional
foo = (def(): return 5;) if 0 else (def(): return 6;)
bar = (def(): return 5;) if 0 < 1 else (def(): return 6;)
baz = (def():
    return 5
) if 1 else (def():
    return 6
)
assrt.equal(foo(), 6)
assrt.equal(bar(), 5)
assrt.equal(baz(), 5)

def trailing_comma(a, b,):
    return a + b
assrt.equal(trailing_comma(1, 2), 3)
assrt.equal(trailing_comma(1, 2,), 3)

def return_string_with_newline():
    return '''a
b'''
assrt.equal(return_string_with_newline(), 'a\nb')
