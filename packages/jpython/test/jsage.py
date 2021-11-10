# Test jsage language modifications

# ^ is xor in python by default
assrt.equal(2^3, 1)
assrt.equal(2**3, 8)
# note the precedence, despite how I wrote this!
assrt.equal(2^3 + 1, 2^4)

from __python__ import exponent
# now ^ is exponent and ^^ is xor
assrt.equal(2^3, 8)
assrt.equal(2^^3, 1)
assrt.equal(2**3, 8)

# ^ really **is** exponentiation, not xor, since the tokenizer does it.
# This means the precedence is correct (i.e., very high).
assrt.equal(2^3 + 1, 9)

# note that eval is not changed.  Maybe this is bad?
assrt.equal(eval('2^3'), 1)


from __python__ import no_exponent
# now ^ is back (and ^^ would be a syntax error - can't test this)
assrt.equal(2^3, 1)

# Ellipses range parsing
# Enable it:
from __python__ import ellipses

# With numerical literals
assrt.equal(str([1..5]), 'range(1, 6)')

# With expressions
a = 2; b = 7
assrt.equal(str([a+a..b+2]), 'range(4, 10)')

# With a function call
def f(n):
    return n+1
assrt.equal(str([f(10)..f(1000)]), 'range(11, 1002)')

# With a floating point literal
assrt.equal(str([1.5..5]), 'range(1.5, 6)')

# Numerical literals
from __python__ import numbers
# will parse all numbers as one less!
def Number(s):
    return parseFloat(s) - parseFloat('1.0')
assrt.equal(2.5, parseFloat('1.5'))
