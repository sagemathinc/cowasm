# globals: assrt, ρσ_last_exception

import traceback

def throw_test(code):
    assrt.throws(def():
        RapydScript.parse(code, {'filename':code}).body[0]
    , RapydScript.SyntaxError)

# unary operators
assrt.equal(-(1), -1)
assrt.equal(-(-1), 1)
assrt.equal(+(+1), 1)

# arithmetic
assrt.equal(3**4, Math.pow(3, 4))
assrt.equal(100**-2, Math.pow(100, -2))
assrt.equal(2*5**2*3, 150)
assrt.equal(-2**2, -4)
assrt.equal((-2)**2, 4)
assrt.equal(pow(2, 2, 2), 0)
assrt.equal(100 // 3, 33)
assrt.equal(-100 // 3, -34)
a = 100
a //= 3
assrt.equal(a, 33)
assrt.equal(0b11, 3)
assrt.ok(42 / "x" is NaN)
assrt.ok(42 is not NaN)
assrt.ok(NaN is parseInt('asd', 10))
assrt.ok('NaN' is not 42 / 'x')

# comparisons
assrt.ok(3<5<7)
assrt.equal(-1 < 0 == 1 < 0, False)

# Empty tuple
assrt.deepEqual((), [])

# Conditional operators
assrt.equal(1 if True else 2, 1)
assrt.equal(1
             if True else 2, 1)
assrt.deepEqual([x for x in ("asd" if True else "xyz") if x], 'asd'.split(''))
assrt.deepEqual((1, [x for x in [2] if x]), [1, [2]])

# Comprehensions
assrt.deepEqual([a+1 for a in [1,2,3] if a > 1], [3, 4])
assrt.deepEqual({a+1:a+2 for a in [1,2,3] if a > 1}, {3:4, 4:5})
assrt.deepEqual({a+1 for a in [1,2,3] if a > 1}, set([3, 4]))
assrt.deepEqual([(a+1, 1) for a in [1,2,3] if a > 1], [[3, 1], [4, 1]])

# Destructuring assignment
a, (b, (c, d)), e = [1, [2, [3, 4]], 5]
assrt.deepEqual([a, b, c, d, e], [1, 2, 3, 4, 5])
for x, (y, z) in [ [1, [2, 3]] ]:
    assrt.deepEqual([x, y, z], [1, 2, 3])
assrt.deepEqual([ [x, y, z, w] for ((x, y), (z, w)) in [ [[1, 2], [3, 4]] ] ],
                 [[1, 2, 3, 4]])
assrt.deepEqual([ [x, y, z] for x, (y, z) in [ [1, [2, 3] ] ]],
                 [[1, 2, 3]])
(a, b) = [1, 2]
assrt.deepEqual([a, b], [1, 2])
(a, (b, c)) = [1, [2, 3]]
assrt.deepEqual([a, b, c], [1, 2, 3])

# Chained assignment
a = b = 11
assrt.deepEqual([a, b], [11, 11])
def inc():
    nonlocal a
    a += 1
    return a
a = b = inc()
assrt.deepEqual([a, b], [12, 12])
a, b = c, d = 1, 2
assrt.deepEqual([a, b, c, d], [1, 2, 1, 2])
(a, b) = [c, d] = 1, 2
assrt.deepEqual([a, b, c, d], [1, 2, 1, 2])
a, (x, b) = c, d = [1, [2, 3]]
assrt.deepEqual([a, x, b, c, d], [1, 2, 3, 1, [2, 3]])
a, b = [c, d] = [e, f] = [1, 2]
assrt.deepEqual([a, b, c, d, e, f], [1, 2, 1, 2, 1, 2])
a = b, c = 1, 2
assrt.deepEqual([a, b, c], [[1,2], 1, 2])

throw_test('a += b += 1')
throw_test('a += 1, 2 += b')
throw_test('a += [1, 2] += b')
throw_test('function = 1')
throw_test('def function():\n pass')
throw_test('class function:\n pass')
throw_test('while 1:\npass')
throw_test('def f():\n while 1:\n pass')
throw_test('1 1')
throw_test('z = x y')
throw_test('while a = 1: pass')
throw_test('while 1\n   pass')
throw_test('for a in [1]\n   pass')

# object literals
{1:
 1
   }  # Check that arbitrary indentation is allowed after : for an object literal key

# strict equality
assrt(1 == 1)                  # number vs number: ok
assrt(True == True)            # boolean vs boolean: ok
assrt(not (1 == True))         # number vs boolean: NEVER equal
assrt(1 != True)               # number vs boolean: NEVER equal
assrt(not ("" == False))       # string vs boolean: NEVER equal
assrt(not ("0" == 0))          # string vs integer: NEVER equal
assrt(not ("" == 0))           # string vs integer: NEVER equal
assrt(bool(1) == True)         # boolean conversion
assrt(bool("") == False)       # boolean conversion
assrt(v'1 == true')         # javascript override
assrt(not v'(1 != true)')   # javascript override
assrt(v'String("test")' == "test")  # this should do string conversion rather than creating a string object
assrt(String("test") != "test")        # this should create a string object


# raw JavaScript
v'var def = {}'                # ability to bypass reserved keywords in declaration
v'def'.item = 3            # ability to use reserved keywords
assrt(v'def.item' == 3)

n = 5
assrt.equal(v"""
(function() {
    var s = 0
    for (var i=0; i<=n; i++) {
        s += i
    }
    return s
})()
""", (def():
    s = 0
    for i in range(n+1):
        s += i
    return s
)())                        # shared scoping and equivalent capability
a = []
for v'var i = 0; i < 1; i++':
    a[i] = 1  # noqa: undef
assrt.deepEqual(a, [1])

# String literals
a = '\u00ad'
assrt.equal(a.charCodeAt(0), 0xad)
# String literal concatenation

assrt.equal('1' '2', '12')
assrt.equal('1'
             '2' '3', '123')
assrt.equal(u'a', 'a')
assrt.equal('a' * 5, 'aaaaa')
assrt.ok(isinstance('a', str))

# Various bits of miscellaneous code that caused parser infinite loops and other breakage
throw_test('for a in b:\\n 1+1')

def localvars_in_comprehension():
    return {k:i for i, k in enumerate([1,2])}
assrt.deepEqual(localvars_in_comprehension(), {'1':0, '2':1})

# Numbers
assrt.equal(1e2, 100)
assrt.equal(-1e2, -100)
assrt.equal(1e+2, 100)
assrt.equal(1E-1, 0.1)

# Equality operators

class D:

    def __init__(self, data):
        self.data = data

    def __eq__(self, other):
        return self.data == other.data

assrt.ok(D(1) == D(1))
assrt.ok(D(2) != D(1))
assrt.ok(D(1) == {'data':1})
assrt.ok({'data':1} == D(1))

arr = []
{} == arr.append(2)
assrt.ok(arr.length is 1)

call_count = 0
def cc():
    nonlocal call_count
    call_count += 1
    return [1]
cc()[-1]
assrt.equal(call_count, 1)

# Test the del operator

# JS object
deleteme = {1:1}
assrt.ok(Object.keys(deleteme).indexOf('1') is not -1)
del deleteme[1]
assrt.ok(Object.keys(deleteme).indexOf('1') is -1)

# list
deleteme = [1, 2]
del deleteme[0]
assrt.equal(deleteme.length, 1)
assrt.deepEqual(deleteme, [2])
deleteme = [1, 2, 3]
del deleteme[::2]
assrt.deepEqual(deleteme, [2])
deleteme = [1, 2, 3]
del deleteme[::1]
assrt.equal(deleteme.length, 0)
deleteme = [1, 2, 3]
del deleteme[1:2]
assrt.deepEqual(deleteme, [1, 3])

# global
del deleteme

# python dict
from __python__ import dict_literals, overload_getitem
deleteme = {1:1, 2:2}
assrt.ok(1 in deleteme)
del deleteme[1]
assrt.ok(1 not in deleteme)
assrt.equal(len(deleteme), 1)

# Asserts

assrt.throws(def():
    assert 0
, AssertionError
)
assrt.throws(def():
    assert 0, 'xdx'
, /xdx/
)

# Exceptions

class MyException(Exception):

    def __init__(self, message, val):
        Exception.__init__(self, message)
        self.val = val

try:
    raise MyException('xxx', 3)
except MyException as e:
    assrt.equal(e.name, 'MyException')
    assrt.equal(e.message, 'xxx')
    assrt.equal(e.val, 3)
    assrt.equal(e.toString(), 'MyException: xxx')
    assrt.ok(v'e instanceof MyException')
    assrt.ok(v'e instanceof Error')

try:
    raise Error('eee')
except Exception:
    # Test that we can catch JS errors and that local variables in the except block are declared
    xxlocalvar = 1
    assrt.equal(xxlocalvar, 1)

def errf():
    raise MyException()

try:
    errf()
except MyException as e:
    fe = traceback.format_exception()
    assrt.ok(str.strip(fe[-2]).startsWith('at errf'))


def stackf():
    return traceback.format_stack()
assrt.ok(str.strip(stackf()[-1]).startsWith('at stackf'))


def else_without_finally(fail):
    ans = []
    try:
        if fail:
            raise Exception('a')
        ans.push('ok')
    except:
        ans.append('ex')
    else:
        ans.append('el')
    return ans

def else_with_finally(fail):
    ans = []
    try:
        if fail:
            raise Exception('a')
        ans.push('ok')
    except:
        ans.push('ex')
    else:
        ans.push('el')
    finally:
        ans.push('fi')
    return ans

def exc_in_else():
    ans = []
    try:
        try:
            ans.push('ok')
        except:
            pass
        else:
            raise Exception('1')
        finally:
            ans.push('fi')
    except:
        ans.push('ex')
    return ans

assrt.deepEqual(else_without_finally(), ['ok', 'el'])
assrt.deepEqual(else_without_finally(True), ['ex'])
assrt.deepEqual(else_with_finally(), ['ok', 'el', 'fi'])
assrt.deepEqual(else_with_finally(True), ['ex', 'fi'])
assrt.deepEqual(exc_in_else(), ['ok', 'fi', 'ex'])

# Existential operator

assrt.ok(not gfsgs?)
assrt.equal(gfsgs ? 1, 1)
assrt.equal(gfsgs?.b, undefined)
assrt.equal(gfsgs?(), undefined)  # noqa: undef
undef = undefined
assrt.ok(not undef?)
undef = None
assrt.ok(not undef?)
undef = 0
assrt.ok(undef?)
assrt.equal(undef?(), undefined)
assrt.equal(undef?.xxx?(), undefined)
assrt.equal(undef.a, undefined)
assrt.equal(undef[1], undefined)
assrt.equal(undef ? 1, 0)
ml = 1, '''
'''
assrt.deepEqual(ml, [1, '\n'])


# localvars in conditions

gv = 1
(def ():
    if (gv = 2):
        pass
    assrt.equal(gv, 2)
)()
assrt.equal(gv, 1)

assrt.ok(1 not in [2, 3])
assrt.ok(1 in [1, 2])
assrt.ok("1" + "2" in ["12", "x"])
assrt.ok("1" + "2" not in ["1", "2"])
if "1" + "2" not in ["1", "2"]:
    assrt.ok(1)
else:
    assrt.ok(0)
