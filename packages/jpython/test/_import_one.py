# vim:fileencoding=utf-8
nonlocal GLOBAL_SYMBOL

'Module level ds1'

def toplevel_func(a):
    return a + 'toplevel'

'''
Module level ds2
line2
'''

class TopLevel:

    def __init__(self, a):
        self.a = a

'Module level ds 3'

class AClass(TopLevel):

    def __init__(self, a):
        self.a = a

toplevel_var = 'foo'

if True:
    true_var = 'true'
else:
    false_var = 'false'

GLOBAL_SYMBOL = 'i am global'

from _import_two.other import other

test_other = other
