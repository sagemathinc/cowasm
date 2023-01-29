# vim:fileencoding=utf-8
# License: BSD
# Copyright: 2015, Kovid Goyal <kovid at kovidgoyal.net>

# Test the re module
import re
s = "Isaac Newton, physicist"
c = re.search("(\\w+) (\\w+)", s)
assrt.equal(c.group(1), 'Isaac')
assrt.equal(c.group(2), 'Newton')
c = re.match("(\\w+) (\\w+)", s)
assrt.equal(c.group(1), 'Isaac')
assrt.equal(c.start(1), 0)
assrt.equal(c.end(1), c.group(1).length)
assrt.equal(c.start(2), c.group(1).length + 1)
assrt.equal(c.group(2), 'Newton')
m = re.search('a(b)cd', 'abc abcd')
assrt.equal(m.group(1), 'b')
assrt.equal(m.start(1), m.string.lastIndexOf('b'))
assrt.deepEqual(re.split('\\s', s), ['Isaac', 'Newton,', 'physicist'])
assrt.deepEqual(re.findall('s[a-z]', s), ['sa', 'si', 'st'])
assrt.deepEqual([m.group() for m in re.finditer('s[a-z]', s)], ['sa', 'si', 'st'])
assrt.deepEqual(re.findall(/s[a-z]/, s), ['sa', 'si', 'st'])
assrt.equal(re.sub('[A-Z]', '_', s), '_saac _ewton, physicist')
assrt.equal(re.sub('[A-Z]', '_', s, count=1), '_saac Newton, physicist')
assrt.equal(re.search('a[.]b', 'axb'), None)
assrt.equal(re.search(r'a\.b', 'axb'), None)
assrt.equal(re.search('a[.]b', 'axb', flags=re.D), None)
assrt.equal(re.search('.+', 'a\nb').group(), 'a')
assrt.equal(re.search('.+', 'a\nb', flags=re.D).group(), 'a\nb')
assrt.equal(re.search('(?s).+', 'a\nb').group(), 'a\nb')
assrt.equal(re.sub('a(b)', r'xx', 'ab'), r'xx')
assrt.equal(re.sub('a(b)', r'\\1', 'ab'), r'\1')
assrt.equal(re.sub('a(b)', r'\\\1', 'ab'), r'\b')
assrt.equal(re.sub('a(b)', r'\g<1>', 'ab'), r'b')
assrt.equal(re.sub('a(b)', def(m):return m.group(1);, 'ab'), r'b')
assrt.equal(']', re.match('[]]', ']').group())

assrt.throws(def():re.search(r'(?(1)a|b)b', 'ab');, re.error)

# Test lookbehind assertions
assrt.equal('acdb', re.sub(r'(?<=a)b', 'c', 'abdb'))

# Test named groups
assrt.equal('aa', re.sub(r'(?P<a>a)b', r'\g<a>\1', 'ab'))
assrt.equal('bb', re.sub(r'(?P<a>a)(?P=a)', r'bb', 'aa'))
assrt.equal('ab', re.sub(r'(.)(?P<a>a)', r'\g<a>\1', 'ba'))
assrt.deepEqual({'a':'a', 'b':'b'}, re.search(r'(?P<a>a)(?P<b>b)', 'ab').groupdict())

# Test verbose mode literals
assrt.equal(re.search(///
    a
    .  # anything
    b
    ///, ' axb').group(), 'axb')
