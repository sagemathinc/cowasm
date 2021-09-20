# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
from __python__ import hash_literals

from ast import AST_Binary, is_node_type

def print_array(self, output):
    output.print('ρσ_list_decorate')
    output.with_parens(def():
        output.with_square(def():
            a = self.elements
            len_ = a.length
            if len_ > 0:
                output.space()
            for i, exp in enumerate(a):
                if i:
                    output.comma()
                exp.print(output)
            if len_ > 0:
                output.space()
        )
    )


def print_obj_literal(self, output):
    output.with_parens(def():
        output.print('function()')
        output.with_block(def():
            output.indent()
            if self.is_pydict:
                output.spaced.apply(output, 'var ρσ_d = ρσ_dict()'.split(' '))
            else:
                output.spaced('var', 'ρσ_d', '=', ('Object.create(null)' if self.is_jshash else '{}'))
            output.end_statement()
            for i, prop in enumerate(self.properties):
                output.indent()
                if self.is_pydict:
                    output.print('ρσ_d.set')
                    output.with_parens(def():
                        prop.key.print(output)
                        output.print(','), output.space()
                        prop.value.print(output)
                    )
                else:
                    output.print('ρσ_d')
                    output.with_square(def():prop.key.print(output);)
                    output.space(), output.print('='), output.space()
                    prop.value.print(output)
                output.end_statement()
            output.indent()
            output.spaced('return', 'ρσ_d')
            output.end_statement()
        )
    )
    output.print('.call(this)')

def print_object(self, output):
    if self.is_pydict:
        if self.properties.length > 0:
            print_obj_literal(self, output)
        else:
            output.print('ρσ_dict()')
    else:
        if self.properties.length > 0:
            print_obj_literal(self, output)
        else:
            output.print("Object.create(null)" if self.is_jshash else '{}')

def print_set(self, output):
    if self.items.length is 0:
        output.print('ρσ_set()')
        return
    output.with_parens(def():
        output.print('function()')
        output.with_block(def():
            output.indent()
            output.spaced.apply(output, 'var s = ρσ_set()'.split(' '))
            output.end_statement()
            for item in self.items:
                output.indent()
                output.print('s.jsset.add')
                output.with_parens(def():item.value.print(output);)
                output.end_statement()
            output.indent()
            output.spaced('return', 's')
            output.end_statement()
        )
    )
    output.print('()')

def print_regexp(self, output):
    str_ = self.value.toString()
    if output.options.ascii_only:
        str_ = output.to_ascii(str_)
    output.print(str_)
    p = output.parent()
    if is_node_type(p, AST_Binary) and /^in/.test(p.operator) and p.left is self:
        output.print(" ")
