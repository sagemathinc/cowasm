# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
from __python__ import hash_literals

from ast_types import AST_Binary, AST_Number, AST_String, is_node_type


def print_array(self, output):
    output.print('ρσ_list_decorate')

    def f_list_decorate():
        def f_list_decorate0():
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

        output.with_square(f_list_decorate0)

    output.with_parens(f_list_decorate)


def print_obj_literal_slow(self, output):
    def f_obj_literal_slow():
        output.print('function()')

        def f_obj_literal_slow0():
            output.indent()
            if self.is_pydict:
                output.spaced.apply(output, 'var ρσ_d = ρσ_dict()'.split(' '))
            else:
                output.spaced(
                    'var', 'ρσ_d', '=',
                    ('Object.create(null)' if self.is_jshash else '{}'))
            output.end_statement()
            for i, prop in enumerate(self.properties):
                output.indent()
                if self.is_pydict:
                    output.print('ρσ_d.set')

                    def f_py_dict():
                        prop.key.print(output)
                        output.print(','), output.space()
                        prop.value.print(output)

                    output.with_parens(f_py_dict)
                else:
                    output.print('ρσ_d')
                    output.with_square(lambda: prop.key.print(output))
                    output.space(), output.print('='), output.space()
                    prop.value.print(output)
                output.end_statement()
            output.indent()
            output.spaced('return', 'ρσ_d')
            output.end_statement()

        output.with_block(f_obj_literal_slow0)

    output.with_parens(f_obj_literal_slow)
    output.print('.call(this)')


# This simple obj literal printer works fine for literals
# that aren't supposed to be dict's, I think. The function
# print_obj_literal_slow above was what RapydScript had,
# but in running the brython benchmarks, I found it was
# insanely slow, since e.g., {[0]:0} is 100x slower than
# {0:0} in javascript.
def print_obj_literal(self, output):
    if self.is_pydict:
        print_obj_literal_slow(self, output)
        return
    output.print("{")
    for i, prop in enumerate(self.properties):
        if is_node_type(prop.key, AST_Number) or is_node_type(
                prop.key, AST_String):
            prop.key.print(output)
        else:

            def key():
                prop.key.print(output)

            output.with_square(key)
        output.print(":")
        prop.value.print(output)
        if i + 1 < len(self.properties):
            output.print(",")
    output.print("}")


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

    def f_print_set():
        output.print('function()')

        def f_print_set0():
            output.indent()
            output.spaced.apply(output, 'var s = ρσ_set()'.split(' '))
            output.end_statement()
            for item in self.items:
                output.indent()
                output.print('s.jsset.add')
                output.with_parens(lambda: item.value.print(output))
                output.end_statement()
            output.indent()
            output.spaced('return', 's')
            output.end_statement()

        output.with_block(f_print_set0)

    output.with_parens(f_print_set)
    output.print('()')


def print_regexp(self, output):
    str_ = self.value.toString()
    if output.options.ascii_only:
        str_ = output.to_ascii(str_)
    output.print(str_)
    p = output.parent()
    if is_node_type(p, AST_Binary) and RegExp(r"^in").test(
            p.operator) and p.left is self:
        output.print(" ")
