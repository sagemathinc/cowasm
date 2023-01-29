# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
# globals: writefile
from __python__ import hash_literals

from output.statements import declare_vars, display_body
from output.stream import OutputStream
from output.utils import create_doctring
from output.comments import print_comments, output_comments
from output.functions import set_module_name
from parse import get_compiler_version
from utils import cache_file_name


def write_imports(module, output):
    imports = []
    for import_id in Object.keys(module.imports):
        imports.push(module.imports[import_id])

    def compare(a, b):
        a, b = a.import_order, b.import_order
        return -1 if a < b else (1 if a > b else 0)

    imports.sort(compare)
    if imports.length > 1:
        output.indent()
        output.print('var ρσ_modules = {};')
        output.newline()

    # Declare all variable names exported from the modules as global symbols
    nonlocalvars = {}
    for module_ in imports:
        for name in module_.nonlocalvars:
            nonlocalvars[name] = True
    nonlocalvars = Object.getOwnPropertyNames(nonlocalvars).join(', ')
    if nonlocalvars.length:
        output.indent()
        output.print('var ' + nonlocalvars)
        output.semicolon()
        output.newline()

    # Create the module objects
    for module_ in imports:
        module_id = module_.module_id
        if module_id is not '__main__':
            output.indent()
            if module_id.indexOf('.') is -1:
                output.print('ρσ_modules.' + module_id)
            else:
                output.print('ρσ_modules["' + module_id + '"]')
            output.space(), output.print('='), output.space(), output.print(
                '{}')
            output.end_statement()

    # Output module code
    for module_ in imports:
        if module_.module_id is not '__main__':
            print_module(module_, output)


def write_main_name(output):
    if output.options.write_name:
        output.newline()
        output.indent()
        output.print('var __name__ = "__main__"')
        output.semicolon()
        output.newline()
        output.newline()


def declare_exports(module_id, exports, output, docstrings):
    seen = {}
    if output.options.keep_docstrings and docstrings and docstrings.length:
        exports.push({'name': '__doc__', 'refname': 'ρσ_module_doc__'})
        output.newline(), output.indent()
        v = 'var'
        output.assign(v + ' ρσ_module_doc__'), output.print(
            JSON.stringify(create_doctring(docstrings)))
        output.end_statement()
    output.newline()
    for symbol in exports:
        if not Object.prototype.hasOwnProperty.call(seen, symbol.name):
            output.indent()
            if module_id.indexOf('.') is -1:
                output.print('ρσ_modules.' + module_id + '.' + symbol.name)
            else:
                output.print('ρσ_modules["' + module_id + '"].' + symbol.name)
            output.space(), output.print('='), output.space(), output.print(
                symbol.refname or symbol.name)
            seen[symbol.name] = True
            output.end_statement()


def prologue(module, output):
    # any code that should appear before the main body
    if output.options.omit_baselib:
        return
    output.indent()
    v = 'var'
    output.print(v), output.space()
    output.spaced.apply(output, ((
        'ρσ_iterator_symbol = (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") ? Symbol.iterator : "iterator-Symbol-5d0927e5554349048cf0e3762a228256"'
        .split(' '))))
    output.end_statement()
    output.indent(), output.print(v), output.space()
    output.spaced.apply(output, ((
        'ρσ_kwargs_symbol = (typeof Symbol === "function") ? Symbol("kwargs-object") : "kwargs-object-Symbol-5d0927e5554349048cf0e3762a228256"'
        .split(' '))))
    output.end_statement()
    output.indent(), output.spaced(
        'var', 'ρσ_cond_temp,', 'ρσ_expr_temp,',
        'ρσ_last_exception'), output.end_statement()
    output.indent(), output.spaced('var', 'ρσ_object_counter', '=',
                                   '0'), output.end_statement()
    # Needed for Chrome < 51 and Edge as of August 2016
    output.indent(), output.spaced(
        'if(', 'typeof', 'HTMLCollection', '!==', '"undefined"', '&&',
        'typeof', 'Symbol', '===', '"function")',
        'NodeList.prototype[Symbol.iterator]', '=',
        'HTMLCollection.prototype[Symbol.iterator]', '=',
        'NamedNodeMap.prototype[Symbol.iterator]', '=',
        'Array.prototype[Symbol.iterator]')
    output.end_statement()
    # output the baselib
    if not output.options.baselib_plain:
        raise ValueError(
            'The baselib is missing! Remember to set the baselib_plain field on the options for OutputStream'
        )
    output.print(output.options.baselib_plain)
    output.end_statement()


def print_top_level(self, output):
    set_module_name(self.module_id)
    is_main = self.module_id is '__main__'

    def write_docstrings():
        if is_main and output.options.keep_docstrings and self.docstrings and self.docstrings.length:
            output.newline(), output.indent()
            v = 'var'
            output.assign(v + ' ρσ_module_doc__'), output.print(
                JSON.stringify(create_doctring(self.docstrings)))
            output.end_statement()

    if output.options.private_scope and is_main:

        def f_main_function():
            output.print("function()")

            def f_full_function():
                # strict mode is more verbose about errors, and less forgiving about them
                # kind of like Python
                output.indent()
                output.print('"use strict"')
                output.end_statement()

                prologue(self, output)
                write_imports(self, output)
                output.newline()
                output.indent()

                def f_function():
                    output.print("function()")

                    def f_body():
                        write_main_name(output)
                        output.newline()
                        declare_vars(self.localvars, output)
                        display_body(self.body, True, output)
                        output.newline()
                        write_docstrings()
                        if self.comments_after and self.comments_after.length:
                            output.indent()
                            output_comments(self.comments_after, output)
                            output.newline()

                    output.with_block(f_body)

                output.with_parens(f_function)

                output.print("();")
                output.newline()

            output.with_block(f_full_function)

        output.with_parens(f_main_function)
        output.print("();")
        output.print("")
    else:
        if is_main:
            prologue(self, output)
            write_imports(self, output)
            write_main_name(output)

        declare_vars(self.localvars, output)
        display_body(self.body, True, output)
        if self.comments_after and self.comments_after.length:
            output_comments(self.comments_after, output)
    set_module_name()


def print_module(self, output):
    set_module_name(self.module_id)

    def output_module(output):
        declare_vars(self.localvars, output)
        display_body(self.body, True, output)
        declare_exports(self.module_id, self.exports, output, self.docstrings)

    output.newline()
    output.indent()

    def f_print_module():
        output.print("function()")

        def dump_the_logic_of_this_module():
            print_comments(self, output)
            if output.options.write_name:
                output.indent()
                output.print('var ')
                output.assign('__name__')
                output.print('"' + self.module_id + '"')
                output.semicolon()
                output.newline()

            def output_key(beautify, keep_docstrings):
                return 'beautify:' + beautify + ' keep_docstrings:' + keep_docstrings

            okey = output_key(output.options.beautify,
                              output.options.keep_docstrings)
            if self.is_cached and okey in self.outputs:
                output.print(self.outputs[okey])
            else:
                output_module(output)
                if self.srchash and self.filename:
                    cached = {
                        'version': get_compiler_version(),
                        'signature': self.srchash,
                        'classes': {},
                        'baselib': self.baselib,
                        'nonlocalvars': self.nonlocalvars,
                        'imported_module_ids': self.imported_module_ids,
                        'exports': [],
                        'outputs': {},
                        'discard_asserts': bool(output.options.discard_asserts)
                    }
                    for cname in Object.keys(self.classes):
                        cobj = self.classes[cname]
                        cached.classes[cname] = {
                            'name': {
                                'name': cobj.name.name
                            },
                            'static': cobj.static,
                            'bound': cobj.bound,
                            'classvars': cobj.classvars
                        }
                    for symdef in self.exports:
                        cached.exports.push({'name': symdef.name})
                    for beautify in [True, False]:
                        for keep_docstrings in [True, False]:
                            co = OutputStream({
                                'beautify':
                                beautify,
                                'keep_docstrings':
                                keep_docstrings,
                                'write_name':
                                False,
                                'discard_asserts':
                                output.options.discard_asserts
                            })
                            co.with_indent(output.indentation(),
                                           lambda: output_module(co))
                            raw = co.get()
                            cached.outputs[output_key(beautify,
                                                      keep_docstrings)] = raw
                    cached_name = cache_file_name(
                        self.filename, output.options.module_cache_dir)
                    try:
                        if cached_name:
                            writefile(cached_name,
                                      JSON.stringify(cached, None, '\t'))
                    except Error as e:
                        console.error('Failed to write output cache file:',
                                      cached_name, 'with error:', e)

        output.with_block(dump_the_logic_of_this_module)

    output.with_parens(f_print_module)
    output.print("()")
    output.semicolon()
    output.newline()
    set_module_name()


def print_imports(container, output):
    is_first_aname = True

    def add_aname(aname, key, from_import):
        nonlocal is_first_aname
        if is_first_aname:
            is_first_aname = False
        else:
            output.indent()
        output.print('var ')
        output.assign(aname)
        if key.indexOf('.') is -1:
            output.print('ρσ_modules.'), output.print(key)
        else:
            output.print('ρσ_modules["'), output.print(key), output.print('"]')
        if from_import:
            output.print('.')
            output.print(from_import)
        output.end_statement()

    for self in container.imports:
        if self.argnames:
            # A from import
            for argname in self.argnames:
                akey = argname.alias.name if argname.alias else argname.name
                add_aname(akey, self.key, argname.name)
        else:
            if self.alias:
                add_aname(self.alias.name, self.key, False)
            else:
                parts = self.key.split('.')
                for i, part in enumerate(parts):
                    if i is 0:
                        add_aname(part, part, False)
                    else:
                        q = parts[:i + 1].join('.')
                        output.indent()
                        output.spaced(q, '=', 'ρσ_modules["' + q + '"]')
                        output.end_statement()
