# JPython

## A Python implementation in Javascript for use by JSage

**History:** This is **built from RapydScript-ng** that I'm playing around with
modifying for use by the sagejs project. See
https://github.com/kovidgoyal/rapydscript-ng for some helpful documentation...

## How to try it out -- here's a little taste

### Install

Install into a temporary node.js directory:

```bash
$ mkdir jsage  # you can delete this later
$ cd jsage
$ npm init -y
$ npm install @jsage/jpython
```

### Try out JPython

Start up JPython and use some of the JSage functionality. Of course you could also
require any module you install from https://npmjs.com. You can also create .py files
and import them.

```python
$ npx jpython
Welcome to JPython.  Using Node.js v16.9.0.
>>> s = range(10); s  # this is the "Python language", not Node.js
range(0, 10)
>>> sum(s)
45
>>> list(reversed(list(s)))
[9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
>>> list(s)[-3:]
[7, 8, 9]
>>> d = require('@jsage/lib/modular/dims');  # WASM code written in ziglang.
>>> d.eulerPhi(100)
40
>>> %time d.dimensionCuspForms(1234567)
103699
Wall time: 2ms
>>> pari = require('@jsage/lib/pari');   # WASM pari with GMP built with 'zig cc'
>>> pari.init()
[object Promise]
>>> pari.exec('ellinit([1..5])')   # returns string
[1, 2, 3, 4, 5, 9, 11, 29, 35, -183, -3429, -10351, 6128487/10351, Vecsmall([1]), [Vecsmall([96, -1])], [0, 0, 0, 0, 0, 0, 0, 0]]
>>> an = eval(pari.exec("ellan(ellinit([1..5]), 50)")); an
[1, 1, 0, -1, -3, 0, -1, -3, -3, -3, -1, 0, 1, -1, 0, -1, 5, -3, 4, 3, 0, -1, -6, 0, 4, 1, 0, 1, -2, 0, 2, 5, 0, 5, 3, 3, 7, 4, 0, 9, 6, 0, 8, 1, 9, -6, 0, 0, -6, 4]
>>> an = eval(pari.exec("ellan(ellinit([1..5]), 10000)"));
>>> sum(an)/len(an)
0.152
>>> pari.exec("factor(2021)")

[43 1]

[47 1]
>>> a = pari.exec("B=10^4;an=ellan(ellinit([1..5]),B);sum(i=1,B,an[i])/B"); a
19/125
>>> eval(a)
0.152
```

### Math extensions (like the Sage preparser)

Use `jsage` and the compiler is modified with some more
mathematics friendly syntax.

```python
$ npx jsage
>>> 2^3
8
```

Right now only the notation [a..b] for ranges and caret for exponentiation (and
`^^` for xor) is implemented. I might implement more, though maybe that's enough.

You can get the same effect in a .py file as follows:

```python
# a.py
from __python__ import exponent
print(2^3)
```

```bash
$ npx jpython a.py
8
```

### JSage is also available in Node.js

You can also use the library functionality from node.js. However,
playing around with mathematics tends to be a lot more comfortable with the
Python _language_ than Javascript.

```js
$ node
Welcome to Node.js v16.7.0.
Type ".help" for more information.
> d = require('@jsage/lib/modular/dims');null
null
> d.dimensionCuspForms(1234567)
103699
> pari = require('@jsage/lib/pari');pari.init(); null
null
> an = eval(pari.exec("ellan(ellinit([1..5]), 50)")); an
[
   1,  1,  0, -1, -3, 0, -1, -3, -3, -3, -1,
   0,  1, -1,  0, -1, 5, -3,  4,  3,  0, -1,
  -6,  0,  4,  1,  0, 1, -2,  0,  2,  5,  0,
   5,  3,  3,  7,  4, 0,  9,  6,  0,  8,  1,
   9, -6,  0,  0, -6, 4
]
> an = eval(pari.exec("ellan(ellinit([1..5]), 10000)")); an.length
10000
> s=0;for(a of an) {s+=a}; s/an.length
0.152
```
