# vim:fileencoding=utf-8
# License: BSD
# Copyright: 2015, Kovid Goyal <kovid at kovidgoyal.net>
# globals: console

from utils import DefaultsError, string_template
from errors import ImportError, SyntaxError
from tokenizer import ALL_KEYWORDS, IDENTIFIER_PAT, tokenizer
from parse import parse, NATIVE_CLASSES, compile_time_decorators
from output.stream import OutputStream
from output.codegen import generate_code

generate_code()  # create the print methods on the AST nodes

# The following allows this module to be used from a pure javascript, require()
# based environment like Node.js
if jstype(exports) is 'object':
    exports.DefaultsError = DefaultsError
    exports.parse = parse
    exports.compile_time_decorators = compile_time_decorators
    exports.OutputStream = OutputStream
    exports.string_template = string_template  # noqa:undef
    # Needed for REPL and linter
    exports.ALL_KEYWORDS = ALL_KEYWORDS
    exports.IDENTIFIER_PAT = IDENTIFIER_PAT
    exports.NATIVE_CLASSES = NATIVE_CLASSES
    exports.ImportError = ImportError
    exports.SyntaxError = SyntaxError
    exports.tokenizer = tokenizer
    # Magic! Export all the AST_* nodes
    ast = ρσ_modules['ast']
    for ast_node in ast:
        if ast_node.substr(0, 4) is 'AST_':
            exports[ast_node] = ast[ast_node]  # noqa:undef
