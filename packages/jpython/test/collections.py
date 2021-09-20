# globals: assrt
# ARRAYS

# immutables
a = [4,5,6,7]

# mutables
class Item:
    pass
i0 = Item()
i1 = Item()
i2 = Item()
b = [i0, i1]
assrt.ok(i0 != i1)

# access and slicing
i = -1
assrt.equal(len(a), 4)
assrt.equal(a[-1], 7)
assrt.equal(a[i], a[-1])
assrt.equal(a[-2], 6)
assrt.deepEqual(a[1:3], [5,6])
assrt.deepEqual(a[:3], [4,5,6])
assrt.deepEqual(a[2:], [6,7])
assrt.ok(7 in a)
assrt.ok(i1 in b)
assrt.ok(i2 not in b)
assrt.ok(b == b.copy())
assrt.ok([1] in [[1], [2]])
assrt.ok([3] not in [[1], [2]])

if jstype(Symbol) is 'function':
    ss = Symbol('s')
    sym = {ss:1}
    assrt.equal(sym[ss], 1)
def keyf():
    return 1
assrt.equal({keyf():2}[keyf()], 2)

# assignment
a[-1] = 9
assrt.equal(a[-1], 9)
s = [0,1,2,3,4]
s[:2] = [8, 9]
assrt.deepEqual(s, [8,9,2,3,4])
s[1:2] = [5]
assrt.deepEqual(s, [8,5,2,3,4])
s[-2:] = [1,2]
assrt.deepEqual(s, [8,5,2,1,2])

# extended slices
b = list(range(11))
s = 'abcde'
assrt.deepEqual(b[::2], [0, 2, 4, 6, 8, 10])
assrt.deepEqual(b[::-1], list(range(10,-1,-1)))
assrt.deepEqual(b[7:0:-1], [7, 6, 5, 4, 3, 2, 1])
assrt.deepEqual(b[7:1:-2], [7, 5, 3])
assrt.equal(s[::2], 'ace')
assrt.equal(s[::-1], 'edcba')
assrt.equal(s[4:0:-1], 'edcb')
assrt.equal(s[4:1:-2], 'ec')

# sorting
a = [2,1,3]
a.pysort(key=def(x):return 0;)
assrt.deepEqual(a, [2,1,3])  # stable sort
a.pysort(reverse=True)
assrt.deepEqual(a, [3,2,1])
a.pysort()
assrt.deepEqual(a, [1,2,3])

# misc interface
a = [1,2,3]
assrt.equal(a.pypop(), 3)
assrt.deepEqual(a, [1,2])
assrt.equal(a.pypop(0), 1)
assrt.deepEqual(a, [2])

# strings
assrt.ok("tes" in "this is a test")

one = "one"
two = "two"
one, two = two, one
[x, y, z] = 'x', 'y', 'z'
assrt.equal(one, "two")
assrt.equal(two, "one")
assrt.equal(x, 'x')
assrt.equal(y, 'y')
assrt.equal(z, 'z')


# DICTIONARIES
d0 = {'a':'b','c':2, 'd':		'd',}
d1 = {
	'foo': 1,
	"bar": "baz",
	"fun1": def():
		return 5
	,
	'fun2': def(c):
		return c+1
}
d2 = dict([[1,2], [2,3]], a='b')

# access
assrt.ok('foo' in d1)
assrt.equal(d0.a, d0['a'])
assrt.equal(d1['fun1'](), 5)
assrt.equal(d1.fun2(3), 4)
assrt.equal(len(d0), 3)
assrt.equal(d2.get(1), 2)
assrt.equal(d2.get('a'), 'b')

# assignment
d1["bar"] += "!"
assrt.equal(d1.bar, "baz!")

# nested comparisons
x = 3
assrt.ok(1 < x <= 3)
assrt.ok(1 < x*x > 3)
assrt.ok(1 < (x+=1) < 5) # check that only one increment occurs
assrt.equal(x, 4)

# list comprehensions
e0 = [i*i for i in [0,1,2,3]]
e1 = [x+y for x, y in enumerate(range(5,0,-1))]
e2 = [e0+1 for e0 in range(6) if e0%3]
assrt.deepEqual(e0, [0,1,4,9])
assrt.deepEqual(e1, [5,5,5,5,5])
assrt.deepEqual(e2, [2,3,5,6])
hash = {
    "foo": 1,
    "bar": 1,
    "baz": 1,
}
assrt.deepEqual(Object.keys(hash), [k for k in hash])

a = {1:2}
b = {2:1}
assrt.ok(a != b)
b = a
assrt.ok(a == b)
b = {1:2}
assrt.ok(a == b)
assrt.ok(v'{1:2}' == v'{1:2}')

# iterating over TypedArrays
assrt.deepEqual(list(Uint8Array(2)), [0, 0])
assrt.deepEqual(list(Int32Array([1,-1])), [1,-1])
