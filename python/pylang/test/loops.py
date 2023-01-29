# globals: assrt
# loop through values, not indices
a = ['foo', 'bar', 'baz']
for val in a:
	assrt.ok(val in a)

for i in range(len(a)):
	assrt.ok(a[i] in a)

for i, val in enumerate(a): # testing that comments are allowed here
	assrt.equal(a[i], val)

# nesting
final = []
for i in [1,2]:
	for j in [4,5,6]:
		final.push((i,j))
assrt.deepEqual(final, [[1,4], [1,5], [1,6], [2,4], [2,5], [2,6]])

i = 0
while i < len(a):
	assrt.ok(a[i] in a)
	i += 1

counter = 5
factorial = 1
do:
	factorial *= counter
	counter -= 1
.while counter > 0
assrt.equal(factorial, 120)

# for-in
hash = {
    "foo": 1,
    "bar": 1,
    "baz": 1,
}
i = 0
for key in hash:
    assrt.equal(key, a[i])
    i += 1

word = "test"
i = 0
for letter in word:
    assrt.equal(letter, word[i])
    i += 1

for b in (1, 1):
    assrt.equal(b, 1)

for q in range(3):
    u = q
assrt.equal(u, q)
for q in range(3):
    u = q
    q = 10
assrt.equal(u, 2)
a = [1,2]
for li in range(len(a)):
    a.pop()
assrt.equal(len(a), 0)
r = range(3)
assrt.deepEqual(list(r), list(r))
items = []
for outer in r:
    items.push(outer)
    for b in r:
        items.push(b)
assrt.deepEqual(items, [0, 0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 2])
r = range(3)
if jstype(Proxy) is 'function':
    assrt.equal(r[1], 1)
    assrt.equal(r[1], 1)
    assrt.equal(r[2], 2)
assrt.equal(r.count(0), 1)
assrt.equal(r.count(4), 0)
assrt.equal(r.index(1), 1)
assrt.throws(def(): r.index(4);, ValueError)

dest = []
for al in 'a', 'b', 'c':
    dest.push(al)
assrt.equal(dest.join(''), 'abc')
