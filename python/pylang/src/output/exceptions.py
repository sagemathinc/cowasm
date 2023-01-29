# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
from __python__ import hash_literals

from output.statements import print_bracketed


def print_try(self, output):
    else_var_name = None

    def update_output_var(output):
        output.indent(), output.assign(else_var_name), output.print(
            'true'), output.end_statement()

    if self.belse:
        else_var_name = output.new_try_else_counter()
        output.assign('var ' + else_var_name), output.print(
            'false'), output.end_statement(), output.indent()
    output.print("try")
    output.space()
    print_bracketed(self, output, False, None, None,
                    update_output_var if else_var_name else None)
    if self.bcatch:
        output.space()
        print_catch(self.bcatch, output)

    if self.bfinally:
        output.space()
        print_finally(self.bfinally, output, self.belse, else_var_name)
    elif self.belse:
        output.newline()
        print_else(self.belse, else_var_name, output)


def print_catch(self, output):
    output.print("catch")
    output.space()
    output.with_parens(lambda: output.print("ρσ_Exception"))
    output.space()

    def f_exception():
        output.indent()
        output.spaced('ρσ_last_exception', '=',
                      'ρσ_Exception'), output.end_statement()
        output.indent()
        no_default = True
        for i, exception in enumerate(self.body):
            if i:
                output.print("else ")

            if exception.errors.length:
                output.print("if")
                output.space()

                def f_errors():
                    for i, err in enumerate(exception.errors):
                        if i:
                            output.newline()
                            output.indent()
                            output.print("||")
                            output.space()

                        output.print("ρσ_Exception")
                        output.space()
                        output.print("instanceof")
                        output.space()
                        if err.name is 'Exception':
                            output.print('Error')
                        else:
                            err.print(output)

                output.with_parens(f_errors)
                output.space()
            else:
                no_default = False
            print_bracketed(exception, output, True)
            output.space()
        if no_default:
            output.print("else")
            output.space()

            def f_throw():
                output.indent()
                output.print("throw")
                output.space()
                output.print("ρσ_Exception")
                output.semicolon()
                output.newline()

            output.with_block(f_throw)
        output.newline()

    output.with_block(f_exception)


def print_finally(self, output, belse, else_var_name):
    output.print("finally")
    output.space()
    if else_var_name:

        def f_try():
            output.indent(), output.print("try")
            output.space()
            output.with_block(lambda: print_else(belse, else_var_name, output))
            print_finally(self, output)

        output.with_block(f_try)
    else:
        print_bracketed(self, output)


def print_else(self, else_var_name, output):
    output.indent(), output.spaced('if', '(' + else_var_name + ')')
    output.space()
    print_bracketed(self, output)
