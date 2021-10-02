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
