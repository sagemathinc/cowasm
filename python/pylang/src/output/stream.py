# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
from __python__ import hash_literals

from utils import make_predicate, defaults, repeat_string
from tokenizer import is_identifier_char

DANGEROUS = RegExp(
    r"[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]",
    "g")


def as_hex(code, sz):
    val = code.toString(16)
    if val.length < sz:
        val = '0'.repeat(sz - val.length) + val
    return val


def to_ascii(str_, identifier):
    def f(ch):
        code = ch.charCodeAt(0).toString(16)
        if code.length <= 2 and not identifier:
            return "\\x" + as_hex(code, 2)
        else:
            return '\\u' + as_hex(code, 4)

    return str_.replace(RegExp(r"[\u0080-\uffff]", "g"), f)


def encode_string(str_):
    def f(a):
        return '\\u' + as_hex(a.charCodeAt(0), 4)

    return JSON.stringify(str_).replace(DANGEROUS, f)


require_semi_colon_chars = make_predicate("( [ + * / - , .")

output_stream_defaults = {
    'indent_start': 0,
    'indent_level': 4,
    'quote_keys': False,
    'space_colon': True,
    'ascii_only': False,
    'width': 80,
    'max_line_len': 32000,
    'ie_proof': True,
    'beautify': False,
    'source_map': None,
    'bracketize': False,
    'semicolons': True,
    'comments': False,
    'preserve_line': False,
    'omit_baselib': False,
    'baselib_plain': None,
    'private_scope': True,
    'keep_docstrings': False,
    'discard_asserts': False,
    'module_cache_dir': '',
    'write_name': True,
}


class OutputStream:
    def __init__(self, options):
        self.options = defaults(options, output_stream_defaults, True)
        self._indentation = 0
        self.current_col = 0
        self.current_line = 1
        self.current_pos = 0
        self.OUTPUT = ""
        self.might_need_space = False
        self.might_need_semicolon = False
        self._last = None
        self._stack = []
        self.index_counter = 0
        self.with_counter = 0
        self.try_else_counter = 0

    def new_try_else_counter(self):
        self.try_else_counter += 1
        return 'ρσ_try_else_' + self.try_else_counter

    def make_name(self, name):
        name = name.toString()
        if self.options.ascii_only:
            name = to_ascii(name, True)

        return name

    def print_name(self, name):
        self.print(self.make_name(name))

    def make_indent(self, back):
        return repeat_string(
            " ", self.options.indent_start + self._indentation -
            back * self.options.indent_level)

    # -----[ beautification/minification ]-----
    def last_char(self):
        return self._last.charAt(self._last.length - 1)

    def maybe_newline(self):
        if self.options.max_line_len and self.current_col > self.options.max_line_len:
            self.print("\n")

    def print(self, str_):
        str_ = String(str_)
        ch = str_.charAt(0)
        if self.might_need_semicolon:
            if (not ch or ";}".indexOf(ch) < 0) and not RegExp(r"[;]").test(
                    self._last):
                if self.options.semicolons or require_semi_colon_chars[ch]:
                    self.OUTPUT += ";"
                    self.current_col += 1
                    self.current_pos += 1
                else:
                    self.OUTPUT += "\n"
                    self.current_pos += 1
                    self.current_line += 1
                    self.current_col = 0

                if not self.options.beautify:
                    self.might_need_space = False

            self.might_need_semicolon = False
            self.maybe_newline()

        if not self.options.beautify and self.options.preserve_line and self._stack[
                self._stack.length - 1]:
            target_line = self._stack[self._stack.length - 1].start.line
            while self.current_line < target_line:
                self.OUTPUT += "\n"
                self.current_pos += 1
                self.current_line += 1
                self.current_col = 0
                self.might_need_space = False

        if self.might_need_space:
            prev = self.last_char()
            if (is_identifier_char(prev) and
                (is_identifier_char(ch) or ch is "\\")
                    or RegExp(r"^[\+\-\/]$").test(ch) and ch is prev):
                self.OUTPUT += " "
                self.current_col += 1
                self.current_pos += 1

            self.might_need_space = False

        a = str_.split(RegExp(r"\r?\n"))
        n = a.length - 1
        self.current_line += n
        if n is 0:
            self.current_col += a[n].length
        else:
            self.current_col = a[n].length

        self.current_pos += str_.length
        self._last = str_
        self.OUTPUT += str_

    def space(self):
        if self.options.beautify:
            self.print(' ')
        else:
            self.might_need_space = True

    def indent(self, half):
        if self.options.beautify:
            self.print(self.make_indent((0.5 if half else 0)))

    def with_indent(self, col, proceed):
        if self.options.beautify:
            if col is True:
                col = self.next_indent()

            save_indentation = self._indentation
            self._indentation = col
            ret = proceed()
            self._indentation = save_indentation
            return ret
        else:
            return proceed()

    def indentation(self):
        return self._indentation

    def set_indentation(self, val):
        if self.options.beautify:
            self._indentation = val

    def newline(self):
        if self.options.beautify:
            self.print("\n")

    def semicolon(self):
        if self.options.beautify:
            self.print(";")
        else:
            self.might_need_semicolon = True

    def force_semicolon(self):
        self.might_need_semicolon = False
        self.print(";")

    def next_indent(self):
        return self._indentation + self.options.indent_level

    def spaced(self):
        for i in range(len(arguments)):
            if i > 0:
                self.space()
            if jstype(arguments[i].print) is 'function':
                arguments[i].print(self)
            else:
                self.print(arguments[i])

    def end_statement(self):
        self.semicolon()
        self.newline()

    def with_block(self, cont):
        ret = None
        self.print("{")
        self.newline()

        def f():
            nonlocal ret
            ret = cont()

        self.with_indent(self.next_indent(), f)
        self.indent()
        self.print("}")
        return ret

    def with_parens(self, cont):
        self.print("(")
        ret = cont()
        self.print(")")
        return ret

    def with_square(self, cont):
        self.print("[")
        ret = cont()
        self.print("]")
        return ret

    def comma(self):
        self.print(",")
        self.space()

    def colon(self):
        self.print(":")
        if self.options.space_colon:
            self.space()

    def get(self):
        return self.OUTPUT

    toString = get

    def assign(self, name):
        # generates: '[name] = '
        if jstype(name) is "string":
            self.print(name)
        else:
            name.print(self)
        self.space()
        self.print("=")
        self.space()

    def current_width(self):
        return self.current_col - self._indentation

    def should_break(self):
        return self.options.width and self.current_width(
        ) >= self.options.width

    def last(self):
        return self._last

    def print_string(self, str_):
        self.print(encode_string(str_))

    def line(self):
        return self.current_line

    def col(self):
        return self.current_col

    def pos(self):
        return self.current_pos

    def push_node(self, node):
        self._stack.push(node)

    def pop_node(self):
        return self._stack.pop()

    def stack(self):
        return self._stack

    def parent(self, n):
        return self._stack[self._stack.length - 2 - (n or 0)]
