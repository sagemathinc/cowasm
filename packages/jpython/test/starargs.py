# vim:fileencoding=utf-8
# globals: assrt

eq = assrt.equal
de = assrt.deepEqual

def get(obj, name):
    return obj[name] if obj else undefined

# Test the parsing of function definitions {{{

def basic_test(code, arglen, starargs, kwargs, defaults):
    func = RapydScript.parse('def func(' + code + '): pass\n', {'filename':code}).body[0]
    eq(func.argnames.length, arglen)
    eq(get(func.argnames.starargs, 'name'), starargs)
    eq(get(func.argnames.kwargs, 'name'), kwargs)
    eq(func.argnames.is_simple_func, bool(not starargs and not kwargs and not defaults))
    if defaults:
        fd = {}
        for key in Object.keys(func.argnames.defaults):
            fd[key] = func.argnames.defaults[key].value
        de(fd, defaults)
    return func

def throw_test(code):
    assrt.throws(def():
        RapydScript.parse('def func(' + code + '): pass\n', {'filename':code}).body[0]
    , RapydScript.SyntaxError)

basic_test('a, b, c', 3)
basic_test('*args', 0, 'args')
basic_test('a, b, *args', 2, 'args')
throw_test('*args, a')
throw_test('*args, *a')
basic_test('**kwargs', 0, undefined, 'kwargs')
basic_test('*args, **kwargs', 0, 'args', 'kwargs')
basic_test('a, b, *args, **kwargs', 2, 'args', 'kwargs')
throw_test('**kw, *a')
throw_test('**kw, **a')
basic_test('a=1, b="2"', 2, None, None, {'a':1, 'b':"2"})
basic_test('x, a=1, b="2", *args, **kw', 3, 'args', 'kw', {'a':1, 'b':"2"})
throw_test('a=1, b')
throw_test('**k, a=1')
throw_test('a, a')
throw_test('a, a=1')
throw_test('*a, **a')
# }}}

# Test parsing of function calls {{{

def parse_call_test(code, arglen, opts):
    func = RapydScript.parse('f(' + code + ')', {'filename':code}).body[0].body
    opts = opts or {}
    eq(func.args.length, arglen, 'Incorrect len for: ' + code)
    if (opts.starargs != undefined):
        si = [[i, x.name] for i, x in enumerate(func.args) if x.is_array]
        de(opts.starargs, si, 'starargs wrong for: ' + code + ': ' + si + ' != ' + opts.starargs)
    if (opts.kwargs != undefined):
        de(opts.kwargs, [x[0].name for x in func.args.kwargs])


parse_call_test('a, b, c', 3)
parse_call_test('*args', 1, {'starargs':[[0, 'args']]})
parse_call_test('a, b, *args', 3, {'starargs':[[2, 'args']]})
parse_call_test('a, *args, b, *a2', 4, {'starargs':[[1, 'args'], [3, 'a2']]})
parse_call_test('a=1', 0, {'kwargs':['a']})
parse_call_test('a=1, b', 1, {'kwargs':['a']})
parse_call_test('a=1, b, **kwargs, *args, **k2', 2, {'kwargs':['a'], 'kw':['kwargs', 'k2'], 'starargs':[[1,'args']]})
# }}}

# Test calling {{{

def f():
    return Array.prototype.slice.call(arguments)


de(f(1, 2, 3), [1, 2, 3])
args1, args2 = [4, 5, 6], [7, 8, 9]
kw1, kw2 = {'a':4, 'b':5, 'c':6}, {'a':7, 'x':8, 'y':9}

de(f(*args1), [4, 5, 6])
de(f(1, *args1), [1, 4, 5, 6])
de(f(*args1, 2), [4, 5, 6, 2])
de(f(1, *args1, 2), [1, 4, 5, 6, 2])
de(f(*args1, *args2), args1.concat(args2))
de(f(*args1, 1, 2, *args2, 3), [4, 5, 6, 1, 2, 7, 8, 9, 3])

de(f(1, a=2), [1, {'a':2}])
de(f(1, a=2, 3), [1, 3, {'a':2}])
de(f(**kw1), [kw1])
de(f(1, a=2, 3, **kw1), [1, 3, {'a':2, 'b':5, 'c':6}])
de(f(**kw2, 1, 3, **kw1, 2), [1, 3, 2, {'a':4, 'b':5, 'c':6, 'x':8, 'y':9}])

# }}}

# Test calling with definitions {{{

def f1(a, b, c):
    return a, b, c
de(f1(1, 2, 3), [1, 2, 3])
de(f1(), [undefined, undefined, undefined])

def f2(a, b=1):
    return a, b

de(f2(), [undefined, 1])
de(f2(1), [1, 1])
de(f2(1, 2), [1, 2])
de(f2(b=2), [undefined, 2])
de(f2(1, b=2), [1, 2])
de(f2({'b':3}), [{'b':3}, 1], 'a normal object is being treated as an options object')

def f3(*args):
    return args

de(f3(), [])
de(f3(1, 2), [1, 2])

def f4(**kwargs):
    return kwargs

de(f4(), {})
de(f4(a=1, b=2), {'a':1, 'b':2})

def f5(*args, **kwargs):
    return [args, kwargs]

de(f5(), [[], {}])
de(f5(1, 2, a=1, b=2), [[1,2], {'a':1, 'b':2}])

def f6(a, *args):
    return [a, args]

de(f6(), [undefined, []])
de(f6(1), [1, []])
de(f6(1, 2, 3), [1, [2, 3]])

def f7(a=1, **kw):
    return [a, kw]

de(f7(), [1, {}])
de(f7(a=3, b=4), [3, {'b':4}])

def f8(a, b=2, *args, **kwargs):
    return [a, b, args, kwargs]

de(f8(), [undefined, 2, [], {}])
de(f8(1), [1, 2, [], {}])
de(f8(1, 3, 4, 5, b=8, c=9), [1, 8, [4, 5], {'c':9}])

def f9(*args, **kwargs):
    return [args, kwargs]

de(f9(), [[], {}])
de(f9(1, 2, a=1, b=2), [[1,2], {'a':1, 'b':2}])

def f10(a, b=2, c=3):
    return [a, b, c]

de(f10(1, c=6), [1, 2, 6])

def f11(a, b, x=1):
    return [a, b, x]

de(f11(x=3), [undefined, undefined, 3])
# }}}

acc = []
def mutable_defaults(a=acc):
    a.append(1)

mutable_defaults(), mutable_defaults()
de([1, 1], acc)

def identity(f):
    return def():
        return f()

@identity
def wrapped(x=1):
    return x

eq(wrapped(), 1)

class W:
    @identity
    def wrapped(self, x=1):
        return x
eq(W().wrapped(), 1)
eq(1, (def(x=1): return x;)())

class Simple:

    def __init__(self, a, b):
        self.q = [a, b]
de(Simple(b=2, a=1).q, [1, 2])

class Other:
    def func(self, **kw):
        if self:
            return kw

class Test:

    def __init__(self, a, b=2, *args, **kwargs):
        self.q = [a, b, args, kwargs]
        self.other = Other()

    def forwarded(self, **kw):
        return self.other.func(**kw)

    def simple(self, a, b):
        return [a, b]

de(Test().q, [undefined, 2, [], {}])
de(Test(a=1).q, [1, 2, [], {}])
de(Test(1, 3, 4, 5, b=8, c=9).q, [1, 8, [4, 5], {'c':9}])
args = [1, 2]
de(Test(*args).q, [1, 2, [], {}])
t = Test()
de(t.simple(b=2, a=1), [1, 2])

@options_object
def callback(a, b=1, c=2):
    return [a, b, c]

de(callback(0, {'c':4}), [0, 1, 4])

def afunc(a=1):
    return a

def a2func(*args):
    return args[0]

eq(afunc(None), None)
eq(a2func(None), None)
de(Test().forwarded(a=1), {'a':1})

def norm(a, b):
    return [a, b]

de(norm(b=2, a=1), [1, 2])

call_counter = 0

def cc():
    nonlocal call_counter
    call_counter += 1
    return def():
        pass

cc()(a=1)
eq(call_counter, 1)
cc(o=1)(a=1)
eq(call_counter, 2)
call_counter = 0

def cc2():
    nonlocal call_counter
    call_counter += 1
    return {'val':3, 'x':def():return this.val;}
eq(3, cc2().x(a=1))
eq(call_counter, 1)
call_counter = 0

def cc3():
    nonlocal call_counter
    call_counter += 1
    this.num = call_counter
    this.c = def():
        return call_counter
eq(new cc3(a=1).num, 1)
eq(new cc3(a=1).c(b=9), 2)

class Pr:
    def __init__(self, a=1):
        self.a = a

    def add(self, val=0):
        self.a += val

class Pr2(Pr):

    def __init__(self):
        Pr.__init__(self, a=2)

    def add(self):
        Pr.add(self, val=1)

p = Pr(a=2)
p.add(val=3)
eq(p.a, 5)
p = Pr2()
p.add()
eq(p.a, 3)
p1, p2 = Pr(), Pr(a=1)
eq(p1.prototype, p2.prototype)
de(dir(p1), dir(p2))

class Prn:

    def __init__(self, x):
        self.x = x

class Prn1(Prn):

    def __init__(self, x, *a):
        Prn.__init__(self, [x, a])

class Prn2(Prn):

    def __init__(self, *a):
        Prn.__init__(self, a)


class Prn3(Prn):

    def __init__(self, *a):
        Prn.__init__(self, *a)

p = Prn1(1, 2, 3)
eq(p.x[0], 1)
de(p.x[1], [2, 3])
p = Prn2(1, 2)
de(p.x, [1, 2])
p = Prn3(1, 2)
eq(p.x, 1)


class Prnb:

    def __init__(self, a, k):
        self.a, self.k = a, k

class Prnb1(Prnb):

    def __init__(self, *a, **kw):
        Prnb.__init__(self, a, kw)

p = Prnb1(1, 2, x=1, y=2)
de(p.a, [1, 2])
de(p.k, {'x': 1, 'y':2})
