# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
from __python__ import hash_literals

class SyntaxError(Error):

    def __init__(self, message, filename, line, col, pos, is_eof):
        self.stack = Error().stack
        self.message = message
        self.line = line
        self.col = col
        self.pos = pos
        self.is_eof = is_eof
        self.filename = filename
        # The "standard" form for these error attributes
        self.lineNumber = line
        self.fileName = filename

    def toString(self):
        ans = self.message + " (line: " + self.line + ", col: " + self.col + ", pos: " + self.pos + ")"
        if self.filename:
            ans = self.filename + ':' + ans
        if self.stack:
            ans += "\n\n" + self.stack
        return ans


class ImportError(SyntaxError):
    pass

