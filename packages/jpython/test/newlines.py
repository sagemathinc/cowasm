# Obviously do NOT run autoformatting on this!  If you do, it defeats
# the point of all the tests.

a = 1 + \
      2 + \
        3
assert a == 6

a = (1 +
      2 +
        3 +
         4)

assert a == 10

a = (1,
      2,
       3,
        4)

assert sum(a) == 10

a = [1,
      2,
       3]

assert sum(a) == 6

a = """
abc"""

assert a == '\nabc'

a = '''
abc'''

assert a == '\nabc'


a = {'x':10,
     'y':15}

assert str(a) == "{'x': 10, 'y': 15}"

from math import (sin,
                 cos,
                 pi)
assert sin(0) + cos(pi) == -1.0
