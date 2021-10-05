# vim:fileencoding=utf-8
# License: BSD Copyright: 2015, Kovid Goyal <kovid at kovidgoyal.net>
# globals: assrt

from elementmaker import E

eq = assrt.equal

def dummy_elem_eq(a, b):
    eq(jstype(a), jstype(b))
    if (jstype(a) == 'string'):
        eq(a, b)
        return
    eq(a.attributes.length, b.attributes.length)
    eq(a.children.length, b.children.length)
    eq(a.name, b.name)
    for attr in a.attributes:
        eq(a[attr], b[attr])
    for i, child in enumerate(a.children):
        dummy_elem_eq(child, b.children[i])

q = E.div('text', id='1', class_='c', data_x='x')
dummy_elem_eq(q, {'name':'div', 'children':['text'], 'attributes':{'id':'1', 'class':'c', 'data-x': 'x'}})

q = E.div(
        E.span('a'),
        E.span('b'),
        E.a(),
        id='1',
        boolean_attr=True,
    )
dummy_elem_eq(q, {'name':'div', 'children':[
    {
        'name':'span',
        'children':['a'], 'attributes': {}
    },
    {
        'name':'span',
        'children':['b'], 'attributes': {}
    },
    {
        'name':'a',
        'children':[], 'attributes': {}
    },
], 'attributes':{'id':'1', 'boolean-attr':'boolean-attr'}})
