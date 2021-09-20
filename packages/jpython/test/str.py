# vim:fileencoding=utf-8
# License: BSD
# Copyright: 2015, Kovid Goyal <kovid at kovidgoyal.net>
# globals: assrt

import encodings
ae = assrt.equal

# Test literals

ae(r'\n', '\\n')
ae('\n'.charCodeAt(0), 10)
ae('\'', "'")
ae('\76'.charCodeAt(0), 62)  # octal escapes
ae('\x2a'.charCodeAt(0), 0x2a)  # hex escapes
ae('\u2028'.charCodeAt(0), 0x2028)
ae("\U0001F431", '🐱')
ae("\U0001F431", '🐱')
ae("\N{nbsp}", '\u00a0')
ae("\N{NBSp}", '\u00a0')
for qs, aval in [['a', True], ['A', False]]:
    ae(str.islower(qs), aval)
    ae(str.islower(new String(qs)), aval)
    ae(str.isupper(qs), aval ^ True)
    ae(str.isupper(new String(qs)), aval ^ True)

# Test format()

def test():
    args = Array.prototype.slice.call(arguments, 1)
    ae(arguments[0], str.format.apply(None, args))

def test_throws():
    args = Array.prototype.slice.call(arguments)
    def f():
        return str.format.apply(None, args[1:])
    assrt.throws(f, args[0])

def test_interpolation():
    a, b, c = 1, ['x'], 30000
    ae(f'{a}', '1')
    ae(f'0{a}', '01')
    ae(f'0{a}2', '012')
    ae(f'{a}{b[-1]}', '1x')
    ae(f'{c:,d}', (30000).toLocaleString())
    ae(f'\n', '\n')
    ae(f'{a}\\{b[0]}', '1\\x')
    ae(f'x\n\ny', 'x\n\ny')
    ae(f'{a=}', 'a=1')
    somevar = {'x': 1}
    ae(f'{somevar.x=}', 'somevar.x=1')

somevar = 33
test('somevar=33', '{somevar=}', somevar=somevar)
somevar = {'v': 'x'}
test('somevar.v=x', '{somevar.v=}', somevar=somevar)
test(' 1 2', ' {} {}', 1, 2)
test('{ a ', '{{ {0} ', 'a')
test('11', '{0}{0}', 1)
test('12', '{a}{b}', a=1, b=2)
test('12', '{a}{0}', 2, a=1)
test('1', '{0[0]}', [1])
test('1', '{0.a.b}', {'a':{'b':1}})
test('1', '{0[a][b]}', {'a':{'b':1}})
test('x', '{}', def (): return 'x';)
test('11', '{:b}', 3)
test('0b11', '{:#b}', 3)
test((30000).toLocaleString(), '{:,d}', 30000)
# in e.g. the indian number system, this is 3,00,000
test((300000).toLocaleString(), '{:,d}', 300000)
test('1.234568e+8', '{:e}', 123456789)
test('1.23E+8', '{:.2E}', 123456789)
test('12.35%', '{:.2%}', .123456789)
test((1234).toLocaleString(), '{:,}', 1234)
test('1_234', '{:_d}', 1234)
# 6 is the default: 1234.000000% or 1234,000000%
test((1234).toLocaleString(undefined, {'minimumFractionDigits': 6}), '{:,f}', 1234)
# 1234.0% or 1234,0%
test((1234).toLocaleString(undefined, {'minimumFractionDigits': 1}) + '%', '{:,.1%}', 12.34)
test((1234.57).toLocaleString(), '{:,g}', 1234.567)
test((1234).toLocaleString(), '{:,g}', 1234)
fnum = 1234
ae(f'{fnum:,}', (1234).toLocaleString())
test('left aligned                  ', '{:<30}', 'left aligned')
test('                 right aligned', '{:>30}', 'right aligned')
test('           centered           ', '{:^30}', 'centered')
test('***********centered***********', '{:*^30}', 'centered')
test('+3.140000; -3.140000', '{:+f}; {:+f}', 3.14, -3.14)
test('3.140000; -3.140000', '{:-f}; {:-f}', 3.14, -3.14)
test(' 3.140000; -3.140000', '{: f}; {: f}', 3.14, -3.14)
test('int: 42;  hex: 2a;  oct: 52;  bin: 101010', "int: {0:d};  hex: {0:x};  oct: {0:o};  bin: {0:b}", 42)
test('int: 42;  hex: 0x2a;  oct: 0o52;  bin: 0b101010', "int: {0:d};  hex: {0:#x};  oct: {0:#o};  bin: {0:#b}", 42)
test('100', '{:{fill}{align}3}', 1, fill=0, align='<')
test_throws(AttributeError, '{0.a}', {})
test_throws(KeyError, '{a}', b=1)
test_throws(IndexError, '{} {}', 1)
test_throws(IndexError, '{1} {2}', 1)
test_throws(ValueError, '{1')
test_interpolation()

# Test miscellaneous services
ae('Abc', str.capitalize('aBC'))
ae(' 1 ', str.center('1', 3))
ae(2, str.count('xyx', 'x'))
ae(1, str.count('xyx', 'x', 2))
ae(True, str.endswith('a', ''))
ae(True, str.endswith('', ''))
ae(False, str.endswith('a', 'ab'))
ae(True, str.endswith('e', ['f', 'e']))
ae(True, str.startswith('a', ''))
ae(True, str.startswith('', ''))
ae(False, str.startswith('a', 'ab'))
ae(True, str.startswith('e', ['f', 'e']))
ae(1, str.find('ab', 'b'))
ae(2, str.rfind('abbc', 'b'))
ae(1, str.index('ab', 'b'))
ae(-1, str.find('abcd', 'b', 2))
ae(-1, str.find('abcd', 'b', 0, 1))
ae(-1, str.find('abcd', 'bcd', 0, 2))
ae(-1, str.rfind('abcd', 'b', 2))
ae(-1, str.rfind('abcd', 'b', 0, 1))
ae(3, str.rfind('abcd', 'd'))
ae('1,2', str.join(',', [1, 2]))
ae('1,2', str.join(',', iter([1, 2])))
ae('a  ', str.ljust('a', 3))
ae('  a', str.rjust('a', 3))
ae('A', str.upper('a'))
ae('a', str.lower('A'))
ae('a', str.lstrip('  a'))
ae('a', str.lstrip('a'))
ae('a', str.rstrip('a   '))
ae('a', str.rstrip('a'))
ae('a', str.strip('  a   '))
ae('', str.strip(' '))
ae('', str.lstrip(' '))
ae('', str.rstrip(' '))
assrt.deepEqual(['1', ',', '2,3'], str.partition('1,2,3', ','))
assrt.deepEqual(['1,2,3', '', ''], str.partition('1,2,3', ' '))
assrt.deepEqual(['1,2', ',', '3'], str.rpartition('1,2,3', ','))
assrt.deepEqual(['', '', '1,2,3'], str.rpartition('1,2,3', ' '))
assrt.deepEqual(['1', ',2'], str.split('1,,2', ',', 1))
assrt.deepEqual(['1', '2', '3'], str.split('1  2 3'))
assrt.deepEqual(['1', '2 3'], str.split('1  2 3', None, 1))
assrt.deepEqual(['1', '2 \t3'], str.split('1 2 \t3', None, 1))
assrt.deepEqual(['-a--b-c', ''], str.rsplit('-a--b-c-', '-', 1))
assrt.deepEqual(['', 'a', 'b'], str.rsplit(',a,b', ','))
assrt.deepEqual([',a', 'b'], str.rsplit(',a,b', ',', 1))
assrt.deepEqual(['x,a', 'b'], str.rsplit('x,a,b', ',', 1))
assrt.deepEqual([' a b', 'c'], str.rsplit(' a b c ', None, 1))
assrt.deepEqual([' a bx', 'c'], str.rsplit(' a bx c ', None, 1))
for x in ['a\nb', 'a\r\nb', 'a\rb']:
    assrt.deepEqual(['a', 'b'], str.splitlines(x))
assrt.deepEqual(['a', '', 'b'], str.splitlines('a\n\rb'))
assrt.deepEqual(['a\n', 'b'], str.splitlines('a\nb', True))
assrt.deepEqual(['a\r\n', 'b'], str.splitlines('a\r\nb', True))
assrt.deepEqual(['s', "🐱", 'a', '\u2028'], list(str.uchrs('s🐱a\u2028')))
assrt.deepEqual([[0, 's'], [1, "🐱"], [3, 'a'], [4, '\u2028']], list(str.uchrs('s🐱a\u2028', True)))
ae('bbb', str.replace('aaa', 'a', 'b'))
ae('baa', str.replace('aaa', 'a', 'b', 1))
ae('bba', str.replace('aaa', 'a', 'b', 2))
ae('aaa', str.replace('aaa', 'a', 'a'))
ae('', str.replace('aaa', 'a', ''))
ae('a1B', str.swapcase('A1b'))
ae('001', str.zfill('1', 3))
ae('111', str.zfill('111', 2))
ae('a\u2028', str.uslice('s🐱a\u2028', 2))
ae(4, str.ulen('s🐱a\u2028', 2))

for f in (str, repr):
    ae(f(True), 'True')
    ae(f(False), 'False')
    ae(f(None), 'None')
    ae(f(1), '1')
    ae(f([1,'2']), '[1, "2"]')
    ae(f({1:[1, '2']}), '{"1":[1, "2"]}')
    ae(f({1:'a', 2:'b'}), '{"1":"a", "2":"b"}')
ae(str('a'), 'a')
ae(repr('a'), '"a"')

bytes = list(range(256))
assrt.deepEqual(bytes, list(encodings.base64decode(encodings.base64encode(bytes))))
assrt.deepEqual(bytes, list(encodings.unhexlify(encodings.hexlify(bytes))))
for k in ['abc', "mūs", '', 's🐱a\u2028']:
    bytes = encodings.utf8_encode(k)
    ae(encodings.utf8_decode(bytes), k)
    ae(encodings.utf8_decode(encodings.utf8_encode_js(k)), k)
    assrt.deepEqual(list(bytes), list(encodings.base64decode(encodings.base64encode(bytes))))

from pythonize import strings
strings()
ae('{0} {a}'.format(1, a=2), str.format('{0} {a}', 1, a=2))
ae(' x '.strip(), str.strip(' x '))
ae(','.join([1,2,3]), str.join(',', [1,2,3]))
ae('11111'.count('1', start=1, end=1), str.count('11111', '1', start=1, end=1))
ae('{{}}'.format(), '{}')
ae('{x}}}'.format(x=1), '1}')
a = 1
ae(f'{{ {a} }}', '{ 1 }')
