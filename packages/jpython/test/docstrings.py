# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
# globals: ρσ_module_doc__

import _import_one

def f():
    " A basic docstring "
    pass

assrt.equal(f.__doc__, 'A basic docstring')
assrt.equal(_import_one.__doc__, 'Module level ds1\n\nModule level ds2\nline2\n\nModule level ds 3')

def g():
    '''
    A more complex docstring:
        xxx
            yyyy

    the end
    '''
    pass

assrt.equal(g.__doc__, 'A more complex docstring:\n    xxx\n        yyyy\n\nthe end')

class D:
    ' Docstring for a class '

    def method(self):
        'ds for a method'
        pass

assrt.equal(D().__doc__, 'Docstring for a class')
assrt.equal(D().method.__doc__, 'ds for a method')

x = def():
    'xxx'

assrt.equal(x.__doc__, 'xxx')
