# Obviously do NOT run autoformatting on this!  If you do, it defeats
# the point of all the tests.

a = 1 + \
      2 + \
        3
assrt.equal(a,6)

a = (1 +
      2 +
        3 +
         4)

assrt.equal(a,10)

a = (1,
      2,
       3,
        4)

assrt.equal(sum(a), 10)

a = [1,
      2,
       3]

assrt.equal(sum(a), 6)

a = """
abc"""

assrt.equal(a, '\nabc')

a = '''
abc'''

assrt.equal(a, '\nabc')


a = {'x':10,
     'y':15}

assrt.equal(str(a), '{"x":10, "y":15}')

from math import (sin,
                 cos,
                 pi)
assrt.equal(sin(0) + cos(pi), -1.0)
