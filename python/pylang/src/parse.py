# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
# globals: readfile
from __python__ import hash_literals  # type: ignore

from utils import make_predicate, array_to_hash, defaults, has_prop, cache_file_name
from errors import SyntaxError, ImportError
from ast_types import (
    AST_Array, AST_Assign, AST_Binary, AST_BlockStatement, AST_Break, AST_Call,
    AST_Catch, AST_Class, AST_ClassCall, AST_Conditional, AST_Constant,
    AST_Continue, AST_DWLoop, AST_Debugger, AST_Decorator, AST_Definitions,
    AST_DictComprehension, AST_Directive, AST_Do, AST_Dot, AST_EllipsesRange,
    AST_Else, AST_EmptyStatement, AST_Except, AST_ExpressiveObject, AST_False,
    AST_Finally, AST_ForIn, AST_ForJS, AST_Function,
    AST_GeneratorComprehension, AST_Hole, AST_If, AST_Import, AST_ImportedVar,
    AST_Imports, AST_ListComprehension, AST_Method, AST_New, AST_Null,
    AST_Number, AST_Object, AST_ObjectKeyVal, AST_PropAccess, AST_RegExp,
    AST_Return, AST_Scope, AST_Set, AST_SetComprehension, AST_SetItem, AST_Seq,
    AST_SimpleStatement, AST_Splice, AST_String, AST_Sub, AST_ItemAccess,
    AST_SymbolAlias, AST_SymbolCatch, AST_SymbolDefun, AST_SymbolFunarg,
    AST_SymbolLambda, AST_SymbolNonlocal, AST_SymbolRef, AST_SymbolVar,
    AST_This, AST_Throw, AST_Toplevel, AST_True, AST_Try, AST_UnaryPrefix,
    AST_Undefined, AST_Var, AST_VarDef, AST_Verbatim, AST_While, AST_With,
    AST_WithClause, AST_Yield, AST_Assert, AST_Existential, is_node_type)
from tokenizer import tokenizer, is_token, RESERVED_WORDS
from js import js_new

COMPILER_VERSION = '__COMPILER_VERSION__'
PYTHON_FLAGS = {
    'exponent':
    True,  # support a^b-->a**b (and a^^b = a xor b), which is very math friendly (no performance impact)
    'ellipses':
    True,  # support the [a..b] = range(a, b+1) notation, which is very math friendly  (no performance impact)
    'numbers':
    True,  # numbers are arbitrary precision (potentially massive performance impact and breakage!)
    'annotations':
    False,  # if true, set function annotations; off by default since breaks mypy
    'dict_literals':
    True,  # MASSIVELY performance impact! -- e.g., 100x -- careful
    'overload_getitem': True,
    'bound_methods': True,
    'hash_literals': True
}


def get_compiler_version():
    return COMPILER_VERSION


def static_predicate(names):
    return {k: True for k in names.split(' ')}


NATIVE_CLASSES = {
    'Image': {},
    'FileReader': {},
    'RegExp': {},
    'Error': {},
    'EvalError': {},
    'InternalError': {},
    'RangeError': {},
    'RumtimeError': {},
    'ReferenceError': {},
    'SyntaxError': {},
    'TypeError': {},
    'URIError': {},
    'Object': {
        'static':
        static_predicate(
            'getOwnPropertyNames getOwnPropertyDescriptor getOwnPropertyDescriptors'
            ' getOwnPropertySymbols keys entries values create defineProperty'
            ' defineProperties getPrototypeOf setPrototypeOf assign'
            ' seal isSealed is preventExtensions isExtensible'
            ' freeze isFrozen')
    },
    'String': {
        'static': static_predicate("fromCharCode")
    },
    'Array': {
        'static': static_predicate("isArray from of")
    },
    'Function': {},
    'Date': {
        'static': static_predicate("UTC now parse")
    },
    'ArrayBuffer': {
        'static': static_predicate('isView transfer')
    },
    'DataView': {},
    'Float32Array': {},
    'Float64Array': {},
    'Int16Array': {},
    'Int32Array': {},
    'Int8Array': {},
    'Uint16Array': {},
    'Uint32Array': {},
    'Uint8Array': {},
    'Uint8ClampedArray': {},
    'Map': {},
    'WeakMap': {},
    'Proxy': {},
    'Set': {},
    'WeakSet': {},
    'Promise': {
        'static': static_predicate('all race reject resolve')
    },
    'WebSocket': {},
    'XMLHttpRequest': {},
    'TextEncoder': {},
    'TextDecoder': {},
    'MouseEvent': {},
    'Event': {},
    'CustomEvent': {},
    'Blob': {},
}
ERROR_CLASSES = {
    'Exception': {},
    'AttributeError': {},
    'IndexError': {},
    'KeyError': {},
    'ValueError': {},
    'UnicodeDecodeError': {},
    'AssertionError': {},
    'ZeroDivisionError': {},
}
COMMON_STATIC = static_predicate('call apply bind toString')
FORBIDDEN_CLASS_VARS = 'prototype constructor'.split(' ')

# -----[ Parser (constants) ]-----
UNARY_PREFIX = make_predicate('typeof void delete ~ - + ! @')

ASSIGNMENT = make_predicate('= += -= /= //= *= %= >>= <<= >>>= |= ^= &=')


def operator_to_precedence(a):
    """
    Compute map from operator to its precendence number.
    """
    op_to_prec = {}
    for i in range(a.length):
        b = a[i]
        for j in range(b.length):
            op_to_prec[b[j]] = i + 1
    return op_to_prec


PRECEDENCE = operator_to_precedence([
    # lowest precedence
    ["||"],
    ["&&"],
    ["|"],
    ["^"],
    ["&"],
    ["==", "===", "!=", "!=="],
    ["<", ">", "<=", ">=", "in", "nin", "instanceof"],
    [">>", "<<", ">>>"],
    ["+", "-"],
    ["*", "/", "//", "%"],
    ["**"]
    # highest precedence
])

STATEMENTS_WITH_LABELS = array_to_hash(["for", "do", "while", "switch"])

ATOMIC_START_TOKEN = array_to_hash(
    ["atom", "num", "string", "regexp", "name", "js"])

compile_time_decorators = ['staticmethod', 'external', 'property']


def has_simple_decorator(decorators, name):
    remove = []
    for i in range(decorators.length):
        s = decorators[i]
        if is_node_type(s, AST_SymbolRef) and not s.parens and s.name is name:
            remove.push(i)
    if remove.length:
        remove.reverse()
        for i in range(remove.length):
            decorators.splice(remove[i], 1)
        return True
    return False


def has_setter_decorator(decorators, name):
    remove = []
    for i in range(decorators.length):
        s = decorators[i]
        if is_node_type(s, AST_Dot) and is_node_type(
                s.expression, AST_SymbolRef
        ) and s.expression.name is name and s.property is 'setter':
            remove.push(i)
    if remove.length:
        remove.reverse()
        for i in range(remove.length):
            decorators.splice(remove[i], 1)
        return True
    return False


# -----[ Parser ]-----
def create_parser_ctx(S, import_dirs, module_id, baselib_items,
                      imported_module_ids, imported_modules, importing_modules,
                      options):
    def next():
        S.prev = S.token
        if S.peeked.length:
            S.token = S.peeked.shift()
        else:
            S.token = S.input()

        if options.tokens:
            print("token", S.token.type, S.token.value)
        return S.token

    def is_(type, value):
        return is_token(S.token, type, value)

    def peek():
        if not S.peeked.length:
            S.peeked.push(S.input())
        return S.peeked[0]

    def prev():
        return S.prev

    def croak(msg, line, col, pos, is_eof):
        # note: undefined means nothing was passed in, None/null means a null value was passed in
        ctx = S.input.context()
        raise SyntaxError(msg, ctx.filename,
                          (line if line is not undefined else ctx.tokline),
                          (col if col is not undefined else ctx.tokcol),
                          (pos if pos is not undefined else ctx.tokpos),
                          is_eof)

    def token_error(token, msg):
        is_eof = token.type is 'eof'
        croak(msg, token.line, token.col, undefined, is_eof)

    def unexpected(token):
        if token is undefined:
            token = S.token
        if token.type is 'operator' and token.value == '^^':
            croak(
                "Use 'from __python__ import exponent' to support the a^^b is a xor b and a^b is a**b"
            )
        token_error(
            token,
            "Unexpected token: " + token.type + " '" + token.value + "'")

    def expect_token(type, val):
        if is_(type, val):
            return next()
        token_error(
            S.token, "Unexpected token: found type='" + S.token.type +
            "', value='" + S.token.value + "'" + ";  expected: '" + type +
            "', value='" + val + "'")

    def expect(punc):
        return expect_token("punc", punc)

    def semicolon():
        if is_("punc", ";"):
            next()
            S.token.nlb = True

    def embed_tokens(parser):
        def with_embedded_tokens():
            start = S.token
            expr = parser()
            if expr is undefined:
                unexpected()
            end = prev()
            expr.start = start
            expr.end = end
            return expr

        return with_embedded_tokens

    def scan_for_top_level_callables(body):
        ans = r'%js []'
        # Get the named functions and classes
        if Array.isArray(body):
            for obj in body:
                if is_node_type(obj, AST_Function) or is_node_type(
                        obj, AST_Class):
                    if obj.name:
                        ans.push(obj.name.name)
                    else:
                        token_error(obj.start,
                                    "Top-level functions must have names")
                else:
                    # skip inner scopes
                    if is_node_type(obj, AST_Scope):
                        continue
                    for x in ['body', 'alternative']:
                        opt = obj[x]
                        if opt:
                            ans = ans.concat(scan_for_top_level_callables(opt))

                        if is_node_type(opt, AST_Assign) and not (is_node_type(
                                opt.right, AST_Scope)):
                            ans = ans.concat(
                                scan_for_top_level_callables(opt.right))

        elif body.body:
            # recursive descent into wrapper statements that contain body blocks
            ans = ans.concat(scan_for_top_level_callables(body.body))
            if body.alternative:
                ans = ans.concat(scan_for_top_level_callables(
                    body.alternative))

        return ans

    def scan_for_classes(body):
        ans = {}
        for obj in body:
            if is_node_type(obj, AST_Class):
                ans[obj.name.name] = obj
        return ans

    def scan_for_local_vars(body):
        """
        Pick out all variables being assigned to from within this scope, we'll mark them as local

        body        body to be scanned
        """
        localvars = r'%js []'
        seen = {}

        def push(x):
            if has_prop(seen, x):
                return
            seen[x] = True
            localvars.push(x)

        def extend(arr):
            for x in arr:
                push(x)

        def scan_in_array(arr):
            for x in arr:
                if is_node_type(x, AST_Seq):
                    x = x.to_array()
                elif is_node_type(x, AST_Array):
                    x = x.elements
                if Array.isArray(x):
                    scan_in_array(x)
                else:
                    if not is_node_type(x, AST_PropAccess):
                        push(x.name)

        def add_assign_lhs(lhs):
            if is_node_type(lhs, AST_Seq):
                lhs = AST_Array({'elements': lhs.to_array()})
            if is_node_type(lhs, AST_Array):
                # assignment to an implicit tuple
                push("ρσ_unpack")
                scan_in_array(lhs.elements)
            elif lhs.name:
                # assignment to a single variable
                push(lhs.name)

        def add_for_in(stmt):
            if is_node_type(stmt.init, AST_Array):
                # iteration via implicit tuple
                push("ρσ_unpack")
                scan_in_array(stmt.init.elements)
            else:
                # iteration via a single variable
                push(stmt.init.name)

        if Array.isArray(body):
            # this is a body of statements
            for stmt in body:
                # skip inner scopes
                if is_node_type(stmt, AST_Scope):
                    continue

                # recursive descent into conditional, loop and exception bodies
                for option in ('body', 'alternative', 'bcatch', 'condition'):
                    opt = stmt[option]
                    if opt:
                        extend(scan_for_local_vars(opt))

                    if is_node_type(opt, AST_Assign) and not (is_node_type(
                            opt.right, AST_Scope)):
                        extend(scan_for_local_vars(opt.right))

                # pick up iterators from loops
                if is_node_type(stmt, AST_ForIn):
                    add_for_in(stmt)
                elif is_node_type(stmt, AST_DWLoop):
                    extend(scan_for_local_vars(stmt))
                elif is_node_type(stmt, AST_With):
                    push('ρσ_with_exception'), push('ρσ_with_suppress')
                    for clause in stmt.clauses:
                        if clause.alias:
                            push(clause.alias.name)

        elif body.body:
            # recursive descent into wrapper statements that contain body blocks
            extend(scan_for_local_vars(body.body))
            if body.alternative:
                extend(scan_for_local_vars(body.alternative))

        elif is_node_type(body, AST_Assign):
            # this is a single assignment operator
            if body.is_chained():
                is_compound_assign = False
                for lhs in body.traverse_chain()[0]:
                    add_assign_lhs(lhs)
                    if is_node_type(lhs, AST_Seq) or is_node_type(
                            lhs, AST_Array):
                        is_compound_assign = True
                        break
                if is_compound_assign:
                    push('ρσ_chain_assign_temp')
            else:
                add_assign_lhs(body.left)
            if not is_node_type(body.right, AST_Scope):
                extend(scan_for_local_vars(body.right))

        elif is_node_type(body, AST_ForIn):
            add_for_in(body)

        return localvars

    def scan_for_nonlocal_defs(body):
        vars = r'%js []'
        if Array.isArray(body):
            for stmt in body:
                if is_node_type(stmt, AST_Scope):
                    continue

                # don't invade nested scopes
                if is_node_type(stmt, AST_Definitions):
                    for vardef in stmt.definitions:
                        vars.push(vardef.name.name)

                for option in ('body', 'alternative'):
                    nonlocal vars
                    opt = stmt[option]
                    if opt:
                        vars = vars.concat(scan_for_nonlocal_defs(opt))

        elif body.body:
            vars = vars.concat(scan_for_nonlocal_defs(body.body))
            if body.alternative:
                vars = vars.concat(scan_for_nonlocal_defs(body.alternative))

        return vars

    def return_():
        if is_('punc', ';'):
            semicolon()
            value = None
        else:
            is_end_of_statement = S.token.nlb or is_("eof") or is_("punc", "}")
            if is_end_of_statement:
                value = None
            else:
                value = expression(True)
                semicolon()
        return value

    @embed_tokens
    def statement():
        # From Kovid: The next three lines were a hack to try to support statements
        # starting with a regexp literal. However, it did not work, for example:
        # echo 'f=1\n/asd/.test()' | rs -> parse error
        # So we just accept that this cannot be supported in RS, and avoid hacks that mess
        # with the internal state of S. In any case,
        # statements starting with a literal are very rare.
        if S.token.type is 'operator' and S.token.value.substr(0, 1) is '/':
            token_error(
                S.token,
                'RapydScript does not support statements starting with regexp literals'
            )

        S.statement_starting_token = S.token
        tmp_ = S.token.type
        p = prev()
        if p and not S.token.nlb and ATOMIC_START_TOKEN[p.type] and not is_(
                'punc', ':') and not is_('punc', ';'):
            unexpected()
        if tmp_ is "string":
            return simple_statement()
        elif tmp_ is "shebang":
            tmp_ = S.token.value
            next()
            return AST_Directive({'value': tmp_})
        elif tmp_ is "num" or tmp_ is "regexp" or tmp_ is "operator" or tmp_ is "atom" or tmp_ is "js":
            return simple_statement()
        elif tmp_ is "punc":
            tmp_ = S.token.value
            if tmp_ is ":":
                return AST_BlockStatement({
                    'start': S.token,
                    'body': block_(),
                    'end': prev()
                })
            elif tmp_ is "{" or tmp_ is "[" or tmp_ is "(":
                return simple_statement()
            elif tmp_ is ";":
                next()
                return AST_EmptyStatement({
                    'stype': ';',
                    'start': prev(),
                    'end': prev()
                })
            else:
                unexpected()
        elif tmp_ is "name":
            if is_token(peek(), 'punc', ':'):
                token_error(peek(), 'invalid syntax, colon not allowed here')
            return simple_statement()
        elif tmp_ is "keyword":
            tmp_ = S.token.value
            next()
            if tmp_ is "break":
                return break_cont(AST_Break)
            elif tmp_ is "continue":
                return break_cont(AST_Continue)
            elif tmp_ is "debugger":
                semicolon()
                return AST_Debugger()
            elif tmp_ is "do":

                def get_condition():
                    expect(".")
                    expect_token("keyword", "while")
                    tmp = expression(True)
                    if is_node_type(tmp, AST_Assign):
                        croak(
                            'Assignments in do loop conditions are not allowed'
                        )
                    semicolon()
                    return tmp

                return AST_Do({
                    'body': in_loop(statement),
                    'condition': get_condition()
                })
            elif tmp_ is "while":
                while_cond = expression(True)
                if is_node_type(while_cond, AST_Assign):
                    croak(
                        'Assignments in while loop conditions are not allowed')
                if not is_('punc', ':'):
                    croak('Expected a colon after the while statement')
                return AST_While({
                    'condition': while_cond,
                    'body': in_loop(statement)
                })
            elif tmp_ is "for":
                if is_('js'):
                    return for_js()
                return for_()
            elif tmp_ is "from":
                return import_(True)
            elif tmp_ is "import":
                return import_(False)
            elif tmp_ is "class":
                return class_()
            elif tmp_ is "def":
                start = prev()
                func = function_(S.in_class[-1], False, False)
                func.start = start
                func.end = prev()
                chain = subscripts(func, True)
                if chain is func:
                    return func
                else:
                    return AST_SimpleStatement({
                        'start': start,
                        'body': chain,
                        'end': prev()
                    })
            elif tmp_ is 'assert':
                start = prev()
                cond = expression(False)
                msg = None
                if is_('punc', ','):
                    next()
                    msg = expression(False)
                return AST_Assert({
                    'start': start,
                    'condition': cond,
                    'message': msg,
                    'end': prev()
                })
            elif tmp_ is "if":
                return if_()
            elif tmp_ is "pass":
                semicolon()
                return AST_EmptyStatement({
                    'stype': 'pass',
                    'start': prev(),
                    'end': prev()
                })
            elif tmp_ is "return":
                if S.in_function is 0:
                    croak("'return' outside of function")
                if S.functions[-1].is_generator:
                    croak("'return' not allowed in a function with yield")
                S.functions[-1].is_generator = False

                return AST_Return({'value': return_()})
            elif tmp_ is "yield":
                return yield_()
            elif tmp_ is "raise":
                if S.token.nlb:
                    return AST_Throw(
                        {'value': AST_SymbolCatch({'name': "ρσ_Exception"})})

                tmp = expression(True)
                semicolon()
                return AST_Throw({'value': tmp})
            elif tmp_ is "try":
                return try_()
            elif tmp_ is "nonlocal":
                tmp = nonlocal_()
                semicolon()
                return tmp
            elif tmp_ is 'global':
                tmp = nonlocal_(True)
                semicolon()
                return tmp
            elif tmp_ is "with":
                return with_()
            else:
                unexpected()

    def with_():
        clauses = r'%js []'
        start = S.token
        while True:
            if is_('eof'):
                unexpected()
            expr = expression()
            alias = None
            if is_('keyword', 'as'):
                next()
                alias = as_symbol(AST_SymbolAlias)
            clauses.push(AST_WithClause({'expression': expr, 'alias': alias}))
            if is_('punc', ','):
                next()
                continue
            if not is_('punc', ':'):
                unexpected()
            break

        if not clauses.length:
            token_error(start, 'with statement must have at least one clause')
        body = statement()

        return AST_With({'clauses': clauses, 'body': body})

    def simple_statement(tmp):
        tmp = expression(True)
        semicolon()
        return AST_SimpleStatement({'body': tmp})

    def break_cont(t):
        if S.in_loop is 0:
            croak(t.name.slice(4) + " not inside a loop or switch")
        semicolon()
        return js_new(t)

    def yield_():
        if S.in_function is 0:
            croak("'yield' outside of function")
        if S.functions[-1].is_generator is False:
            croak("'yield' not allowed in a function with return")
        S.functions[-1].is_generator = True
        is_yield_from = is_('keyword', 'from')
        if is_yield_from:
            next()
        return AST_Yield({'is_yield_from': is_yield_from, 'value': return_()})

    def for_(list_comp):
        #        expect("(")
        init = None
        if not is_("punc", ";"):
            init = expression(True, True)
            # standardize AST_Seq into array now for consistency
            if is_node_type(init, AST_Seq):
                if is_node_type(init.car, AST_SymbolRef) and is_node_type(
                        init.cdr, AST_SymbolRef):
                    # Optimization to prevent runtime call to ρσ_flatten when init is simply (a, b)
                    tmp = init.to_array()
                else:
                    tmp = [init]
                init = AST_Array({
                    'start': init.start,
                    'elements': tmp,
                    'end': init.end
                })

            if is_("operator", "in"):
                if is_node_type(init, AST_Var) and init.definitions.length > 1:
                    croak(
                        "Only one variable declaration allowed in for..in loop"
                    )
                next()
                return for_in(init, list_comp)

        unexpected()

    def for_in(init, list_comp):
        lhs = init.definitions[0].name if is_node_type(init, AST_Var) else None
        obj = expression(True)
        #        expect(")")
        if list_comp:
            return {'init': init, 'name': lhs, 'object': obj}

        return AST_ForIn({
            'init': init,
            'name': lhs,
            'object': obj,
            'body': in_loop(statement)
        })

    # A native JavaScript for loop - for v"var i=0; i<5000; i++":
    def for_js():
        condition = as_atom_node()
        return AST_ForJS({'condition': condition, 'body': in_loop(statement)})

    # scan function/class body for nested class declarations
    def get_class_in_scope(expr):
        # TODO: Currently if a local variable shadows a class name defined in
        # an outerscope, the logic below will identify that variable as a
        # class. This bug was always present. Fixing it will require the parser
        # to maintain a list of local variables for every AST_Scope and provide
        # an easy way to walk the ast tree upwards.
        if is_node_type(expr, AST_SymbolRef):
            # check Native JS classes
            if has_prop(NATIVE_CLASSES, expr.name):
                return NATIVE_CLASSES[expr.name]
            if has_prop(ERROR_CLASSES, expr.name):
                return ERROR_CLASSES[expr.name]

            # traverse in reverse to check local variables first
            for s in range(S.classes.length - 1, -1, -1):
                if has_prop(S.classes[s], expr.name):
                    return S.classes[s][expr.name]

        elif is_node_type(expr, AST_Dot):
            referenced_path = []
            # this one is for detecting classes inside modules and eventually nested classes
            while is_node_type(expr, AST_Dot):
                referenced_path.unshift(expr.property)
                expr = expr.expression
            if is_node_type(expr, AST_SymbolRef):
                referenced_path.unshift(expr.name)
                # now 'referenced_path' should contain the full path of potential class
                if len(referenced_path) > 1:
                    class_name = referenced_path.join('.')
                    for s in range(S.classes.length - 1, -1, -1):
                        if has_prop(S.classes[s], class_name):
                            return S.classes[s][class_name]
        return False

    def import_error(message):
        ctx = S.input.context()
        raise ImportError(message, ctx.filename, ctx.tokline, ctx.tokcol,
                          ctx.tokpos)

    def do_import(key):
        if has_prop(imported_modules, key):
            return
        if has_prop(importing_modules, key) and importing_modules[key]:
            import_error('Detected a recursive import of: ' + key +
                         ' while importing: ' + module_id)

        # Ensure that the package containing this module is also imported
        package_module_id = key.split('.')[:-1].join('.')
        if len(package_module_id) > 0:
            do_import(package_module_id)

        if options.for_linting:
            imported_modules[key] = {
                'is_cached': True,
                'classes': {},
                'module_id': key,
                'exports': [],
                'nonlocalvars': [],
                'baselib': {},
                'outputs': {},
                'discard_asserts': options.discard_asserts
            }
            return

        def safe_read(base_path):
            # Attention: the length of this list is hardcoded in two ifs below!
            for i, path in enumerate(
                [base_path + '.py', base_path + '/__init__.py']):
                try:
                    return [readfile(path, "utf-8"), path]  # noqa:undef
                except:
                    if i is 1:
                        return None, None

        src_code = filename = None
        modpath = key.replace(r"%js /\./g", '/')

        for location in import_dirs:
            if location:
                data, filename = safe_read(location + '/' + modpath)
                if data is not None:
                    src_code = data
                    break
        if src_code is None:
            import_error(
                "Failed Import: '" + key +
                "' module doesn't exist in any of the import directories: " +
                import_dirs.join(':'))

        try:
            cached = JSON.parse(
                readfile(cache_file_name(filename, options.module_cache_dir),
                         'utf-8'))
        except:
            cached = None

        srchash = sha1sum(src_code)  # noqa:undef
        if cached and cached.version is COMPILER_VERSION and cached.signature is srchash and cached.discard_asserts is r'%js !!options.discard_asserts':
            for ikey in cached.imported_module_ids:
                do_import(
                    ikey
                )  # Ensure all modules imported by the cached module are also imported
            imported_modules[key] = {
                'is_cached': True,
                'classes': cached.classes,
                'outputs': cached.outputs,
                'module_id': key,
                'import_order': Object.keys(imported_modules).length,
                'nonlocalvars': cached.nonlocalvars,
                'baselib': cached.baselib,
                'exports': cached.exports,
                'discard_asserts': options.discard_asserts,
                'imported_module_ids': cached.imported_module_ids,
            }
        else:
            parse(
                src_code, {
                    'filename': filename,
                    'toplevel': None,
                    'basedir': options.basedir,
                    'libdir': options.libdir,
                    'import_dirs': options.import_dirs,
                    'module_id': key,
                    'imported_modules': imported_modules,
                    'importing_modules': importing_modules,
                    'discard_asserts': options.discard_asserts,
                    'module_cache_dir': options.module_cache_dir
                }
            )  # This function will add the module to imported_modules itself

        imported_modules[key].srchash = srchash

        for bitem in Object.keys(imported_modules[key].baselib):
            baselib_items[bitem] = True

    def read_python_flags():
        expect_token("keyword", "import")
        bracketed = is_('punc', '(')
        if bracketed:
            next()
        while True:
            if not is_('name'):
                croak('Name expected')
            name = S.token.value
            val = False if name.startsWith('no_') else True
            if not val:
                name = name.slice(3)
            if not PYTHON_FLAGS:
                croak('Unknown __python__ flag: ' + name)
            if name == 'exponent':
                S.scoped_flags.set('exponent', val)
                S.input.context()['exponent'] = val  # tell tokenizer
            elif name == 'ellipses':
                S.scoped_flags.set('ellipses', val)
            elif name == 'annotations':
                S.scoped_flags.set('annotations', val)
            elif name == 'numbers':
                S.scoped_flags.set('numbers', val)
            else:
                S.scoped_flags.set(name, val)
            next()
            if is_('punc', ','):
                next()
            else:
                if bracketed:
                    if is_('punc', ')'):
                        next()
                    else:
                        continue
                break
        return AST_EmptyStatement({
            'stype': 'scoped_flags',
            'start': prev(),
            'end': prev()
        })

    def mock_typing_module():
        # This enables us to fully use mypy with pylang code.
        # See test/typing_.py for an example.
        expect_token("keyword", "import")
        bracketed = is_('punc', '(')
        if bracketed:
            next()
        while True:
            if not is_('name'):
                croak('Name expected')
            name = S.token.value
            next()
            if is_('punc', ','):
                next()
            else:
                if bracketed:
                    if is_('punc', ')'):
                        next()
                    else:
                        continue
                break
        return AST_EmptyStatement({'start': prev(), 'end': prev()})

    def import_(from_import):
        ans = AST_Imports({'imports': []})
        while True:
            tok = tmp = name = last_tok = expression(False)
            key = ''
            while is_node_type(tmp, AST_Dot):
                key = "." + tmp.property + key
                tmp = last_tok = tmp.expression
            key = tmp.name + key
            if from_import and key is '__python__':
                return read_python_flags()
            if from_import and key is 'typing':
                return mock_typing_module()
            alias = None
            if not from_import and is_('keyword', 'as'):
                next()
                alias = as_symbol(AST_SymbolAlias)

            def body():
                return imported_modules[key]

            aimp = AST_Import({
                'module': name,
                'key': key,
                'alias': alias,
                'argnames': None,
                'body': body
            })
            aimp.start, aimp.end = tok.start, last_tok.end
            ans.imports.push(aimp)
            if from_import:
                break
            if is_('punc', ','):
                next()
            else:
                break

        for imp in ans['imports']:
            do_import(imp.key)
            if imported_module_ids.indexOf(imp.key) is -1:
                imported_module_ids.push(imp.key)
            classes = imported_modules[key].classes
            if from_import:
                expect_token("keyword", "import")
                imp.argnames = argnames = []
                bracketed = is_('punc', '(')
                if bracketed:
                    next()
                exports = {}
                for symdef in imported_modules[key].exports:
                    exports[symdef.name] = True
                while True:
                    aname = as_symbol(AST_ImportedVar)
                    if not options.for_linting and not has_prop(
                            exports, aname.name):
                        import_error('The symbol "' + aname.name +
                                     '" is not exported from the module: ' +
                                     key)
                    if is_('keyword', 'as'):
                        next()
                        aname.alias = as_symbol(AST_SymbolAlias)
                    argnames.push(aname)
                    if is_('punc', ','):
                        next()
                    else:
                        if bracketed:
                            if is_('punc', ')'):
                                next()
                            else:
                                continue
                        break

                # Put imported class names in the outermost scope
                for argvar in argnames:
                    obj = classes[argvar.name]
                    if obj:
                        key = argvar.alias.name if argvar.alias else argvar.name
                        S.classes[-1][key] = {
                            "static": obj.static,
                            'bound': obj.bound,
                            'classvars': obj.classvars
                        }
            else:
                for cname in Object.keys(classes):
                    obj = classes[cname]
                    key = imp.alias.name if imp.alias else imp.key
                    S.classes[-1][key + '.' + obj.name.name] = {
                        'static': obj.static,
                        'bound': obj.bound,
                        'classvars': obj.classvars
                    }

        return ans

    def class_():
        name = as_symbol(AST_SymbolDefun)
        if not name:
            unexpected()

        # detect external classes
        externaldecorator = has_simple_decorator(S.decorators, 'external')

        class_details = {
            "static": {},
            'bound': r'%js []',
            'classvars': {},
            'processing': name.name,
            'provisional_classvars': {},
        }
        bases = r'%js []'
        class_parent = None

        # read the bases of the class, if any
        if is_("punc", "("):
            S.in_parenthesized_expr = True
            next()
            while True:
                if is_('punc', ')'):
                    S.in_parenthesized_expr = False
                    next()
                    break
                a = expr_atom(False)
                if class_parent is None:
                    class_parent = a
                bases.push(a)
                if is_('punc', ','):
                    next()
                    continue

        docstrings = r'%js []'

        def decorators():
            d = []
            for decorator in S.decorators:
                d.push(AST_Decorator({'expression': decorator}))
            S.decorators = r'%js []'
            return d

        def body(loop, labels):
            # navigate to correct location in the module tree and append the class
            S.in_class.push(name.name)
            S.classes[S.classes.length - 1][name.name] = class_details
            S.classes.push({})
            S.scoped_flags.push()
            S.in_function += 1
            S.in_loop = 0
            S.labels = []
            a = block_(docstrings)
            S.in_function -= 1
            S.scoped_flags.pop()
            S.classes.pop()
            S.in_class.pop()
            S.in_loop = loop
            S.labels = labels
            return a

        definition = AST_Class({
            'name': name,
            'docstrings': docstrings,
            'module_id': module_id,
            'dynamic_properties': Object.create(None),
            'parent': class_parent,
            'bases': bases,
            'localvars': [],
            'classvars': class_details.classvars,
            'static': class_details.static,
            'external': externaldecorator,
            'bound': class_details.bound,
            'statements': [],
            'decorators': decorators(),
            'body': body(S.in_loop, S.labels)
        })
        class_details.processing = False
        # find the constructor
        for stmt in definition.body:
            if is_node_type(stmt, AST_Method):
                if stmt.is_getter or stmt.is_setter:
                    descriptor = definition.dynamic_properties[stmt.name.name]
                    if not descriptor:
                        descriptor = definition.dynamic_properties[
                            stmt.name.name] = {}
                    descriptor['getter' if stmt.is_getter else 'setter'] = stmt
                elif stmt.name.name is "__init__":
                    definition.init = stmt
        # find the class variables
        class_var_names = {}

        # Ensure that if a class variable refers to another class variable in
        # its initialization, the referenced variables' names is correctly
        # mangled.
        def walker():
            def visit_node(node, descend):
                if is_node_type(node, AST_Method):
                    class_var_names[node.name.name] = True
                    return
                if is_node_type(node, AST_Function):
                    return
                if is_node_type(node, AST_Assign) and is_node_type(
                        node.left, AST_SymbolRef):
                    varname = node.left.name
                    if FORBIDDEN_CLASS_VARS.indexOf(varname) is not -1:
                        token_error(
                            node.left.start, varname +
                            ' is not allowed as a class variable name')
                    class_var_names[varname] = True
                    definition.classvars[varname] = True
                elif is_node_type(node, AST_SymbolRef) and has_prop(
                        class_var_names, node.name):
                    node.thedef = AST_SymbolDefun(
                        {'name': name.name + '.prototype.' + node.name})
                if descend:
                    descend.call(node)

            this._visit = visit_node

        visitor = js_new(walker)

        for stmt in definition.body:
            if not is_node_type(stmt, AST_Class):
                stmt.walk(visitor)
                definition.statements.push(stmt)
        return definition

    def function_(in_class, is_expression, is_lambda):
        if is_lambda:
            if in_class or not is_expression:
                # Note: is_lambda implies is_expression and not in_class.
                croak(
                    'Compiler bug -- lambda must be an expression and not in a class'
                )
            # Lambda functions are always anonymous.
            is_anonymous = True
            name = None
        else:
            name = as_symbol(AST_SymbolDefun if in_class else AST_SymbolLambda
                             ) if is_('name') else None
            if in_class and not name:
                croak('Cannot use anonymous function as class methods')
            is_anonymous = not name

        staticmethod = property_getter = property_setter = False
        if in_class:
            staticloc = has_simple_decorator(S.decorators, 'staticmethod')
            property_getter = has_simple_decorator(S.decorators, 'property')
            property_setter = has_setter_decorator(S.decorators, name.name)
            if staticloc:
                if property_getter or property_setter:
                    croak(
                        'A method cannot be both static and a property getter/setter'
                    )
                S.classes[S.classes.length -
                          2][in_class].static[name.name] = True
                staticmethod = True
            elif name.name is not "__init__" and S.scoped_flags.get(
                    'bound_methods'):
                S.classes[S.classes.length - 2][in_class].bound.push(name.name)

        if not is_lambda:
            expect("(")
            S.in_parenthesized_expr = True
        ctor = AST_Method if in_class else AST_Function
        return_annotation = None
        is_generator = r'%js []'
        docstrings = r'%js []'

        def argnames():
            a = r'%js []'
            defaults = {}
            first = True
            seen_names = {}
            def_line = S.input.context().tokline
            current_arg_name = None
            name_token = None

            def get_arg():
                nonlocal current_arg_name, name_token
                current_arg_name = S.token.value
                if has_prop(seen_names, current_arg_name):
                    token_error(prev(), "Can't repeat parameter names")
                if current_arg_name is 'arguments':
                    token_error(
                        prev(),
                        "Can't use the name arguments as a parameter name, it is reserved by JavaScript"
                    )
                seen_names[current_arg_name] = True
                # save these in order to move back if we have an annotation
                name_token = S.token
                name_ctx = S.input.context()
                # check if we have an argument annotation
                ntok = peek()
                if ntok.type is 'punc' and ntok.value is ':' and not is_lambda:
                    next()
                    expect(':')
                    annotation = maybe_conditional()

                    # and now, do as_symbol without the next() at the end
                    # since we are already at the next comma (or end bracket)
                    if not is_token(name_token, "name"):
                        # assuming the previous context in case
                        # the annotation was over the line
                        croak("Name expected", name_ctx.tokline)
                        return None

                    sym = AST_SymbolFunarg({
                        'name': name_token.value,
                        'start': S.token,
                        'end': S.token,
                        'annotation': annotation
                    })
                    return sym
                else:
                    if not is_("name"):
                        # there is no name, which is an error we should report on the
                        # same line as the definition, so move to that is we're not already there.
                        if S.input.context().tokline is not def_line:
                            croak("Name expected", def_line)
                        else:
                            croak("Name expected")
                        return None

                    sym = AST_SymbolFunarg({
                        'name': current_arg_name,
                        'start': S.token,
                        'end': S.token,
                        'annotation': None
                    })
                    next()
                    return sym

            end_punctuation = ':' if is_lambda else ')'
            while not is_("punc", end_punctuation):
                if first:
                    first = False
                else:
                    expect(",")
                    if is_('punc', end_punctuation):
                        break
                if is_('operator', '**'):
                    # **kwargs
                    next()
                    if a.kwargs:
                        token_error(
                            name_token,
                            "Can't define multiple **kwargs in function definition"
                        )
                    a.kwargs = get_arg()
                elif is_('operator', '*'):
                    # *args
                    next()
                    if a.starargs:
                        token_error(
                            name_token,
                            "Can't define multiple *args in function definition"
                        )
                    if a.kwargs:
                        token_error(
                            name_token,
                            "Can't define *args after **kwargs in function definition"
                        )
                    a.starargs = get_arg()
                else:
                    if a.starargs or a.kwargs:
                        token_error(
                            name_token,
                            "Can't define a formal parameter after *args or **kwargs"
                        )
                    a.push(get_arg())
                    if is_("operator", "="):
                        if a.kwargs:
                            token_error(
                                name_token,
                                "Can't define an optional formal parameter after **kwargs"
                            )
                        next()
                        defaults[current_arg_name] = expression(False)
                        a.has_defaults = True
                    else:
                        if a.has_defaults:
                            token_error(
                                name_token,
                                "Can't define required formal parameters after optional formal parameters"
                            )

            next()

            # Check if we have a return type annotation.
            # Note: lambda does not allow for type annotation:
            #    https://stackoverflow.com/questions/33833881/is-it-possible-to-type-hint-a-lambda-function
            if not is_lambda and is_("punc", "->"):
                next()
                nonlocal return_annotation
                return_annotation = maybe_conditional()
            if not is_lambda:
                S.in_parenthesized_expr = False
            a.defaults = defaults
            a.is_simple_func = not a.starargs and not a.kwargs and not a.has_defaults
            return a

        def decorators():
            d = r'%js []'
            for decorator in S.decorators:
                d.push(AST_Decorator({'expression': decorator}))
            S.decorators = r'%js []'
            return d

        def body(loop, labels):
            S.in_class.push(False)
            S.classes.push({})
            S.scoped_flags.push()
            S.in_function += 1
            S.functions.push({})
            S.in_loop = 0
            S.labels = []
            if is_lambda:
                a = expression(False, True)
            else:
                a = block_(docstrings)
            S.in_function -= 1
            S.scoped_flags.pop()
            is_generator.push(bool(S.functions.pop().is_generator))
            S.classes.pop()
            S.in_class.pop()
            S.in_loop = loop
            S.labels = labels
            return a

        args = {
            'name': name,
            'is_lambda': is_lambda,
            'is_expression': is_expression,
            'is_anonymous': is_anonymous,
            'annotations':
            S.scoped_flags.get('annotations'),  # whether or not to annotate
            'argnames': argnames(),
            'localvars': [],
            'decorators': decorators(),
            'docstrings': docstrings,
            'body': body(S.in_loop, S.labels)
        }
        definition = js_new(ctor, args)
        definition.return_annotation = return_annotation
        definition.is_generator = is_generator[0]
        if is_node_type(definition, AST_Method):
            definition.static = staticmethod
            definition.is_getter = property_getter
            definition.is_setter = property_setter
            if definition.argnames.length < 1 and not definition.static:
                croak(
                    'Methods of a class must have at least one argument, traditionally named self'
                )
            if definition.name and definition.name.name is '__init__':
                if definition.is_generator:
                    croak(
                        'The __init__ method of a class cannot be a generator (yield not allowed)'
                    )
                if property_getter or property_setter:
                    croak(
                        'The __init__ method of a class cannot be a property getter/setter'
                    )
        if definition.is_generator:
            baselib_items['yield'] = True

        # detect local variables, strip function arguments
        assignments = scan_for_local_vars(definition.body)
        for i in range(assignments.length):
            for j in range(definition.argnames.length + 1):
                if j is definition.argnames.length:
                    definition.localvars.push(
                        new_symbol(AST_SymbolVar, assignments[i]))
                elif j < definition.argnames.length and assignments[
                        i] is definition.argnames[j].name:
                    break

        nonlocals = scan_for_nonlocal_defs(definition.body)
        nonlocals = {name for name in nonlocals}

        def does_not_have(v):
            return not nonlocals.has(v.name)

        definition.localvars = definition.localvars.filter(does_not_have)
        return definition

    def if_():
        cond = expression(True)
        body = statement()
        belse = None
        if is_("keyword", "elif") or is_("keyword", "else"):
            if is_("keyword", "else"):
                next()
            else:
                S.token.value = "if"
            # effectively converts 'elif' to 'else if'
            belse = statement()

        return AST_If({'condition': cond, 'body': body, 'alternative': belse})

    def is_docstring(stmt):
        if is_node_type(stmt, AST_SimpleStatement):
            if is_node_type(stmt.body, AST_String):
                return stmt.body
        return False

    def block_(docstrings):
        prev_whitespace = S.token.leading_whitespace
        expect(":")
        a = r'%js []'
        if not S.token.nlb:
            while not S.token.nlb:
                if is_("eof"):
                    unexpected()
                stmt = statement()
                if docstrings:
                    ds = is_docstring(stmt)
                    if ds:
                        docstrings.push(ds)
                        continue
                a.push(stmt)
        else:
            current_whitespace = S.token.leading_whitespace
            if current_whitespace.length is 0 or prev_whitespace is current_whitespace:
                croak('Expected an indented block')
            while not is_("punc", "}"):
                if is_("eof"):
                    # end of file, terminate block automatically
                    return a
                stmt = statement()
                if docstrings:
                    ds = is_docstring(stmt)
                    if ds:
                        docstrings.push(ds)
                        continue
                a.push(stmt)
            next()
        return a

    def try_():
        body = block_()
        bcatch = r'%js []'
        bfinally = None
        belse = None
        while is_("keyword", "except"):
            start = S.token
            next()
            exceptions = []
            if not is_("punc", ":") and not is_("keyword", "as"):
                exceptions.push(as_symbol(AST_SymbolVar))
                while is_("punc", ","):
                    next()
                    exceptions.push(as_symbol(AST_SymbolVar))

            name = None
            if is_("keyword", "as"):
                next()
                name = as_symbol(AST_SymbolCatch)

            bcatch.push(
                AST_Except({
                    'start': start,
                    'argname': name,
                    'errors': exceptions,
                    'body': block_(),
                    'end': prev()
                }))

        if is_("keyword", "else"):
            start = S.token
            next()
            belse = AST_Else({'start': start, 'body': block_(), 'end': prev()})

        if is_("keyword", "finally"):
            start = S.token
            next()
            bfinally = AST_Finally({
                'start': start,
                'body': block_(),
                'end': prev()
            })

        if not bcatch.length and not bfinally:
            croak("Missing except/finally blocks")

        return AST_Try({
            'body':
            body,
            'bcatch': (AST_Catch({'body': bcatch}) if bcatch.length else None),
            'bfinally':
            bfinally,
            'belse':
            belse
        })

    def vardefs(symbol_class):
        a = []
        while True:
            a.push(
                AST_VarDef({
                    'start':
                    S.token,
                    'name':
                    as_symbol(symbol_class),
                    'value':
                    (next(),
                     expression(False)) if is_('operator', '=') else None,
                    'end':
                    prev()
                }))
            if not is_("punc", ","):
                break
            next()

        return a

    def nonlocal_(is_global):
        defs = vardefs(AST_SymbolNonlocal)
        if is_global:
            for vardef in defs:
                S.globals.push(vardef.name.name)
        return AST_Var({'start': prev(), 'definitions': defs, 'end': prev()})

    def new_():
        start = S.token
        expect_token("operator", "new")
        newexp = expr_atom(False)

        if is_("punc", "("):
            S.in_parenthesized_expr = True
            next()
            args = func_call_list()
            S.in_parenthesized_expr = False
        else:
            args = func_call_list(True)
        return subscripts(
            AST_New({
                'start': start,
                'expression': newexp,
                'args': args,
                'end': prev()
            }), True)

    def string_():
        strings = []
        start = S.token
        while True:
            strings.push(S.token.value)
            if peek().type is not 'string':
                break
            next()
        return AST_String({
            'start': start,
            'end': S.token,
            'value': strings.join('')
        })

    def token_as_atom_node():
        tok = S.token
        tmp_ = tok.type
        if tmp_ is "name":
            return token_as_symbol(tok, AST_SymbolRef)
        elif tmp_ is "num":
            if not S.scoped_flags.get('numbers'):
                return AST_Number({
                    'start': tok,
                    'end': tok,
                    'value': tok.value
                })
            return AST_Call({
                'expression':
                AST_SymbolRef({'name': 'Number'}),
                'args':
                [AST_String({
                    'start': tok,
                    'end': tok,
                    'value': str(tok.value)
                })]
            })
        elif tmp_ is "string":
            return string_()
        elif tmp_ is "regexp":
            return AST_RegExp({'start': tok, 'end': tok, 'value': tok.value})
        elif tmp_ is "atom":
            tmp__ = tok.value
            if tmp__ is "False":
                return AST_False({'start': tok, 'end': tok})
            elif tmp__ is "True":
                return AST_True({'start': tok, 'end': tok})
            elif tmp__ is "None":
                return AST_Null({'start': tok, 'end': tok})
        elif tmp_ is "js":
            return AST_Verbatim({
                'start': tok,
                'end': tok,
                'value': tok.value,
            })
        token_error(
            tok,
            'Expecting an atomic token (number/string/bool/regexp/js/None)')

    def as_atom_node():
        ret = token_as_atom_node()
        next()
        return ret

    def expr_atom(allow_calls):
        if is_("operator", "new"):
            return new_()

        start = S.token
        if is_("punc"):
            tmp_ = start.value
            if tmp_ is "(":
                S.in_parenthesized_expr = True
                next()
                if is_('punc', ')'):
                    next()
                    # since we don't have tuples in pylang (yet?)...
                    return AST_Array({'elements': []})
                ex = expression(True)
                if is_('keyword', 'for'):
                    ret = read_comprehension(
                        AST_GeneratorComprehension({'statement': ex}), ')')
                    S.in_parenthesized_expr = False
                    return ret
                ex.start = start
                ex.end = S.token
                if is_node_type(ex, AST_SymbolRef):
                    ex.parens = True
                if not is_node_type(ex, AST_GeneratorComprehension):
                    expect(")")
                if is_node_type(ex, AST_UnaryPrefix):
                    ex.parenthesized = True
                S.in_parenthesized_expr = False
                return subscripts(ex, allow_calls)
            elif tmp_ is "[":
                return subscripts(array_(), allow_calls)
            elif tmp_ is "{":
                return subscripts(object_(), allow_calls)

            unexpected()

        if is_("keyword", "class"):
            next()
            cls = class_()
            cls.start = start
            cls.end = prev()
            return subscripts(cls, allow_calls)

        if is_("keyword", "def"):
            next()
            func = function_(False, True, False)
            func.start = start
            func.end = prev()
            return subscripts(func, allow_calls)

        if is_("keyword", "lambda"):
            next()
            func = function_(False, True, True)
            func.start = start
            func.end = prev()
            return subscripts(func, allow_calls)

        if is_('keyword', 'yield'):
            next()
            return yield_()

        if ATOMIC_START_TOKEN[S.token.type]:
            return subscripts(as_atom_node(), allow_calls)

        unexpected()

    def expr_list(closing, allow_trailing_comma, allow_empty, func_call):
        first = True
        a = []
        saw_starargs = False
        while not is_("punc", closing):
            if saw_starargs:
                token_error(
                    prev(),
                    "*args must be the last argument in a function call")

            if first:
                first = False
            else:
                expect(",")
            if allow_trailing_comma and is_("punc", closing):
                break

            if is_("operator", "*") and func_call:
                saw_starargs = True
                next()

            if is_("punc", ",") and allow_empty:
                a.push(AST_Hole({'start': S.token, 'end': S.token}))
            else:
                a.push(expression(False))

        if func_call:
            tmp = []
            tmp.kwargs = []
            for arg in a:
                if is_node_type(arg, AST_Assign):
                    tmp.kwargs.push([arg.left, arg.right])
                else:
                    tmp.push(arg)
            a = tmp

        next()
        if saw_starargs:
            a.starargs = True
        return a

    def func_call_list(empty):
        a = r'%js []'
        first = True
        a.kwargs = r'%js []'
        a.kwarg_items = r'%js []'
        a.starargs = False
        if empty:
            return a
        single_comprehension = False
        while not is_("punc", ')') and not is_('eof'):
            if not first:
                expect(",")
                if is_('punc', ')'):
                    break
            if is_('operator', '*'):
                next()
                arg = expression(False)
                arg.is_array = True
                a.push(arg)
                a.starargs = True
            elif is_('operator', '**'):
                next()
                a.kwarg_items.push(as_symbol(AST_SymbolRef, False))
                a.starargs = True
            else:
                arg = expression(False)
                if is_node_type(arg, AST_Assign):
                    a.kwargs.push([arg.left, arg.right])
                else:
                    if is_('keyword', 'for'):
                        if not first:
                            croak(
                                'Generator expression must be parenthesized if not sole argument'
                            )
                        a.push(
                            read_comprehension(
                                AST_GeneratorComprehension({'statement': arg}),
                                ')'))
                        single_comprehension = True
                        break
                    a.push(arg)
            first = False
        if not single_comprehension:
            next()
        return a

    @embed_tokens
    def array_():
        expect("[")
        expr = []
        if not is_("punc", "]"):
            expr.push(expression(False))
            if is_("punc", ".."):
                if not S.scoped_flags.get('ellipses'):
                    croak(
                        "Use 'from __python__ import ellipses' to support the [a..b] syntax"
                    )
                # ellipses range
                return read_ellipses_range(
                    AST_EllipsesRange({'first': expr[0]}), ']')

            if is_("keyword", "for"):
                # list comprehension
                return read_comprehension(
                    AST_ListComprehension({'statement': expr[0]}), ']')

            if not is_("punc", "]"):
                expect(",")

        return AST_Array({'elements': expr.concat(expr_list("]", True, True))})

    @embed_tokens
    def object_():
        expect("{")
        first = True
        has_non_const_keys = False
        is_pydict = S.scoped_flags.get('dict_literals', False)
        is_jshash = S.scoped_flags.get('hash_literals', False)
        a = []
        while not is_("punc", "}"):
            if not first:
                expect(",")
            if is_("punc", "}"):
                # allow trailing comma
                break
            first = False

            start = S.token
            ctx = S.input.context()
            orig = ctx.expecting_object_literal_key
            ctx.expecting_object_literal_key = True
            try:
                left = expression(False)
            finally:
                ctx.expecting_object_literal_key = orig
            if is_('keyword', 'for'):
                # is_pydict is irrelevant here
                return read_comprehension(
                    AST_SetComprehension({'statement': left}), '}')
            if a.length is 0 and (is_('punc', ',') or is_('punc', '}')):
                end = prev()
                return set_(start, end, left)
            if not is_node_type(left, AST_Constant):
                has_non_const_keys = True
            expect(":")
            a.push(
                AST_ObjectKeyVal({
                    'start': start,
                    'key': left,
                    'value': expression(False),
                    'end': prev()
                }))
            if a.length is 1 and is_('keyword', 'for'):
                return dict_comprehension(a, is_pydict, is_jshash)

        next()
        args = {
            'properties': a,
            'is_pydict': is_pydict,
            'is_jshash': is_jshash,
        }
        if has_non_const_keys:
            return AST_ExpressiveObject(args)
        else:
            return AST_Object(args)

    def set_(start, end, expr):
        ostart = start
        a = [AST_SetItem({'start': start, 'end': end, 'value': expr})]
        while not is_("punc", "}"):
            expect(",")
            start = S.token
            if is_("punc", "}"):
                # allow trailing comma
                break
            a.push(
                AST_SetItem({
                    'start': start,
                    'value': expression(False),
                    'end': prev()
                }))
        next()
        return AST_Set({'items': a, 'start': ostart, 'end': prev()})

    def read_ellipses_range(obj, terminator):
        next()
        obj['last'] = expression(False)
        expect("]")
        return obj

    def read_comprehension(obj, terminator):
        if is_node_type(obj, AST_GeneratorComprehension):
            baselib_items['yield'] = True
        S.in_comprehension = True
        S.in_parenthesized_expr = False  # in case we are already in a parenthesized expression
        expect_token('keyword', 'for')
        forloop = for_(True)
        obj.init = forloop.init
        obj.name = forloop.name
        obj.object = forloop.object
        obj.condition = None if is_('punc', terminator) else (expect_token(
            "keyword", "if"), expression(True))
        expect(terminator)
        S.in_comprehension = False
        return obj

    def dict_comprehension(a, is_pydict, is_jshash):
        if a.length:
            left, right = a[0].key, a[0].value
        else:
            left = expression(False)
            if not is_('punc', ':'):
                return read_comprehension(
                    AST_SetComprehension({'statement': left}), '}')
            expect(':')
            right = expression(False)
        return read_comprehension(
            AST_DictComprehension({
                'statement': left,
                'value_statement': right,
                'is_pydict': is_pydict,
                'is_jshash': is_jshash
            }), '}')

    def as_name():
        tmp = S.token
        next()
        tmp_ = tmp.type
        if tmp_ is "name" or tmp_ is "operator" or tmp_ is "keyword" or tmp_ is "atom":
            return tmp.value
        else:
            unexpected()

    def token_as_symbol(tok, ttype):
        name = tok.value
        if RESERVED_WORDS[name] and name is not 'this':
            croak(name + ' is a reserved word')
        args = {'name': r"%js String(tok.value)", 'start': tok, 'end': tok}
        if name is 'this':
            return AST_This(args)
        else:
            return js_new(ttype, args)

    def as_symbol(ttype, noerror):
        if not is_("name"):
            if not noerror:
                croak("Name expected")
            return None

        sym = token_as_symbol(S.token, ttype)
        next()
        return sym

    # for generating/inserting a symbol
    def new_symbol(type, name):
        args = {'name': r"%js String(name)", 'start': None, 'end': None}
        if name is 'this':
            return AST_This(args)
        else:
            return js_new(type, args)

    def is_static_method(cls, method):
        if has_prop(COMMON_STATIC,
                    method) or (cls.static and has_prop(cls.static, method)):
            return True
        else:
            return False

    def getitem(expr, allow_calls):
        start = expr.start
        next()
        is_py_sub = S.scoped_flags.get('overload_getitem', False)
        slice_bounds = r'%js []'
        is_slice = False
        if is_("punc", ":"):
            # slice [:n]
            slice_bounds.push(None)
        else:
            slice_bounds.push(expression(False))

        if is_("punc", ":"):
            # slice [n:m?]
            is_slice = True
            next()
            if is_("punc", ":"):
                slice_bounds.push(None)
            elif not is_("punc", "]"):
                slice_bounds.push(expression(False))

        if is_("punc", ":"):
            # slice [n:m:o?]
            next()
            if is_("punc", "]"):
                unexpected()
            else:
                slice_bounds.push(expression(False))

        # multi-index notation, e.g., [n,m,r]
        # I added parsing it so that mypy can be used.
        while is_("punc", ","):
            next()
            slice_bounds.push(expression(False))

        expect("]")

        if is_slice:
            if is_("operator", '='):
                # splice-assignment (arr[start:end] = ...)
                next()  # swallow the assignment
                return subscripts(
                    AST_Splice({
                        'start':
                        start,
                        'expression':
                        expr,
                        'property':
                        slice_bounds[0] or AST_Number({'value': 0}),
                        'property2':
                        slice_bounds[1],
                        'assignment':
                        expression(True),
                        'end':
                        prev()
                    }), allow_calls)
            elif slice_bounds.length is 3:
                # extended slice (arr[start:end:step])
                slice_bounds.unshift(slice_bounds.pop())
                if not slice_bounds[-1]:
                    slice_bounds.pop()
                    if not slice_bounds[-1]:
                        slice_bounds.pop()
                elif not slice_bounds[-2]:
                    slice_bounds[-2] = AST_Undefined()
                return subscripts(
                    AST_Call({
                        'start':
                        start,
                        'expression':
                        AST_SymbolRef({
                            'name':
                            'ρσ_delslice' if S.in_delete else "ρσ_eslice"
                        }),
                        'args': [expr].concat(slice_bounds),
                        'end':
                        prev()
                    }), allow_calls)
            else:
                # regular slice (arr[start:end])
                slice_bounds = [
                    AST_Number({'value': 0}) if i is None else i
                    for i in slice_bounds
                ]
                if S.in_delete:
                    return subscripts(
                        AST_Call({
                            'start':
                            start,
                            'expression':
                            AST_SymbolRef({'name': 'ρσ_delslice'}),
                            'args': [expr,
                                     AST_Number({'value':
                                                 1})].concat(slice_bounds),
                            'end':
                            prev()
                        }), allow_calls)

                return subscripts(
                    AST_Call({
                        'start':
                        start,
                        'expression':
                        AST_Dot({
                            'start': start,
                            'expression': expr,
                            'property': "slice",
                            'end': prev()
                        }),
                        'args':
                        slice_bounds,
                        'end':
                        prev()
                    }), allow_calls)
        else:
            # regular index (arr[index])
            if len(slice_bounds) == 1:
                prop = slice_bounds[0] or AST_Number({'value': 0})
            else:
                # arr[index1,index2]
                prop = AST_Array({'elements': slice_bounds})
            if is_py_sub:
                assignment = None
                if is_("operator") and S.token.value is "=":
                    next()
                    assignment = expression(True)
                return subscripts(
                    AST_ItemAccess({
                        'start': start,
                        'expression': expr,
                        'property': prop,
                        'assignment': assignment,
                        'end': prev()
                    }), allow_calls)

            return subscripts(
                AST_Sub({
                    'start': start,
                    'expression': expr,
                    'property': prop,
                    'end': prev()
                }), allow_calls)

    def call_(expr):
        start = expr.start
        S.in_parenthesized_expr = True
        next()
        if not expr.parens and get_class_in_scope(expr):
            # this is an object being created using a class
            ret = subscripts(
                AST_New({
                    'start': start,
                    'expression': expr,
                    'args': func_call_list(),
                    'end': prev()
                }), True)
            S.in_parenthesized_expr = False
            return ret
        else:
            if is_node_type(expr, AST_Dot):
                c = get_class_in_scope(expr.expression)

            if c:
                # generate class call
                funcname = expr

                ret = subscripts(
                    AST_ClassCall({
                        'start':
                        start,
                        "class":
                        expr.expression,
                        'method':
                        funcname.property,
                        "static":
                        is_static_method(c, funcname.property),
                        'args':
                        func_call_list(),
                        'end':
                        prev()
                    }), True)
                S.in_parenthesized_expr = False
                return ret
            elif is_node_type(expr, AST_SymbolRef):
                tmp_ = expr.name
                if tmp_ is "jstype":
                    ret = AST_UnaryPrefix({
                        'start': start,
                        'operator': "typeof",
                        'expression': func_call_list()[0],
                        'end': prev()
                    })
                    S.in_parenthesized_expr = False
                    return ret
                elif tmp_ is "isinstance":
                    args = func_call_list()
                    if args.length is not 2:
                        croak(
                            'isinstance() must be called with exactly two arguments'
                        )
                    ret = AST_Binary({
                        'start': start,
                        'left': args[0],
                        'operator': 'instanceof',
                        'right': args[1],
                        'end': prev()
                    })
                    S.in_parenthesized_expr = False
                    return ret

            # fall-through to basic function call
            ret = subscripts(
                AST_Call({
                    'start': start,
                    'expression': expr,
                    'args': func_call_list(),
                    'end': prev()
                }), True)
            S.in_parenthesized_expr = False
            return ret

    def get_attr(expr, allow_calls):
        next()
        prop = as_name()
        c = get_class_in_scope(expr)
        if c:
            classvars = c.provisional_classvars if c.processing else c.classvars
            if classvars and r'%js classvars[prop]':
                prop = 'prototype.' + prop

        return subscripts(
            AST_Dot({
                'start': expr.start,
                'expression': expr,
                'property': prop,
                'end': prev()
            }), allow_calls)

    def existential(expr, allow_calls):
        ans = AST_Existential({
            'start': expr.start,
            'end': S.token,
            'expression': expr
        })
        next()
        ttype = S.token.type
        val = S.token.value
        if S.token.nlb or ttype is 'keyword' or ttype is 'operator' or ttype is 'eof':
            ans.after = None
            return ans
        if ttype is 'punc':
            if val is '.':
                ans.after = '.'
            elif val is '[':
                is_py_sub = S.scoped_flags.get('overload_getitem', False)
                ans.after = 'g' if is_py_sub else '['
            elif val is '(':
                if not allow_calls:
                    unexpected()
                ans.after = '('
            else:
                ans.after = None
                return ans
            return subscripts(ans, allow_calls)

        ans.after = expression()
        return ans

    def subscripts(expr, allow_calls):
        if is_("punc", "."):
            return get_attr(expr, allow_calls)

        if is_("punc", "[") and not S.token.nlb:
            return getitem(expr, allow_calls)

        if allow_calls and is_("punc", "(") and not S.token.nlb:
            return call_(expr)

        if is_('punc', '?'):
            return existential(expr, allow_calls)

        return expr

    def maybe_unary(allow_calls):
        start = S.token
        if is_('operator', '@'):
            if S.parsing_decorator:
                croak('Nested decorators are not allowed')
            next()
            S.parsing_decorator = True
            expr = expression()
            S.parsing_decorator = False
            S.decorators.push(expr)
            return AST_EmptyStatement({
                'stype': '@',
                'start': prev(),
                'end': prev()
            })
        if is_("operator") and UNARY_PREFIX[start.value]:
            next()
            is_parenthesized = is_('punc', '(')
            S.in_delete = start.value is 'delete'
            expr = maybe_unary(allow_calls)
            S.in_delete = False
            ex = make_unary(AST_UnaryPrefix, start.value, expr,
                            is_parenthesized)
            ex.start = start
            ex.end = prev()
            return ex

        val = expr_atom(allow_calls)
        return val

    def make_unary(ctor, op, expr, is_parenthesized):
        return js_new(ctor, {
            'operator': op,
            'expression': expr,
            'parenthesized': is_parenthesized
        })

    def expr_op(left, min_prec, no_in):
        op = S.token.value if is_('operator') else None
        if op is "!" and peek().type is "operator" and peek().value is "in":
            next()
            S.token.value = op = 'nin'

        if no_in and (op is "in" or op is 'nin'):
            op = None

        prec = PRECEDENCE[op] if op is not None else None
        if prec is not None and prec > min_prec:
            next()
            right = expr_op(maybe_unary(True), prec, no_in)
            ret = AST_Binary({
                'start': left.start,
                'left': left,
                'operator': op,
                'right': right,
                'end': right.end
            })
            return expr_op(ret, min_prec, no_in)
        return left

    def expr_ops(no_in):
        return expr_op(maybe_unary(True), 0, no_in)

    def maybe_conditional(no_in):
        start = S.token
        expr = expr_ops(no_in)
        if (is_('keyword', 'if')
                and (S.in_parenthesized_expr or
                     (S.statement_starting_token is not S.token
                      and not S.in_comprehension and not S.token.nlb))):
            next()
            ne = expression(False)
            expect_token('keyword', 'else')
            conditional = AST_Conditional({
                'start':
                start,
                'condition':
                ne,
                'consequent':
                expr,
                'alternative':
                expression(False, no_in),
                'end':
                peek()
            })
            return conditional
        return expr

    def create_assign(data):
        if data.right and is_node_type(data.right, AST_Seq) and (is_node_type(
                data.right.car, AST_Assign) or is_node_type(
                    data.right.cdr, AST_Assign)) and data.operator is not '=':
            token_error(
                data.start,
                'Invalid assignment operator for chained assignment: ' +
                data.operator)
        ans = AST_Assign(data)
        if S.in_class.length and S.in_class[-1]:
            class_name = S.in_class[-1]
            if is_node_type(ans.left, AST_SymbolRef) and S.classes.length > 1:
                c = S.classes[-2][class_name]
                if c:
                    if ans.is_chained():
                        for lhs in ans.traverse_chain()[0]:
                            c.provisional_classvars[lhs.name] = True
                    else:
                        c.provisional_classvars[ans.left.name] = True
        return ans

    def maybe_assign(no_in, only_plain_assignment):
        start = S.token
        left = maybe_conditional(no_in)
        val = S.token.value
        if is_("operator") and ASSIGNMENT[val]:
            if only_plain_assignment and val is not '=':
                croak('Invalid assignment operator for chained assignment: ' +
                      val)
            next()
            return create_assign({
                'start': start,
                'left': left,
                'operator': val,
                'right': maybe_assign(no_in, True),
                'end': prev()
            })
        return left

    def expression(commas, no_in):
        # if there is an assignment, we want the sequences to pivot
        # around it to allow for tuple packing/unpacking
        start = S.token
        expr = maybe_assign(no_in)

        def build_seq(a):
            if a.length is 1:
                return a[0]

            return AST_Seq({
                'start': start,
                'car': a.shift(),
                'cdr': build_seq(a),
                'end': peek()
            })

        if commas:
            left = r'%js [ expr ]'
            while is_("punc", ","):
                next()
                if is_node_type(expr, AST_Assign):
                    left[-1] = left[-1].left
                    return create_assign({
                        'start':
                        start,
                        'left': (left[0] if left.length is 1 else AST_Array(
                            {'elements': left})),
                        'operator':
                        expr.operator,
                        'right':
                        AST_Seq({
                            'car': expr.right,
                            'cdr': expression(True, no_in)
                        }),
                        'end':
                        peek()
                    })

                expr = maybe_assign(no_in)
                left.push(expr)

            # if last one was an assignment, fix it
            if left.length > 1 and is_node_type(left[-1], AST_Assign):
                left[-1] = left[-1].left
                return create_assign({
                    'start': start,
                    'left': AST_Array({'elements': left}),
                    'operator': expr.operator,
                    'right': expr.right,
                    'end': peek()
                })

            return build_seq(left)
        return expr

    def in_loop(cont):
        S.in_loop += 1
        ret = cont()
        S.in_loop -= 1
        return ret

    def run_parser():
        start = S.token = next()
        body = r'%js []'
        docstrings = r'%js []'
        first_token = True
        toplevel = options.toplevel
        while not is_("eof"):
            element = statement()
            if first_token and is_node_type(
                    element,
                    AST_Directive) and element.value.indexOf('#!') is 0:
                shebang = element.value
            else:
                ds = not toplevel and is_docstring(
                    element
                )  # do not process strings as docstrings if we are concatenating toplevels
                if ds:
                    docstrings.push(ds)
                else:
                    body.push(element)
            first_token = False

        end = prev()
        if toplevel:
            toplevel.body = toplevel.body.concat(body)
            toplevel.end = end
            toplevel.docstrings
        else:
            toplevel = AST_Toplevel({
                'start': start,
                'body': body,
                'shebang': shebang,
                'end': end,
                'docstrings': docstrings,
            })

        toplevel.nonlocalvars = scan_for_nonlocal_defs(toplevel.body).concat(
            S.globals)
        toplevel.localvars = []
        toplevel.exports = []
        seen_exports = {}

        def add_item(item, isvar):
            if (toplevel.nonlocalvars.indexOf(item) < 0):
                symbol = new_symbol(AST_SymbolVar, item)
                if isvar:
                    toplevel.localvars.push(symbol)
                if not has_prop(seen_exports, item):
                    toplevel.exports.push(symbol)
                    seen_exports[item] = True

        for item in scan_for_local_vars(toplevel.body):
            add_item(item, True)
        for item in scan_for_top_level_callables(toplevel.body):
            add_item(item, False)

        toplevel.filename = options.filename
        toplevel.imported_module_ids = imported_module_ids
        toplevel.classes = scan_for_classes(toplevel.body)
        toplevel.import_order = Object.keys(imported_modules).length
        toplevel.module_id = module_id
        imported_modules[module_id] = toplevel
        toplevel.imports = imported_modules
        toplevel.baselib = baselib_items
        toplevel.scoped_flags = S.scoped_flags.stack[0]
        importing_modules[module_id] = False
        toplevel.comments_after = S.token.comments_before or r'%js []'
        return toplevel

    return run_parser


def parse(text, options):
    options = defaults(
        options,
        {
            'filename': None,  # name of the file being parsed
            'module_id': '__main__',  # The id of the module being parsed
            'toplevel': None,
            'for_linting':
            False,  # If True certain actions are not performed, such as importing modules
            'import_dirs': r'%js []',
            'classes':
            undefined,  # Map of class names to AST_Class that are available in the global namespace (used by the REPL)
            'scoped_flags': {},  # Global scoped flags (used by the REPL)
            'discard_asserts': False,
            'module_cache_dir': '',
            'jsage':
            False,  # if true, do some of what the Sage preparser does, e.g., ^ --> **.
            'tokens': False,  # if true, show every token as it is parsed
        })
    import_dirs = [x for x in options.import_dirs]
    for location in r'%js [options.libdir, options.basedir]':
        if location:
            import_dirs.push(location)
    module_id = options.module_id
    baselib_items = {}
    imported_module_ids = []
    imported_modules = options.imported_modules or {}
    importing_modules = options.importing_modules or {}
    importing_modules[module_id] = True

    def push():
        this.stack.push(Object.create(None))

    def pop():
        this.stack.pop()

    def get(name, defval):
        for i in range(this.stack.length - 1, -1, -1):
            d = this.stack[i]
            q = d[name]
            if q:
                return q
        return defval

    def set(name, val):
        this.stack[-1][name] = val

    # The internal state of the parser
    S = {
        'input':
        tokenizer(text, options.filename) \
        if jstype(text) is 'string' else text,
        'token':
        None,
        'prev':
        None,
        'peeked': [],
        'in_function':
        0,
        'statement_starting_token':
        None,
        'in_comprehension':
        False,
        'in_parenthesized_expr':
        False,
        'in_delete':
        False,
        'in_loop':
        0,
        'in_class': [False],
        'classes': [{}],
        'functions': [{}],
        'labels': [],
        'decorators':
        r'%js []',
        'parsing_decorator':
        False,
        'globals':
        r'%js []',
        'scoped_flags': {
            'stack': r'%js [options.scoped_flags || Object.create(null)]',
            'push': push,
            'pop': pop,
            'get': get,
            'set': set
        },
    }

    if options.jsage:
        # Set all the jsage compiler options; this is only used in the repl.
        for name in ['exponent', 'ellipses', 'numbers']:
            S.scoped_flags.set(name, True)

    if S.scoped_flags.get('exponent'):
        # Since exponent parsing partly happens at the
        # tokenizer, we have to tell it.
        S.input.context()['exponent'] = True

    if options.classes:
        for cname in options.classes:
            obj = options.classes[cname]
            S.classes[0][cname] = {
                'static': obj.static,
                'bound': obj.bound,
                'classvars': obj.classvars
            }

    return create_parser_ctx(S, import_dirs, module_id, baselib_items,
                             imported_module_ids, imported_modules,
                             importing_modules, options)()
