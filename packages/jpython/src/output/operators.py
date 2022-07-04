# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
from __python__ import hash_literals
from ast_types import (AST_Array, AST_Assign, AST_BaseCall, AST_Binary,
                       AST_Conditional, AST_ItemAccess, AST_Number, AST_Object,
                       AST_Return, AST_Seq, AST_Set, AST_SimpleStatement,
                       AST_Statement, AST_String, AST_Sub, AST_Symbol,
                       AST_SymbolRef, AST_Unary, is_node_type)
from output.loops import unpack_tuple


def print_getattr(self, output, skip_expression):  # AST_Dot
    if not skip_expression:
        expr = self.expression
        expr.print(output)
    if is_node_type(expr, AST_Number) and expr.value >= 0:
        if not RegExp("[xa-f.]", "i").test(output.last()):
            output.print(".")
    output.print(".")
    # the name after dot would be mapped about here.
    output.print_name(self.property)


def print_getitem(self, output):  # AST_Sub
    expr = self.expression
    prop = self.property
    if (is_node_type(prop, AST_Number) or is_node_type(prop, AST_String)) or (
            is_node_type(prop, AST_SymbolRef) and prop.name
            and prop.name.startsWith('ρσ_')):
        expr.print(output)
        output.print('['), prop.print(output), output.print(']')
        return
    is_negative_number = is_node_type(
        prop, AST_Unary) and prop.operator is "-" and is_node_type(
            prop.expression, AST_Number)
    is_repeatable = is_node_type(expr, AST_SymbolRef)
    if is_repeatable:
        expr.print(output)
    else:
        output.spaced('(ρσ_expr_temp', '=', expr), output.print(')')
        expr = {'print': lambda: output.print('ρσ_expr_temp')}

    if is_negative_number:
        output.print('['), expr.print(output), output.print(
            '.length'), prop.print(output), output.print(']')
        return
    is_repeatable = is_node_type(prop, AST_SymbolRef)
    # We have to check the type of the property because if it is a Symbol, it
    # will raise a TypeError with the < operator.
    if is_repeatable:
        output.spaced('[(typeof', prop, '===', '"number"', '&&', prop)
        output.spaced('', '<', '0)', '?',
                      expr), output.spaced('.length', '+', prop, ':', prop)
        output.print("]")
    else:
        output.print('[ρσ_bound_index('), prop.print(
            output), output.comma(), expr.print(output), output.print(')]')


def print_rich_getitem(self, output):  # AST_ItemAccess
    func = 'ρσ_' + ('setitem' if self.assignment else 'getitem')
    output.print(func + '(')
    self.expression.print(output), output.comma(), self.property.print(output)
    if self.assignment:
        output.comma(), self.assignment.print(output)
    output.print(')')


def print_splice_assignment(self, output):  # AST_Splice
    # splice assignment via pythonic array[start:end]
    output.print('ρσ_splice(')
    self.expression.print(output), output.comma(), self.assignment.print(
        output), output.comma()
    self.property.print(output) if self.property else output.print('0')
    if self.property2:
        output.comma()
        self.property2.print(output)
    output.print(')')


def print_delete(self, output):
    if is_node_type(self, AST_Symbol):
        output.assign(self), output.print('undefined')
    elif is_node_type(self, AST_Sub) or is_node_type(self, AST_ItemAccess):
        output.print('ρσ_delitem('), self.expression.print(
            output), output.comma(), self.property.print(output), output.print(
                ')')
    else:
        output.spaced('delete', self)


# def print_unary_prefix(self, output):
#     op = self.operator
#     if op is 'delete':
#         return print_delete(self.expression, output)
#     if op is '-':
#         output.print("ρσ_operator_neg(")
#     else:
#         output.print(op)
#     if RegExp("^[a-z]", "i").test(op):
#         output.space()
#     if self.parenthesized:
#         output.with_parens(lambda: self.expression.print(output))
#     else:
#         self.expression.print(output)
#     if op is '-':
#         output.print(")")

def print_unary_prefix(self, output):
    op = self.operator
    if op is 'delete':
        return print_delete(self.expression, output)
    output.print(op)
    if RegExp("^[a-z]", "i").test(op):
        output.space()
    if self.parenthesized:
        output.with_parens(lambda: self.expression.print(output))
    else:
        self.expression.print(output)

def write_instanceof(left, right, output):
    def do_many(vals):
        output.print('ρσ_instanceof.apply(null,'), output.space()
        output.print('['), left.print(output), output.comma()
        for i in range(len(vals)):
            vals[i].print(output)
            if i is not vals.length - 1:
                output.comma()
        output.print('])')

    if is_node_type(right, AST_Seq):
        do_many(right.to_array())
    elif is_node_type(right, AST_Array):
        do_many(right.elements)
    else:
        output.print('ρσ_instanceof(')
        left.print(output), output.comma(), right.print(output), output.print(
            ')')


def write_smart_equality(self, output):
    def is_ok(x):
        return not (
            is_node_type(x, AST_Array) or is_node_type(x, AST_Set)
            or is_node_type(x, AST_Object) or is_node_type(x, AST_Statement)
            or is_node_type(x, AST_Binary) or is_node_type(x, AST_Conditional)
            or is_node_type(x, AST_BaseCall) or is_node_type(x, AST_SymbolRef))

    if is_ok(self.left) and is_ok(self.right):
        if self.operator is '==':
            output.print('(')
            output.spaced(self.left, '===', self.right, '||', 'typeof',
                          self.left, '===', '"object"', '&&', 'ρσ_equals(')
            self.left.print(output), output.print(','), output.space(
            ), self.right.print(output), output.print('))')
        else:
            output.print('(')
            output.spaced(self.left, '!==', self.right, '&&', '(typeof',
                          self.left, '!==', '"object"', '||', 'ρσ_not_equals(')
            self.left.print(output), output.print(','), output.space(
            ), self.right.print(output), output.print(')))')
    else:
        output.print('ρσ_' +
                     ('equals(' if self.operator is '==' else 'not_equals('))
        self.left.print(output), output.print(
            ','), output.space(), self.right.print(output), output.print(')')


comparators = {
    "<": True,
    ">": True,
    "<=": True,
    ">=": True,
}

function_ops = {
    "in": "ρσ_in",
    'nin': '!ρσ_in',
}


def print_binary_op(self, output):
    if function_ops[self.operator]:
        output.print(function_ops[self.operator])

        def f_comma():
            self.left.print(output)
            output.comma()
            self.right.print(output)

        output.with_parens(f_comma)
    elif comparators[self.operator] and is_node_type(
            self.left, AST_Binary) and comparators[self.left.operator]:
        # A chained comparison such as a < b < c
        if is_node_type(self.left.right, AST_Symbol):
            # left side compares against a regular variable,
            # no caching needed
            self.left.print(output)
            leftvar = self.left.right.name
        else:
            # some logic is being performed, let's cache it
            self.left.left.print(output)
            output.space()
            output.print(self.left.operator)
            output.space()

            def f_cond_temp():
                nonlocal leftvar
                output.assign("ρσ_cond_temp")
                self.left.right.print(output)
                leftvar = "ρσ_cond_temp"

            output.with_parens(f_cond_temp)

        output.space()
        output.print("&&")
        output.space()
        output.print(leftvar)
        output.space()
        output.print(self.operator)
        output.space()
        self.right.print(output)
    elif self.operator is '**':
        left = self.left
        if is_node_type(self.left, AST_Unary) and not self.left.parenthesized:
            left = self.left.expression
            output.print(self.left.operator)
        output.print("ρσ_operator_pow(")
        left.print(output)
        output.comma()
        self.right.print(output)
        output.print(')')
    elif self.operator is '==' or self.operator is '!=':
        write_smart_equality(self, output)
    elif self.operator is 'instanceof':
        write_instanceof(self.left, self.right, output)
    elif self.operator is '*' and is_node_type(self.left, AST_String):
        self.left.print(output), output.print('.repeat('), self.right.print(
            output), output.print(')')
    elif self.operator is '===' or self.operator is '!==':
        nan_check = None
        if is_node_type(self.right, AST_Symbol) and self.right.name is 'NaN':
            nan_check = self.left
        if is_node_type(self.left, AST_Symbol) and self.left.name is 'NaN':
            nan_check = self.right
        if nan_check is not None:
            # We use the fact that NaN is the only object that is not equal to
            # itself
            output.spaced(nan_check,
                          '!==' if self.operator is '===' else '===',
                          nan_check)
        else:
            output.spaced(self.left, self.operator, self.right)
    elif self.operator is '+':
        output.print('ρσ_operator_add('), self.left.print(
            output), output.comma(), self.right.print(output), output.print(
                ')')
    elif self.operator is '-':
        output.print('ρσ_operator_sub('), self.left.print(
            output), output.comma(), self.right.print(output), output.print(
                ')')
    elif self.operator is '*':
        output.print('ρσ_operator_mul('), self.left.print(
            output), output.comma(), self.right.print(output), output.print(
                ')')
    elif self.operator is '/':
        output.print('ρσ_operator_truediv('), self.left.print(
            output), output.comma(), self.right.print(output), output.print(
                ')')
    elif self.operator is '//':
        output.print('ρσ_operator_floordiv('), self.left.print(
            output), output.comma(), self.right.print(output), output.print(
                ')')
    else:
        output.spaced(self.left, self.operator, self.right)


after_map = {'.': 'd', '(': 'c', '[': 'd', 'g': 'g', 'null': 'n'}


def print_existential(self, output):
    key = after_map[self.after] if self.after is None or jstype(
        self.after) is 'string' else 'e'
    if is_node_type(self.expression, AST_SymbolRef):
        if key is 'n':
            output.spaced('(typeof', self.expression, '!==', '"undefined"',
                          '&&', self.expression, '!==', 'null)')
            return
        if key is 'c':
            output.spaced('(typeof', self.expression, '===', '"function"', '?',
                          self.expression, ':',
                          '(function(){return undefined;}))')
            return
        after = self.after
        if key is 'd':
            after = 'Object.create(null)'
        elif key is 'g':
            after = '{__getitem__:function(){return undefined;}}'
        output.spaced('(typeof', self.expression, '!==', '"undefined"', '&&',
                      self.expression, '!==', 'null', '?', self.expression,
                      ':', after)
        output.print(')')
        return
    output.print('ρσ_exists.' + key + '(')
    self.expression.print(output)
    if key is 'e':
        output.comma(), self.after.print(output)
    output.print(')')


def print_assignment(self, output):
    flattened = False
    left = self.left
    if is_node_type(left, AST_Seq):
        left = AST_Array({'elements': [left.car, left.cdr]})
    if is_node_type(left, AST_Array):
        flat = left.flatten()
        flattened = flat.length > left.elements.length
        output.print("ρσ_unpack")
    else:
        left.print(output)
    output.space()
    output.print(self.operator)
    output.space()
    if flattened:
        output.print('ρσ_flatten')
        output.with_parens(lambda: self.right.print(output))
    else:
        self.right.print(output)
    if is_node_type(left, AST_Array):
        output.end_statement()
        if not is_node_type(self.right, AST_Seq) and not is_node_type(
                self.right, AST_Array):
            output.assign('ρσ_unpack')
            output.print('ρσ_unpack_asarray(' +
                         flat.length), output.comma(), output.print(
                             'ρσ_unpack)')
            output.end_statement()
        unpack_tuple(flat, output, True)


def print_assign(self, output):
    if self.operator is '//=':
        output.assign(self.left)
        output.print('Math.floor')

        def f_slash():
            self.left.print(output)
            output.space()
            output.print('/')
            output.space()
            self.right.print(output)

        output.with_parens(f_slash)
        return
    if self.operator is '+=':
        output.assign(self.left)
        output.print('ρσ_operator_iadd('), self.left.print(
            output), output.comma(), self.right.print(output), output.print(
                ')')
        return
    if self.operator is '-=':
        output.assign(self.left)
        output.print('ρσ_operator_isub('), self.left.print(
            output), output.comma(), self.right.print(output), output.print(
                ')')
        return
    if self.operator is '*=':
        output.assign(self.left)
        output.print('ρσ_operator_imul('), self.left.print(
            output), output.comma(), self.right.print(output), output.print(
                ')')
        return
    if self.operator is '/=':
        output.assign(self.left)
        output.print('ρσ_operator_idiv('), self.left.print(
            output), output.comma(), self.right.print(output), output.print(
                ')')
        return
    if self.operator is '=' and self.is_chained():
        left_hand_sides, rhs = self.traverse_chain()
        is_compound_assign = False
        for lhs in left_hand_sides:
            if is_node_type(lhs, AST_Seq) or is_node_type(lhs, AST_Array):
                is_compound_assign = True
                break
        if is_compound_assign:
            temp_rhs = AST_SymbolRef({'name': 'ρσ_chain_assign_temp'})
            print_assignment(
                AST_Assign({
                    'left': temp_rhs,
                    'operator': '=',
                    'right': rhs
                }), output)
            for lhs in left_hand_sides:
                output.end_statement(), output.indent()
                print_assignment(
                    AST_Assign({
                        'left': lhs,
                        'right': temp_rhs,
                        'operator': self.operator
                    }), output)
        else:
            for lhs in left_hand_sides:
                output.spaced(lhs, '=', '')
            rhs.print(output)
    else:
        print_assignment(self, output)


def print_conditional(self, output, condition, consequent, alternative):
    condition, consequent, alternative = self.condition, self.consequent, self.alternative
    output.with_parens(lambda: condition.print(output))
    output.space()
    output.print("?")
    output.space()
    consequent.print(output)
    output.space()
    output.colon()
    alternative.print(output)


def print_seq(output):
    self = this
    p = output.parent()

    def print_seq0():
        self.car.print(output)
        if self.cdr:
            output.comma()
            if output.should_break():
                output.newline()
                output.indent()
            self.cdr.print(output)

    # this will effectively convert tuples to arrays
    if (is_node_type(p, AST_Binary) or is_node_type(p, AST_Return)
            or is_node_type(p, AST_Array) or is_node_type(p, AST_BaseCall)
            or is_node_type(p, AST_SimpleStatement)):
        output.with_square(print_seq0)
    else:
        print_seq0()
