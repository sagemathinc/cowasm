# vim:fileencoding=utf-8
# License: BSD
# Copyright: 2015, Kovid Goyal <kovid at kovidgoyal.net>

linter = require('../tools/lint.js')

def lint(code):
    return linter.lint_code(code, {'filename':'<test>', 'report':def():
                                   pass
})

def err_test(code, ident, line, name, other_line):
    msgs = lint(code)
    assrt.ok(len(msgs) > 0, 'failed to find error in: ' + code)
    assrt.equal(len(msgs), 1, 'found ' + (len(msgs) - 1) + ' extra errors in: ' + code)
    assrt.equal(msgs[0].ident, ident, 'incorrect ident: ' + msgs[0].ident + ' for: ' + code)
    if line != undefined:
        assrt.equal(msgs[0].start_line, line, 'incorrect line: ' + msgs[0].start_line + ' for: ' + code)
    if name != undefined:
        assrt.equal(msgs[0].name, name, 'incorrect name: ' + msgs[0].name + ' for: ' + code)
    if other_line != undefined:
        assrt.equal(msgs[0].other_line, other_line, 'incorrect other_line: ' + msgs[0].other_line + ' for: ' + code)

def ok_test(code):
    msgs = lint(code)
    assrt.equal(msgs.length, 0, 'Got unexpected msg: ' + (msgs[0] or {}).message + ' for code: ' + code)

# Imports
err_test('import foo', 'unused-import', 1, 'foo')
err_test('import foo.boo', 'unused-import', 1, 'foo')
err_test('import foo as boo', 'unused-import', 1, 'boo')
err_test('from x import foo', 'unused-import', 1, 'foo')
err_test('from x import foo as boo', 'unused-import', 1, 'boo')
ok_test('import foo\nfoo')

# Function arguments
ok_test('def f(a):\n return a')
ok_test('def f(a=1):\n return a')
ok_test('def f(*a):\n return a')
ok_test('def f(**a):\n return a')
ok_test('def f(a):\n return 1')

# Extended slices
ok_test('a = []; a[::2], a[1:-1]')

# Top level unused ignored
ok_test('a=1\ndef f():\n pass')

# Destructuring assignment
ok_test('def f():\n a, b = 1, 2; a, b')
ok_test('def f():\n a = 1; b, c = a, 2; return b, c')
ok_test('for x, (y, z) in [ [1, [2, 3]] ]:\n x + y + z')
err_test('def f():\n a, b = 1, 1; return a', 'unused-local', 2, 'b')

# Compound assignment
err_test('a += 1', 'undef', 1, 'a')
ok_test('def f():\n a = 1; a += 1')

# Unused bindings
err_test('def f():\n a=1', 'unused-local', 2, 'a')
err_test('def f():\n def a():\n  pass', 'unused-local', 2, 'a')
# But vars starting with _ are OK.
ok_test("def f():\n _=5")
ok_test("def f():\n _foo=5")

# Undefined references
err_test('f()', 'undef', 1, 'f')
err_test('a', 'undef', 1, 'a')
err_test('def f():\n a=1; return a\na', 'undef', 3, 'a')

# Comprehensions
ok_test('[x for x in [1,2]]')
ok_test('[1 for x in [1,2] if x]')
ok_test('[1 for x in [1,2]]')
ok_test('def f():\n l=[1,2];[x for x in l]')
ok_test('def f():\n l=[1,2];{x:True for x in l}')
err_test('def f():\n [x for x in [1,2]]; return x', 'undef', 2, 'x')

# Loops
ok_test('def f():\n for x in "":\n  pass\n return x')
ok_test('def f():\n for x in "":\n  x += 1\n')
ok_test('def f():\n for x, y in "":\n  pass\n return x, y')
ok_test('for r"%js var i = 0; i < 1; i++":\n print(i)')
err_test('def f():\n a = 1\n for a in "":\n  a', 'loop-shadowed', 3, 'a', 2)

# Semi-colons
err_test('a=1;;a', 'extra-semicolon', 1, ';')
err_test('a=1;', 'eol-semicolon', 1, ';')

# Builtins
for k in 'String Symbol this self window Map arguments print len range dir undefined'.split(' '):
    ok_test(k)

# noqa
ok_test('f() # noqa')
ok_test('f() # noqa:undef')
err_test('f() # noqa:xxx', 'undef')

# Named func in branch
err_test('if 1:\n def f():\n  pass', 'func-in-branch', 2, 'f')
err_test('if 1:\n pass\nelse:\n def f():\n  pass', 'func-in-branch', 4, 'f')
err_test('try:\n def f():\n  pass\nexcept:\n pass', 'func-in-branch', 2, 'f')
ok_test('if 1:\n a = def():\n  pass')

# Syntax errors
err_test('def f(:\n pass', 'syntax-err', 1)

# Functions
ok_test('def f():\n pass\nf()')

# Non-locals
err_test('def a():\n x = 1\n def b():\n  nonlocal x\n b()', 'unused-local', 2, 'x')
ok_test('def a():\n x = 1\n def b():\n  nonlocal x\n  x\n b()')
ok_test('def a():\n x = 1\n def b():\n  nonlocal x\n  x\n  x = 2\n b()')
ok_test('def a():\n x = 1\n def ():\n  nonlocal x\n  x = 1\n  x')
ok_test('nonlocal a\na()')

# Define after use
err_test('def g():\n f()\n f()\n def f():\n  pass', 'def-after-use', 3, 'f')

# Decorators
ok_test('from x import y\n@y\ndef f():\n pass')

# try/except
ok_test('try:\n 1\nexcept Error as e:\n e')

# Classes
ok_test('''
class A:

    h = j = 1
    x = h + j
    if True:
        k = 1
    else:
        k = 2

    def __init__(self, a):
        self.a = a

    def unused(self):
        pass
    other = unused

class B(A):

    def __init__(self):
        A.__init__(self, 'b')
''')
err_test('class A:\n def a(self):\n  a()', 'undef', 3, 'a')
err_test('class A:\n def a(self):\n  pass\n def a(self):\n  pass', 'dup-method', 4, 'a')

# Object literals
err_test('{"a":1, "a":2}', 'dup-key', 1, 'a')

# keyword arg values
ok_test('def f():\n a=1\n f(b=a)')
ok_test('def f():\n a={}\n f(**a)')

# with statement
ok_test('''
def f():
    a = 1
    with a as b:
        b()
''')
err_test('with a:\n pass', 'undef', '1', 'a')
