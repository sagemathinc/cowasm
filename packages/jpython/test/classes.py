# globals: assrt

# empty classes are allowed
class Blank:
    pass
blank = Blank()
assrt.ok(isinstance(blank, Blank))

# basic class
class Human:

    HAIRS = 23

    def __init__(self, name):
        self.name = name

    def greet(self):
        return "Hello, I'm " + self.name

    @staticmethod
    def getTypicalWeight():
        return "150"

    @staticmethod
    def with_arg(x):
        return x


# don't have to declare __init__, it either gets inherited or stays empty
# isinstance correctly sees inheritance
class Friend(Human):
    def greet(self):
        return "Yo, it's me, " + self.name

    def nickname(self, name):
        self.name = name

# __init__ doesn't have to come first
# can call methods of other classes
class OldFriend(Friend):
    def how_long(self):
        return "I've known you for " + self.duration + " years"
    def get_bound_method(self):
        return self.how_long.bind(self)
    def __init__(self, name, duration):
        self.duration = duration
        Friend.__init__(self, name)

bob = Human("Bob")
assrt.equal(bob.greet(), "Hello, I'm Bob")
assrt.equal(Human.greet(bob), "Hello, I'm Bob")
assrt.equal(Human.getTypicalWeight(), "150") # static method recognition
assrt.equal(Human.with_arg(3), 3) # static method with arg
assrt.equal(Human.HAIRS, 23)

joe = Friend("Joe")
assrt.equal(joe.greet(), "Yo, it's me, Joe")
assrt.ok(isinstance(joe, Friend))
assrt.ok(isinstance(joe, Human))

angela = OldFriend("Angela", 8)
assrt.equal(angela.greet(), "Yo, it's me, Angela")
assrt.equal(angela.how_long(), "I've known you for 8 years")

# test that function stays bound
bound = angela.get_bound_method()
assrt.equal(bound(), angela.how_long())

# function methods
assrt.deepEqual(dir(angela).sort(), [
    'HAIRS',
    "__init__",
    '__repr__',
    '__str__',
    "constructor",
    "duration",
    "get_bound_method",
    "greet",
    "how_long",
    "name",
    "nickname",
])

# test that binding works in relation to the actual class, not the parent
angela.nickname("Angie")
assrt.equal(angela.greet(), "Yo, it's me, Angie")

dude = None
(def fake_module():
    # test that we can declare classes inside other blocks
    # test that we can call methods of classes we didn't inherit from
    nonlocal dude
    class Stranger(Human):
        def greet(self):
            return Friend.greet(self)
    dude = Stranger("some guy")
)()
assrt.equal(dude.greet(), "Yo, it's me, some guy")
# also test that classes declared this way are not globally scoped (while normal ones are)
assrt.throws(
    def():
        Friend("another friend")
        Stranger("another guy")  # noqa:undef
    ,
    /Stranger is not defined/
)

# attributes
assrt.ok(hasattr(dude, "greet"))
assrt.equal(getattr(dude, "greet").bind(dude)(), "Yo, it's me, some guy") # function stays bound after binding
assrt.equal(hasattr(dude, "stuff"), False)
setattr(dude, "stuff", True)
assrt.ok(hasattr(dude, "stuff"))

# native classes and methods
st = String("test")
assrt.equal(st, "test")
assrt.equal(st.toUpperCase(), "TEST")
assrt.equal(String.toUpperCase(st), "TEST")
assrt.equal(String.fromCharCode(65), "A") # static method recognition

# now we test RapydScript's ability to insert 'new' operator correctly
assrt.ok(String('a') != 'a')   # string literal vs string object
assrt.ok((String)('a') == 'a') # string literal vs string literal
assrt.ok(String.call(this, 'a') == 'a') # string literal via static method on string

# self consistency
class Counter:
    def __init__(s, n=0):
        s.count = n # first arg becomes 'self'
    def getIncrementer(self):
        return def():
            self.count += 1
c = Counter(5)
inc = c.getIncrementer()
inc()
assrt.equal(c.count, 6)

# nested classes
# not yet fully implemented
#class Molecule:
#   class Atom:
#       def __init__(self, element):
#           self.element = element
#
#   def __init__(self, elements):
#       self.structure = []
#       for e in elements:
#           self.structure.push(Molecule.Atom(e))
#
#water = Molecule(['H', "H", 'O'])
#assrt.equal(len(water.structure), 3)
#assrt.equal(water.structure[0].element, 'H')
#for atom in water.structure:
#   assrt.ok(isinstance(atom, Molecule.Atom))

# starargs and method decorators
def negate(fn):
    def wrapped(*args):
        return -fn(*args)
    return wrapped

def add_pi(cls):
    cls.prototype.pi = 3.14
    return cls

@add_pi
class Math:
    def sum(s, *args):
        # fakearg simply tests that offsets work correctly
        ttl = 0
        for i in args:
            ttl += i
        return ttl
    def concatSum(s, string, *nums):
        return string + s.sum(*nums)
    @negate
    def plus(s, a, b):
        return a+b

m = Math()
assrt.equal(m.sum(1,2,3), 6)
assrt.equal(m.sum(1,*[2,3]), 6)
assrt.equal(m.concatSum("foo", 1, 2, 5), "foo8")
assrt.equal(m.plus(2, 5), -7)
assrt.equal(m.pi, 3.14)


class CV():

    a = b = 1
    c = a + b
    if True:
        d = 1
    else:
        d = 2

    def one(self):
        return 1
    two = one

c = CV()
assrt.deepEqual([c.a, c.b, c.c, c.d], [1, 1, 2, 1])
assrt.equal(c.one(), c.two())


class Properties:

    def __init__(self):
        self._a = 19
        assrt.equal(self.a, 19)

    @property
    def a(self):
        return self._a

    @a.setter
    def a(self, val):
        self._a = val

    @property
    def b(self):
        return 1

    def c(self):
        return self.a

class A:
    @property
    def val(self):
        return 'a'

    @property
    def parent(self):
        return 'parent'

class B(A):
    @property
    def val(self):
        return 'b'


p = Properties()
assrt.equal(p._a, p.a)
p.a = 11
assrt.equal(11, p.a)
assrt.equal(p.c(), p.a)
assrt.equal(p.b, 1)
assrt.throws(
    def():
        p.b = 2
)
p = B()
assrt.equal(p.val, 'b')
assrt.equal(p.parent, 'parent')
assrt.equal(id(p), id(p))
assrt.notEqual(id(p), id(B()))

class Context:

    val = 1

    def __enter__(self):
        self.val = 2
        return self

    def __exit__(self):
        self.val = 3
        return True

with Context() as c:
    assrt.eq(c.val, 2)
assrt.equal(c.val, 3)

with Context() as d:
    assrt.equal(d.val, 2)
    raise Exception('error')
assrt.equal(d.val, 3)

class Throws:

    def __enter__(self):
        pass

    def __exit__(self):
        pass

assrt.throws(
    def ():
        with Throws():
            raise Exception('error')
    , Exception
)

class X:

    def __init__(self):
        self.a = 3

class Y(X):
    pass

class Z(Y):
    pass

assrt.equal(Z().a, X().a)
assrt.ok(repr(Z()).indexOf('<__main__.Z') == 0)
assrt.ok(str(Z()).indexOf('<__main__.Z') == 0)

from __python__ import bound_methods

class U:

    def __init__(self, a):
        self.a = a

    def val(self):
        return self.a

u = U(3)
f = u.val
assrt.equal(f(), u.val())

class U2(U):

    def val(self):
        return self.a * 2

u = U2(3)
f = u.val
assrt.equal(f(), 6)

class M1:

    def f1(self):
        return 'M1-f1'

    def f3(self):
        return 'M1-f3'

class M0:

    def f0(self):
        return 'M0-f0'

class M2(M0):

    @property
    def prop(self):
        return self._p or 'prop'

    @prop.setter
    def prop(self, val):
        self._p = val

    def f1(self):
        return 'M2-f1'

    def f2(self):
        return 'M2-f2'

    def f3(self):
        return 'M2-f3'

class Child(M1, M2):

    def f3(self):
        return 'Child-f3'

c = Child()
assrt.equal(c.f0(), 'M0-f0')
assrt.equal(c.f1(), 'M1-f1')
assrt.equal(c.f2(), 'M2-f2')
assrt.equal(c.f3(), 'Child-f3')
assrt.equal(c.prop, 'prop')
c.prop = 1
assrt.equal(c.prop, 1)
assrt.ok(isinstance(c, Child))
assrt.ok(isinstance(c, M1))
assrt.ok(isinstance(c, M2))
assrt.ok(isinstance(c, M0))


class B1:

    def __init__(self):
        self.b1 = 1

    def one(self):
        return self.two()

    def two(self):
        return self.b1

class B2(B1):

    def __init__(self):
        self.b2 = 2
        B1.__init__(self)

    def two(self):
        return self.b2
assrt.equal(B2().two(), 2)
assrt.equal(B2().b1, 1)


class Cvar:
    a = b = 0
    def __init__(self):
        Cvar.a += 1

    def inc(self):
        Cvar.a += 1

    def val(self):
        return Cvar.a

    def incb(self):
        Cvar.b += 1
        return Cvar.b

assrt.equal(Cvar.a, 0)
c = Cvar()
assrt.equal(Cvar.a, 1)
c.inc()
assrt.equal(Cvar.a, 2)
assrt.equal(Cvar().val(), 3)
assrt.equal(Cvar().incb(), 1)
assrt.equal(Cvar().incb(), 2)

class anon_func_in_class:

    f = def():
        func_var = 1
        return func_var

    def func_var(self):
        pass

assrt.equal(jstype(anon_func_in_class.prototype.func_var), 'function')
anon_func_in_class.prototype.f()
assrt.equal(jstype(anon_func_in_class.prototype.func_var), 'function')


def decorate(cls):
    assrt.equal(cls.prototype.somevar, 1)
    return cls


@decorate
class decorated:
    somevar = 1
