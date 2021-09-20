# vim:fileencoding=utf-8
# globals: ρσ_iterator_symbol, ρσ_set_polyfill, ρσ_dict_polyfill, assrt
nonlocal ρσ_set_implementation, ρσ_dict_implementation

class CustomIterable:

    def __init__(self, items):
        self.items = items

    def __iter__(self):
        return iter(self.items)

t = []
q = [1,2,3]
for x in CustomIterable(q):
    t.push(x)
assrt.deepEqual(q, t)

assrt.deepEqual(['a', 'b'], list('ab'))
assrt.ok(q is not list(q))
assrt.deepEqual(q, list(q))
assrt.ok(isinstance([], (String, list)))
assrt.ok(isinstance(1, int))
assrt.ok(not isinstance(v'new Number(1)', int))
assrt.ok(not isinstance(1.1, int))
assrt.ok(isinstance(1.1, float))
assrt.ok(not isinstance(v'new Number(1.1)', float))
m = Map()
m.set('a', 1)
assrt.equal(len(m), 1)
s = set()
s.add(1)
s.add(2)
assrt.equal(len(s), 2)
assrt.deepEqual(list(s), [1, 2])
assrt.deepEqual(s, {1, 2})

assrt.equal(chr(ord('a')), 'a')
assrt.equal(chr(ord('🐱')), '🐱')
assrt.equal(bin(3), '0b11')
assrt.equal(bin(-3), '-0b11')
assrt.equal(hex(10), '0xa')
assrt.equal(hex(-10), '-0xa')
t = []
for i in s:
    t.push(i)
assrt.deepEqual(t, [1, 2])

t = []
for i in m:
    t.push(i)
assrt.deepEqual(t, ['a'])
t = []
for c, i in enumerate(m):
    t.push([c, i])
assrt.deepEqual(t, [[0, 'a']])
assrt.deepEqual(['y', 'x'], [x for x in reversed('xy')])

# Test that the iterator created by iter() is itself iterable
assrt.deepEqual(s, set(iter(s)))

assrt.ok('a' in m)
assrt.ok(1 in s)
assrt.ok('1' not in s)

# getattr()
a = {'x':2}
assrt.equal(getattr(a, 'x'), 2)
assrt.equal(getattr(a, 'x', 1), 2)
assrt.equal(getattr(a, 'y', 1), 1)
assrt.throws(def():getattr(a, 'y');, AttributeError)

# int()/float()
assrt.equal(int('a', 16), 10)
assrt.throws(def ():int('a');, ValueError)
assrt.equal(float('10.3'), 10.3)
assrt.throws(def ():float('a');, ValueError)
assrt.equal(int(2*1e-7), 0)
assrt.equal(int(10*1e-7), 0)
assrt.equal(float(3*1e-7), 3e-7)

# sum()
assrt.equal(6, sum([1, 2, 3]))
assrt.equal(6, sum(iter([1, 2, 3])))
assrt.equal(5, sum([1, 2, 3], -1))
assrt.equal(5, sum(iter([1, 2, 3]), -1))

# map()/filter()/zip()
assrt.deepEqual(list(map(def(a):return a*2;, [1, 2])), [2, 4])
assrt.deepEqual(list(map(def(a):return a*2;, iter([1, 2]))), [2, 4])
assrt.deepEqual(list(filter(def(a):return a > 1;, [1, 2])), [2])
assrt.deepEqual(list(filter(def(a):return a > 1;, iter([1, 2]))), [2])
assrt.deepEqual(list(zip([1,2], [3,4])), [[1,3], [2, 4]])

# lists
a = [1, 2]
a.extend([3, 4])
assrt.deepEqual(a, [1,2,3,4])
assrt.ok(a == [1,2,3,4])
s = set([5, 6])
a.extend(s)
assrt.deepEqual(a, [1,2,3,4,5,6])
a.extend('12')
assrt.deepEqual(a, [1,2,3,4,5,6,'1','2'])
a = [1,2,3,4]
for index, val in [[0, 1], [1, 2], [3, 4]]:
    assrt.equal(a.index(val), index)
assrt.throws(def():a.index(8);, ValueError)
assrt.throws(def():a.index(1, 1);, ValueError)
assrt.throws(def():a.index(4, 1, 2);, ValueError)
assrt.equal(1, a.index(2, 1, 2))
assrt.throws(def():a.pypop(10);, IndexError)
assrt.equal(a.pypop(-1), 4)
assrt.deepEqual(a, [1,2,3])
assrt.equal(a.remove(2), None)
assrt.deepEqual(a, [1, 3])
assrt.throws(def():a.remove(2);, ValueError)
a = [1,2]
a.insert(0, 0)
assrt.deepEqual(a, [0, 1, 2])
a.insert(-1, 3)
assrt.deepEqual(a, [0, 1, 3, 2])
a.insert(a.length, 6)
assrt.deepEqual(a, [0, 1, 3, 2, 6])
assrt.deepEqual(a.copy(), a)
assrt.ok(a is not a.copy())
assrt.ok(a.copy().extend is not undefined)
a.clear()
assrt.equal(a.length, 0)
assrt.deepEqual(a.as_array(), a)
assrt.ok(a is not a.as_array())
assrt.ok(a.as_array().extend == undefined)
a = [1, 2, 1]
assrt.equal(a.count(1), 2)
a = [3, 2, 4, 1]
a.pysort()
assrt.deepEqual(a, [1,2,3,4])
a.pysort(reverse=True)
assrt.deepEqual(a, [4,3,2,1])
assrt.deepEqual(a, a.slice())
assrt.ok(a is not a.slice())
assrt.ok(a.slice().extend is not undefined)
assrt.deepEqual(a, a.concat())
assrt.ok(a is not a.concat())
assrt.ok(a.concat().extend is not undefined)
assrt.deepEqual(list(a[ρσ_iterator_symbol]()), a)
assrt.equal(a.length, a.__len__())
assrt.equal(a.length, len(a))
assrt.ok(a.__contains__(a[0]))
assrt.ok([x for x in [1]].extend is not undefined)

class C:
    def __contains__(self, x):
        return x == 1
assrt.ok(1 in C())
assrt.ok(2 not in C())

# sets
def test_sets():
    a = set([1, 2, 3])
    assrt.ok(isinstance(a, set))
    assrt.ok(a.has(1))
    assrt.ok(not a.has(9))
    assrt.deepEqual(a, {1,2,3})
    assrt.ok(len(a) == 3)
    assrt.ok(a.length == 3)
    assrt.ok(a.size == 3)
    assrt.ok(not a.has('1'))
    x = a.copy()
    assrt.deepEqual(a, x)
    assrt.ok(a is not x)
    b, c = {}, {}
    a.add(b)
    assrt.ok(b in a)
    assrt.ok(c not in a)
    assrt.ok(None not in a)
    a.add(None)
    assrt.ok(None in a)
    a.discard(None)
    assrt.ok(None not in a)
    a.clear()
    assrt.ok(a.length == 0)
    assrt.deepEqual({1,2,3}.difference({2}, {3}), {1})
    a = {1, 2, 3}
    a.difference_update({2}, {3})
    assrt.deepEqual(a, {1})
    assrt.deepEqual({1,2,3}.intersection({2, 3}, {3}), {3})
    a = {1, 2, 3}
    a.intersection_update({2, 3}, {3})
    assrt.deepEqual(a, {3})
    assrt.ok({1}.isdisjoint({2}))
    assrt.ok(not {1}.isdisjoint({1}))
    assrt.ok({1}.issubset({1, 2}))
    assrt.ok({1}.issubset({1}))
    assrt.ok(not {1}.issubset({2}))
    assrt.ok({1, 2}.issuperset({1, 2}))
    assrt.ok({1, 2}.issuperset({1}))
    assrt.ok(not {1}.issuperset({2}))
    a = set()
    assrt.throws(def():a.pop();, KeyError)
    assrt.equal({1}.pop(), 1)
    assrt.throws(def ():a.remove(1);, KeyError)
    a = {1}
    a.remove(1)
    assrt.equal(a.length, 0)
    assrt.deepEqual({1,2,3}.symmetric_difference({2, 3, 4}), {1, 4})
    a = {1, 2, 3}
    a.symmetric_difference_update({2, 3, 4})
    assrt.deepEqual(a, {1, 4})
    assrt.deepEqual({1,2}.union({3, 4}, {1, 5}), {1, 2, 3, 4, 5})
    a = {1}
    a.update({1, 2})
    assrt.deepEqual(a, {1, 2})

test_sets()
ρσ_set_implementation = ρσ_set_polyfill  # noqa:undef
test_sets()
ρσ_set_implementation = Set

def test_dicts():
    from __python__ import dict_literals, overload_getitem
    assrt.deepEqual({1:1, 2:2}, {1:1, 2:2})
    a = {1:1, 2:2}
    assrt.ok(isinstance(a, dict))
    assrt.ok(1 in a), assrt.ok(3 not in a), assrt.ok('1' not in a)
    assrt.deepEqual(set(a), {1, 2})
    assrt.ok(set(a) == {1, 2})
    assrt.equal({1:2}[1], 2)
    assrt.throws(def():a['1'];, KeyError)
    assrt.equal(a.length, 2), assrt.equal(len(a), 2)
    assrt.equal(a[1], 1)
    a[1] = 3
    assrt.equal(a[1], 3)
    assrt.ok(a is not a.copy()), assrt.deepEqual(a, a.copy())
    a.clear()
    assrt.equal(a.length, 0), assrt.deepEqual(list(a), [])
    assrt.deepEqual(set({1:9, 2:8}.keys()), {1, 2})
    assrt.deepEqual(set({1:9, 2:8}.values()), {8, 9})
    items = [list_wrap(x) for x in {1:9, 2:8}.items()]
    items.sort()
    assrt.deepEqual(items, [[1,9], [2, 8]])
    a = {1:1, 2:2}
    assrt.equal(a.get(1), 1), assrt.equal(a.get(3), None)
    assrt.equal(a.set_default(2, 2), 2)
    assrt.equal(a.set_default(3, 3), 3), assrt.equal(a[3], 3)
    assrt.deepEqual(dict.fromkeys([1, 2], 3), {1:3, 2:3})
    a = {1:3, 2:3}
    assrt.equal(a.pop(2, 2), 3), assrt.equal(a.pop(2, 2), 2)
    assrt.throws(def(): a.pop(2);, KeyError)
    assrt.deepEqual(a.popitem(), v'[1, 3]')
    assrt.throws(def():a.popitem();, KeyError)
    a = {1:1}
    a.update({2:2, 1:3})
    assrt.deepEqual(a, {1:3, 2:2})

test_dicts()
ρσ_dict_implementation = ρσ_dict_polyfill  # noqa:undef
test_dicts()
ρσ_dict_implementation = Map


a = {1:1}
b = None
assrt.equal(a == b, False)
assrt.equal(b == a, False)

a, b = range(1111111111)
assrt.equal(a, 0)
assrt.equal(b, 1)
assrt.equal(len(range(10)), 10)
assrt.equal(str(range(10)), 'range(0, 10, 1)')

assrt.deepEqual(divmod(7, 3), [2, 1])
assrt.deepEqual(divmod(-7, 3), [-3, 2])
assrt.deepEqual(divmod(-7, -3), [2, -1])
assrt.deepEqual(divmod(7, -3), [-3, -2])
assrt.throws(def():divmod(1, 0);, ZeroDivisionError)


assrt.equal(1, min(1, 2))
assrt.equal(2, max(1, 2))
assrt.equal(2, max(range(3)))
assrt.equal(0, min(range(3)))
assrt.equal(0, min([0, 1, 2]))
assrt.equal(2, max([0, 1, 2]))
assrt.throws(def(): min();, TypeError)
assrt.throws(def(): max([]);, TypeError)
assrt.equal(9, max(defval=9))
assrt.equal(9, max([], defval=9))
assrt.equal(1, max([{'k':0}, {'k':1}], key=def(x): return x.k;))
