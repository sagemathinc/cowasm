# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
from __python__ import hash_literals

# globals:console,writefile

from utils import noop
from parse import PRECEDENCE
from ast_types import (
    AST_Array, AST_Assign, AST_BaseCall, AST_Binary, AST_BlockStatement,
    AST_Break, AST_Class, AST_Conditional, AST_Constant, AST_Continue,
    AST_Debugger, AST_Definitions, AST_Directive, AST_Do, AST_Dot,
    is_node_type, AST_EllipsesRange, AST_EmptyStatement, AST_Exit,
    AST_ExpressiveObject, AST_ForIn, AST_ForJS, AST_Function, AST_Hole, AST_If,
    AST_Imports, AST_Infinity, AST_Lambda, AST_ListComprehension,
    AST_LoopControl, AST_NaN, AST_New, AST_Node, AST_Number, AST_Object,
    AST_ObjectKeyVal, AST_ObjectProperty, AST_PropAccess, AST_RegExp,
    AST_Return, AST_Set, AST_Seq, AST_SimpleStatement, AST_Splice,
    AST_Statement, AST_StatementWithBody, AST_String, AST_Sub, AST_ItemAccess,
    AST_Symbol, AST_This, AST_Throw, AST_Toplevel, AST_Try, AST_Unary,
    AST_UnaryPrefix, AST_Undefined, AST_Var, AST_VarDef, AST_Assert,
    AST_Verbatim, AST_While, AST_With, AST_Yield, TreeWalker, AST_Existential)
from output.exceptions import print_try
from output.classes import print_class
from output.literals import print_array, print_obj_literal, print_object, print_set, print_regexp
from output.loops import print_do_loop, print_while_loop, print_for_loop_body, print_for_in, print_list_comprehension, print_ellipses_range
from output.modules import print_top_level, print_imports
from output.comments import print_comments
from output.operators import (print_getattr, print_getitem, print_rich_getitem,
                              print_splice_assignment, print_unary_prefix,
                              print_binary_op, print_assign, print_conditional,
                              print_seq, print_existential)
from output.functions import print_function, print_function_call
from output.statements import print_bracketed, first_in_statement, force_statement, print_with, print_assert
from output.utils import make_block, make_num


# -----[ code generators ]-----
def generate_code():
    # -----[ utils ]-----
    def DEFPRINT(nodetype, generator):
        nodetype.prototype._codegen = generator

    def f_print_generate(stream, force_parens):
        self = this
        generator = self._codegen
        stream.push_node(self)
        if force_parens or self.needs_parens(stream):
            stream.with_parens(f_comments_then_generator)

            def f_comments_then_generator():
                self.add_comments(stream)
                generator(self, stream)
        else:
            self.add_comments(stream)
            generator(self, stream)

        stream.pop_node()

    AST_Node.prototype.print = f_print_generate

    # -----[ comments ]-----
    def add_comments(output):
        if not is_node_type(this, AST_Toplevel):
            print_comments(this, output)

    AST_Node.prototype.add_comments = add_comments

    # -----[ PARENTHESES ]-----
    def PARENS(nodetype, func):
        nodetype.prototype.needs_parens = func

    PARENS(AST_Node, lambda: False)
    # a function expression needs parens around it when it's provably
    # the first token to appear in a statement.
    PARENS(AST_Function, first_in_statement)
    # same goes for an object literal, because otherwise it would be
    # interpreted as a block of code.
    PARENS(AST_Object, first_in_statement)

    def f_unary(output):
        p = output.parent()
        return is_node_type(p, AST_PropAccess) and p.expression is this

    PARENS(AST_Unary, f_unary)

    def f_seq(output):
        p = output.parent()
        return is_node_type(p, AST_Unary) or is_node_type(
            p, AST_VarDef) or is_node_type(p, AST_Dot) or is_node_type(
                p, AST_ObjectProperty) or is_node_type(p, AST_Conditional)

    PARENS(AST_Seq, f_seq)

    def f_binary(output):
        p = output.parent()
        # (foo && bar)()
        if is_node_type(p, AST_BaseCall) and p.expression is this:
            return True

        # typeof (foo && bar)
        if is_node_type(p, AST_Unary):
            return True

        # (foo && bar)["prop"], (foo && bar).prop
        if is_node_type(p, AST_PropAccess) and p.expression is this:
            return True

        # this deals with precedence: 3 * (2 + 1)
        if is_node_type(p, AST_Binary):
            po = p.operator
            pp = PRECEDENCE[po]
            so = this.operator
            sp = PRECEDENCE[so]
            if pp > sp or pp is sp and this is p.right and not (
                    so is po and (so is "*" or so is "&&" or so is "||")):
                return True

    PARENS(AST_Binary, f_binary)

    def f_prop_access(output):
        p = output.parent()
        if is_node_type(p, AST_New) and p.expression is this:
            # i.e. new (foo.bar().baz)
            #
            # if there's one call into this subtree, then we need
            # parens around it too, otherwise the call will be
            # interpreted as passing the arguments to the upper New
            # expression.
            try:

                def error_on_base_call(node):
                    if is_node_type(node, AST_BaseCall):
                        raise p

                this.walk(TreeWalker(error_on_base_call))
            except:
                return True

    PARENS(AST_PropAccess, f_prop_access)

    def f_base_call(output):
        p = output.parent()
        return is_node_type(p, AST_New) and p.expression is this

    PARENS(AST_BaseCall, f_base_call)

    def f_new(output):
        p = output.parent()
        if this.args.length is 0 and (is_node_type(p, AST_PropAccess)
                                      or is_node_type(p, AST_BaseCall)
                                      and p.expression is this):
            # (new foo)(bar)
            return True

    PARENS(AST_New, f_new)

    def f_number(output):
        p = output.parent()
        if this.value < 0 and is_node_type(
                p, AST_PropAccess) and p.expression is this:
            return True

    PARENS(AST_Number, f_number)

    def f_nan(output):
        p = output.parent()
        if is_node_type(p, AST_PropAccess) and p.expression is this:
            return True

    PARENS(AST_NaN, f_nan)

    def assign_and_conditional_paren_rules(output):
        p = output.parent()
        # !(a = false) → true
        if is_node_type(p, AST_Unary):
            return True

        # 1 + (a = 2) + 3 → 6, side effect setting a = 2
        if is_node_type(p, AST_Binary) and not (is_node_type(p, AST_Assign)):
            return True

        # (a = func)() —or— new (a = Object)()
        if is_node_type(p, AST_BaseCall) and p.expression is this:
            return True

        # bar if a = foo else baz
        if is_node_type(p, AST_Conditional) and p.condition is this:
            return True

        # (a = foo)["prop"] —or— (a = foo).prop
        if is_node_type(p, AST_PropAccess) and p.expression is this:
            return True

    PARENS(AST_Assign, assign_and_conditional_paren_rules)
    PARENS(AST_Conditional, assign_and_conditional_paren_rules)

    # -----[ PRINTERS ]-----
    def f_directive(self, output):
        output.print_string(self.value)
        output.semicolon()

    DEFPRINT(AST_Directive, f_directive)

    def f_debugger(self, output):
        output.print("debugger")
        output.semicolon()

    DEFPRINT(AST_Debugger, f_debugger)

    AST_StatementWithBody.prototype._do_print_body = lambda output: force_statement(
        this.body, output)

    def f_statement(self, output):
        self.body.print(output)
        output.semicolon()

    DEFPRINT(AST_Statement, f_statement)
    DEFPRINT(AST_Toplevel, print_top_level)

    DEFPRINT(AST_Imports, print_imports)

    def f_simple_statement(self, output):
        if not (is_node_type(self.body, AST_EmptyStatement)):
            self.body.print(output)
            output.semicolon()

    DEFPRINT(AST_SimpleStatement, f_simple_statement)
    DEFPRINT(AST_BlockStatement,
             lambda self, output: print_bracketed(self, output))

    DEFPRINT(AST_EmptyStatement, lambda self, output: None)

    DEFPRINT(AST_Do, print_do_loop)

    DEFPRINT(AST_While, print_while_loop)

    AST_ForIn.prototype._do_print_body = print_for_loop_body

    DEFPRINT(AST_ForIn, print_for_in)

    def f_do_print_body(output):
        self = this

        def f_print_stmt():
            for stmt in self.body.body:
                output.indent()
                stmt.print(output)
                output.newline()

        output.with_block(f_print_stmt)

    AST_ForJS.prototype._do_print_body = f_do_print_body

    def f_for_js(self, output):
        output.print("for")
        output.space()
        output.with_parens(lambda: self.condition.print(output))
        output.space()
        self._do_print_body(output)

    DEFPRINT(AST_ForJS, f_for_js)

    DEFPRINT(AST_ListComprehension, print_list_comprehension)

    DEFPRINT(AST_EllipsesRange, print_ellipses_range)

    DEFPRINT(AST_With, print_with)

    DEFPRINT(AST_Assert, print_assert)

    AST_Lambda.prototype._do_print = print_function

    DEFPRINT(AST_Lambda, lambda self, output: self._do_print(output))
    AST_Class.prototype._do_print = print_class
    DEFPRINT(AST_Class, lambda self, output: self._do_print(output))

    # -----[ exits ]-----
    def f_do_print_exit(output, kind):
        self = this
        output.print(kind)
        if self.value:
            output.space()
            self.value.print(output)

        output.semicolon()

    AST_Exit.prototype._do_print = f_do_print_exit

    DEFPRINT(
        AST_Yield, lambda self, output: self._do_print(
            output, "yield" + ('*' if self.is_yield_from else '')))
    DEFPRINT(AST_Return, lambda self, output: self._do_print(output, "return"))
    DEFPRINT(AST_Throw, lambda self, output: self._do_print(output, "throw"))

    # -----[ loop control ]-----
    def f_do_print_loop(output, kind):
        output.print(kind)
        if this.label:
            output.space()
            this.label.print(output)

        output.semicolon()

    AST_LoopControl.prototype._do_print = f_do_print_loop

    DEFPRINT(AST_Break, lambda self, output: self._do_print(output, "break"))

    DEFPRINT(AST_Continue,
             lambda self, output: self._do_print(output, "continue"))

    # -----[ if ]-----
    def make_then(self, output):
        if output.options.bracketize:
            make_block(self.body, output)
            return

        # The squeezer replaces "block"-s that contain only a single
        # statement with the statement itself; technically, the AST
        # is correct, but this can create problems when we output an
        # IF having an ELSE clause where the THEN clause ends in an
        # IF *without* an ELSE block (then the outer ELSE would refer
        # to the inner IF).  This function checks for this case and
        # adds the block brackets if needed.
        if not self.body:
            return output.force_semicolon()

        if is_node_type(self.body, AST_Do) and output.options.ie_proof:
            # https://github.com/mishoo/RapydScript/issues/#issue/57 IE
            # croaks with "syntax error" on code like this: if (foo)
            # do ... while(cond); else ...  we need block brackets
            # around do/while
            make_block(self.body, output)
            return

        b = self.body
        while True:
            if is_node_type(b, AST_If):
                if not b.alternative:
                    make_block(self.body, output)
                    return

                b = b.alternative
            elif is_node_type(b, AST_StatementWithBody):
                b = b.body
            else:
                break

        force_statement(self.body, output)

    def f_if(self, output):
        output.print("if")
        output.space()
        output.with_parens(lambda: self.condition.print(output))
        output.space()
        if self.alternative:
            make_then(self, output)
            output.space()
            output.print("else")
            output.space()
            force_statement(self.alternative, output)
        else:
            self._do_print_body(output)

    DEFPRINT(AST_If, f_if)

    # -----[ exceptions ]-----
    DEFPRINT(AST_Try, print_try)

    # -----[ var/const ]-----
    def f_do_print_definition(output, kind):
        output.print(kind)
        output.space()
        for i, def_ in enumerate(this.definitions):
            if i:
                output.comma()
            def_.print(output)
        p = output.parent()
        in_for = is_node_type(p, AST_ForIn)
        avoid_semicolon = in_for and p.init is this
        if not avoid_semicolon:
            output.semicolon()

    AST_Definitions.prototype._do_print = f_do_print_definition

    DEFPRINT(AST_Var, lambda self, output: self._do_print(output, "var"))

    def parenthesize_for_noin(node, output, noin):
        if not noin:
            node.print(output)
        else:
            try:
                # need to take some precautions here:
                #    https://github.com/mishoo/RapydScript2/issues/60
                def f_for_noin(node):
                    if is_node_type(node,
                                    AST_Binary) and node.operator is "in":
                        raise output

                node.walk(TreeWalker(f_for_noin))
                node.print(output)
            except:
                node.print(output, True)

    def f_print_var_def(self, output):
        self.name.print(output)
        if self.value:
            output.assign("")
            #            output.space()
            #            output.print("=")
            #            output.space()
            p = output.parent(1)
            noin = is_node_type(p, AST_ForIn)
            parenthesize_for_noin(self.value, output, noin)

    DEFPRINT(AST_VarDef, f_print_var_def)

    # -----[ other expressions ]-----
    DEFPRINT(AST_BaseCall, print_function_call)

    AST_Seq.prototype._do_print = print_seq

    DEFPRINT(AST_Seq, lambda self, output: self._do_print(output))

    DEFPRINT(AST_Dot, print_getattr)

    DEFPRINT(AST_Sub, print_getitem)

    DEFPRINT(AST_ItemAccess, print_rich_getitem)

    DEFPRINT(AST_Splice, print_splice_assignment)

    DEFPRINT(AST_UnaryPrefix, print_unary_prefix)

    DEFPRINT(AST_Binary, print_binary_op)

    DEFPRINT(AST_Existential, print_existential)

    DEFPRINT(AST_Assign, print_assign)

    DEFPRINT(AST_Conditional, print_conditional)

    # -----[ literals ]-----
    DEFPRINT(AST_Array, print_array)

    DEFPRINT(AST_ExpressiveObject, print_obj_literal)

    DEFPRINT(AST_Object, print_object)

    DEFPRINT(AST_ObjectKeyVal, f_print_obj_key_val)

    def f_print_obj_key_val(self, output):
        self.key.print(output)
        output.colon()
        self.value.print(output)

    DEFPRINT(AST_Set, print_set)

    AST_Symbol.prototype.definition = lambda: this.thedef

    DEFPRINT(AST_Symbol, f_print_symbol)

    def f_print_symbol(self, output):
        def_ = self.definition()
        output.print_name((
            def_.mangled_name or def_.name) if def_ else self.name)

    DEFPRINT(AST_Undefined, lambda self, output: output.print("void 0"))
    DEFPRINT(AST_Hole, noop)

    DEFPRINT(AST_Infinity, lambda self, output: output.print("1/0"))
    DEFPRINT(AST_NaN, lambda self, output: output.print("0/0"))
    DEFPRINT(AST_This, lambda self, output: output.print("this"))
    DEFPRINT(AST_Constant, lambda self, output: output.print(self.value))
    DEFPRINT(AST_String, lambda self, output: output.print_string(self.value))
    DEFPRINT(AST_Verbatim, lambda self, output: output.print(self.value))
    DEFPRINT(AST_Number,
             lambda self, output: output.print(make_num(self.value)))
    DEFPRINT(AST_RegExp, print_regexp)
