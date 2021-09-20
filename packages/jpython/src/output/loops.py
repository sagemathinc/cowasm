# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
from __python__ import hash_literals

from ast import AST_BaseCall, AST_SymbolRef, AST_Array, AST_Unary, AST_Number, has_calls, AST_Seq, AST_ListComprehension, is_node_type
from output.stream import OutputStream

def unpack_tuple(elems, output, in_statement):
    for i, elem in enumerate(elems):
        output.indent()
        output.assign(elem)
        output.print("ρσ_unpack")
        output.with_square(def():
            output.print(i)
        )
        if not in_statement or i < elems.length - 1:
            output.semicolon()
            output.newline()

def print_do_loop(self, output):
    output.print("do")
    output.space()
    self._do_print_body(output)
    output.space()
    output.print("while")
    output.space()
    output.with_parens(def(): self.condition.print(output);)
    output.semicolon()

def print_while_loop(self, output):
    output.print("while")
    output.space()
    output.with_parens(def(): self.condition.print(output);)
    output.space()
    self._do_print_body(output)

def is_simple_for_in(self):
    # return true if this loop can be simplified into a basic for (i in j) loop
    if is_node_type(self.object, AST_BaseCall)
    and is_node_type(self.object.expression, AST_SymbolRef)
    and self.object.expression.name is "dir" and self.object.args.length is 1:
        return True
    return False

def is_simple_for(self):
    # returns true if this loop can be simplified into a basic for(i=n;i<h;i++) loop
    if (is_node_type(self.object, AST_BaseCall) and
            is_node_type(self.object.expression, AST_SymbolRef) and
            self.object.expression.name is "range" and
            not (is_node_type(self.init, AST_Array))):
        a = self.object.args
        l = a.length
        if l < 3 or (
            is_node_type(a[2], AST_Number) or (
                is_node_type(a[2], AST_Unary) and a[2].operator is '-' and is_node_type(a[2].expression, AST_Number)
        )):
            if (l is 1 and not has_calls(a[0])) or (l > 1 and not has_calls(a[1])):
                return True
    return False

def print_for_loop_body(output):
    self = this
    output.with_block(def():
        if not (self.simple_for_index or is_simple_for_in(self)):
            # if we're using multiple iterators, unpack them
            output.indent()
            itervar = "ρσ_Index" + output.index_counter
            if is_node_type(self.init, AST_Array):
                flat = self.init.flatten()
                output.assign("ρσ_unpack")
                if flat.length > self.init.elements.length:
                    output.print('ρσ_flatten(' + itervar + ')')
                else:
                    output.print(itervar)
                output.end_statement()
                unpack_tuple(flat, output)
            else:
                output.assign(self.init)
                output.print(itervar)
                output.end_statement()

            output.index_counter += 1
        if self.simple_for_index:
            output.indent()
            output.assign(self.init)
            output.print(self.simple_for_index)
            output.end_statement()

        for stmt in self.body.body:
            output.indent()
            stmt.print(output)
            output.newline()
    )

def init_es6_itervar(output, itervar):
    output.indent()
    output.spaced(itervar, '=', '((typeof', itervar + '[Symbol.iterator]', '===', '"function")', '?',
                    '('+itervar, 'instanceof', 'Map', '?', itervar + '.keys()', ':', itervar+')', ':', 'Object.keys(' + itervar + '))')
    output.end_statement()

def print_for_in(self, output):
    def write_object():
        if self.object.constructor is AST_Seq:
            (new AST_Array({'elements':self.object.to_array()})).print(output)
        else:
            self.object.print(output)

    if is_simple_for(self):
        # optimize range() into a simple for loop
        increment = None
        args = self.object.args
        tmp_ = args.length
        if tmp_ is 1:
            start = 0
            end = args[0]
        elif tmp_ is 2:
            start = args[0]
            end = args[1]
        elif tmp_ is 3:
            start = args[0]
            end = args[1]
            increment = args[2]

        self.simple_for_index = idx = 'ρσ_Index' + output.index_counter
        output.index_counter += 1
        output.print("for")
        output.space()
        output.with_parens(def():
            output.spaced('var', idx, '='), output.space()
            start.print(output) if start.print else output.print(start)
            output.semicolon()
            output.space()
            output.print(idx)
            output.space()
            output.print(">") if is_node_type(increment, AST_Unary) else output.print("<")
            output.space()
            end.print(output)
            output.semicolon()
            output.space()
            output.print(idx)
            if increment and (not (is_node_type(increment, AST_Unary)) or increment.expression.value is not "1"):
                if is_node_type(increment, AST_Unary):
                    output.print("-=")
                    increment.expression.print(output)
                else:
                    output.print("+=")
                    increment.print(output)
            else:
                if is_node_type(increment, AST_Unary):
                    output.print("--")
                else:
                    output.print("++")
        )
    elif is_simple_for_in(self):
        # optimize dir() into a simple for in loop
        output.print("for")
        output.space()
        output.with_parens(def():
            self.init.print(output)
            output.space()
            output.print('in')
            output.space()
            self.object.args[0].print(output)
        )
    else:
        # regular loop
        itervar = "ρσ_Iter" + output.index_counter
        output.assign("var " + itervar)
        write_object()
        output.end_statement()
        init_es6_itervar(output, itervar)
        output.indent()
        output.spaced('for', '(var', 'ρσ_Index' + output.index_counter, 'of', itervar + ')')

    output.space()
    self._do_print_body(output)

def print_list_comprehension(self, output):
    tname = self.constructor.name.slice(4)
    result_obj = {'ListComprehension':'[]', 'DictComprehension':('Object.create(null)' if self.is_jshash else '{}'), 'SetComprehension':'ρσ_set()'}[tname]
    is_generator = tname is 'GeneratorComprehension'
    if tname is 'DictComprehension':
        if self.is_pydict:
            result_obj = 'ρσ_dict()'
            add_to_result = def(output):
                output.indent()
                output.print('ρσ_Result.set')
                output.with_parens(def():
                    self.statement.print(output)
                    output.space(), output.print(','), output.space()
                    output.with_parens(def():
                        if self.value_statement.constructor is AST_Seq:
                            output.with_square(def():self.value_statement.print(output);)
                        else:
                            self.value_statement.print(output)
                    )
                )
                output.end_statement()
        else:
            add_to_result = def(output):
                output.indent()
                output.print('ρσ_Result')
                output.with_square(def():
                    self.statement.print(output)
                )
                output.space(), output.print('='), output.space()
                output.with_parens(def():
                    if self.value_statement.constructor is AST_Seq:
                        output.with_square(def():self.value_statement.print(output);)
                    else:
                        self.value_statement.print(output)
                )
                output.end_statement()
    else:
        push_func = "ρσ_Result." + ('push' if self.constructor is AST_ListComprehension else 'add')
        if is_generator:
            push_func = 'yield '
        add_to_result = def(output):
            output.indent()
            output.print(push_func)
            output.with_parens(def():
                if self.statement.constructor is AST_Seq:
                    output.with_square(def():self.statement.print(output);)
                else:
                    self.statement.print(output)
            )
            output.end_statement()

    output.with_parens(def():
        output.print("function")
        output.print("()")
        output.space()
        output.with_block(def():
            body_out = output
            if is_generator:
                body_out.indent()
                body_out.print('function* js_generator()'), body_out.space(), body_out.print('{')
                body_out.newline()
                previous_indentation = output.indentation()
                output.set_indentation(output.next_indent())
            body_out.indent()
            body_out.assign("var ρσ_Iter")
            self.object.print(body_out)

            if result_obj:
                body_out.comma()
                body_out.assign("ρσ_Result")
                body_out.print(result_obj)
            # make sure to locally scope loop variables
            if is_node_type(self.init, AST_Array):
                for i in self.init.elements:
                    body_out.comma()
                    i.print(body_out)
            else:
                body_out.comma()
                self.init.print(body_out)
            body_out.end_statement()

            init_es6_itervar(body_out, 'ρσ_Iter')
            body_out.indent()
            body_out.print("for")
            body_out.space()
            body_out.with_parens(def():
                body_out.spaced('var', 'ρσ_Index', 'of', 'ρσ_Iter')
            )
            body_out.space()
            body_out.with_block(def():
                body_out.indent()
                itervar = 'ρσ_Index'
                if is_node_type(self.init, AST_Array):
                    flat = self.init.flatten()
                    body_out.assign("ρσ_unpack")
                    if flat.length > self.init.elements.length:
                        body_out.print('ρσ_flatten(' + itervar + ')')
                    else:
                        body_out.print(itervar)
                    body_out.end_statement()
                    unpack_tuple(flat, body_out)
                else:
                    body_out.assign(self.init)
                    body_out.print(itervar)
                    body_out.end_statement()

                if self.condition:
                    body_out.indent()
                    body_out.print("if")
                    body_out.space()
                    body_out.with_parens(def(): self.condition.print(body_out);)
                    body_out.space()
                    body_out.with_block(def():
                        add_to_result(body_out)
                    )
                    body_out.newline()
                else:
                    add_to_result(body_out)
            )
            body_out.newline()
            if self.constructor is AST_ListComprehension:
                body_out.indent()
                body_out.spaced('ρσ_Result', '=', 'ρσ_list_constructor(ρσ_Result)')
                body_out.end_statement()
            if not is_generator:
                body_out.indent()
                body_out.print("return ρσ_Result")
                body_out.end_statement()
            if is_generator:
                output.set_indentation(previous_indentation)
                body_out.newline(), body_out.indent(), body_out.print('}')  # end js_generator
                output.newline(), output.indent()
                output.spaced('var', 'result', '=', 'js_generator.call(this)')
                output.end_statement()
                # Python's generator objects use a separate method to send data to the generator
                output.indent()
                output.spaced('result.send', '=', 'result.next')
                output.end_statement()
                output.indent()
                output.spaced('return', 'result')
                output.end_statement()
        )
    )
    output.print("()")
