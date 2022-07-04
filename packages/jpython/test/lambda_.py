# No args
nothing = lambda: None

assert nothing() == None

# simple functions

add = lambda a, b: a + b
sub = lambda a, b: a - b

assert add(1, 2) == 3
assert sub(1, 2) == -1

# kwargs with defaults

f = lambda a, b=7, c=10: a + b * c
assert f(1, 2, 3) == 1 + 2 * 3
assert f(1, c=20) == 1 + 7 * 20
assert f(1, b=10) == 1 + 10 * 10
assert f(0) == 7 * 10

# vargs
f = lambda *args: args
assert list(f(['hello'])) == [['hello']]

assert list(f('hello', 'world')) == ['hello', 'world']

# varkwds

f = lambda **kwds: kwds
assert f(a=10) == {'a': 10}

# both

f = lambda *args, **kwds: [args, kwds]

v = f('hello', world='there')
assert list(v[0]) == ['hello']
assert v[1] == {'world': 'there'}

# Examples from people arguing about Python and lambda on Hacker News today
#

v = list(filter(lambda x: x < 10, map(lambda x: x * x, [1, 2, 3, 4])))
assert v == [1, 4, 9]

assert v == [x * x for x in [1, 2, 3, 4] if x * x < 10]


n = (lambda x: x+1 if \
     True \
     else x+x)\
     (10)
assert n == 11
