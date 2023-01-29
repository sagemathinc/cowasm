# vim:fileencoding=utf-8
# License: BSD
# Copyright: 2015, Kovid Goyal <kovid at kovidgoyal.net>
# globals: ρσ_str

NameError = ReferenceError

class Exception(Error):

    def __init__(self, message):
        self.message = message
        self.stack = Error().stack
        self.name = self.constructor.name

    def __repr__(self):
        return self.name + ': ' + self.message

class AttributeError(Exception):
    pass

class IndexError(Exception):
    pass

class KeyError(Exception):
    pass

class ValueError(Exception):
    pass

class UnicodeDecodeError(Exception):
    pass

class AssertionError(Exception):
    pass

class ZeroDivisionError(Exception):
    pass
