def xgcd(a, b):
    prevx, x = 1, 0
    prevy, y = 0, 1
    while b:
        q, r = divmod(a, b)
        x, prevx = prevx - q * x, x
        y, prevy = prevy - q * y, y
        a, b = b, r
    return a, prevx, prevy


def inverse_mod(a, N):
    """
    Compute multiplicative inverse of a modulo N.
    """
    if a == 1 or N <= 1:  # common special cases
        return a % N
    [g, s, _] = xgcd(a, N)
    if g != 1:
        raise ZeroDivisionError
    b = s % N
    if b < 0:
        b += N
    return b


class Mod:
    def __init__(self, x, n):
        self.n = int(n)
        self.x = int(x) % self.n
        if self.x < 0:
            self.x += self.n

    def __eq__(self, right):
        if not isinstance(right, Mod):
            try:
                right = Mod(right, self.n)
            except:
                return False
        return self.x == right.x and self.n == right.n

    def __pow__(self, right, n):  # not implemented yet
        """Dumb algorithm, of course."""
        if n == 0:
            return Mod(1, self.n)
        ans = Mod(self.x, self.n)
        for i in range(n - 1):
            ans *= self
        return ans

    def __add__(self, right):
        return Mod(self.x + right.x, self.n)

    def __mul__(self, right):
        return Mod(self.x * right.x, self.n)

    def __sub__(self, right):
        return Mod(self.x - right.x, self.n)

    def __div__(self, right):
        if right.x != 1:
            raise NotImplementedError
        return Mod(self.x, self.n)

    def __truediv__(self, right):
        return Mod(self.x * inverse_mod(right.x, self.n), self.n)

    def __floordiv__(self, right):
        """Silly arbitrary meaning of this for TESTING."""
        return Mod(self.x // right.x, self.n)

    def __repr__(self):
        print(f"Mod({self.x}, {self.n})")

    def __str__(self):
        print(f"Mod({self.x}, {self.n})")

class Mod_inplace(Mod):
    def __iadd__(self, right):
        self.x = (self.x + right.x) % self.n
        return self

    def __imul__(self, right):
        self.x = (self.x * right.x) % self.n
        return self

    def __isub__(self, right):
        self.x = (self.x - right.x) % self.n
        if self.x < 0:
            self.x += n
        return self

    def __idiv__(self, right):
        if right.x != 1:
            raise NotImplementedError
        return self



def test1():
    #print('test1')
    a = Mod(3, 10)
    b = Mod(5, 10)
    c = a * b
    assert c.x == 5
    assert (a * (b / a)).x == b.x
    assert (b // a).x == 1


test1()


def test_arith():
    #print("test_arith")
    a = Mod(17, 35)
    b = Mod(2, 35)
    assert a + b == Mod(19, 35)
    assert b - a == 20


test_arith()


def test_inplace_fallback():
    a = Mod(3, 12)
    b = Mod(2, 12)
    a['foo'] == 'bar'
    a += b
    assert a == Mod(5, 12)
    assert !a['foo']
    a *= b
    assert a == Mod(10, 12)
    a -= b
    assert a == Mod(8, 12)
    c = Mod(1,12)
    a /= c
    assert a== Mod(8, 12)
test_inplace_fallback()


def test_inplace():
    a = Mod_inplace(3, 12)
    a['foo'] = 'bar'
    b = Mod_inplace(2, 12)
    a += b
    assert a['foo'] == 'bar'
    assert a == Mod_inplace(5, 12)
    a *= b
    assert a == Mod_inplace(10, 12)
    a -= b
    assert a == Mod_inplace(8, 12)
    c = Mod(1,12)
    a /= c
    assert a== Mod_inplace(8, 12)
test_inplace()

def test_equality():
    #print("test_equality")
    a = Mod(3, 10)
    b = Mod(5, 10)
    assert not (a == b)
    assert a == a
    assert b == b
    assert a != b
    assert a == 13
    assert a != 'fred'


test_equality()


class IntegerModRing:
    def __init__(self, n):
        self._n = n

    def __repr__(self):
        return f"Ring of Integers Modulo {self._n}"

    def __call__(self, x):
        return Mod(x, self._n)


# We have chosen NOT to allow overloading
# of __call__, since I can't find any way
# to do it sufficiently efficiently.  We
# are NOT implemented the full Python language.
# That's not the goal.


def test_integer_mod_ring():
    R = IntegerModRing(10)
    assert repr(R) == 'Ring of Integers Modulo 10'
    a = R.__call__(13)
    assert (a == Mod(3, 10))


test_integer_mod_ring()


class ComplicatedCall:
    def __call__(self, x, *args, **kwds):
        return [x, args, kwds]


def test_complicated_call():
    C = ComplicatedCall()
    v = C(10)
    assert v[0] == 10
    # little awkward so test passes in pure python too
    assert len(v[1]) == 0
    assert v[2] == {}

    v = C(10, 'y', z=2, xx='15')
    assert v[0] == 10
    assert v[1][0] == 'y'
    assert v[2] == {'z': 2, 'xx': '15'}


test_complicated_call()


def test_attribute_call():
    R = IntegerModRing(10)
    z = {'R': R}
    # We only implement __call__ in a special case
    # that does NOT include this.  The lhs must be an identifier.
    assert z['R'].__call__(3) == Mod(3, 10)


test_attribute_call()

### Absolute value


class X:
    def __abs__(self):
        return 10


assert abs(X()) == 10
