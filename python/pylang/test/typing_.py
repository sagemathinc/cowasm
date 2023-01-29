# mypy
# You can run this file through mypy and it passes the checks.
# You can also use it in pylang.
#
# The way this works is as follows:
#  - the "typing" module is mocked by the pylang compiler so that
#    importing from it is a no-op (so src/parser.py), and
#  - function annotations are not defined, since that potentially
#    involves running code defined in typing at runtime, which
#    can't work.

from typing import Iterator


def fib(n: int) -> Iterator[int]:
    a, b = 0, 1
    while a < n:
        yield a
        a, b = b, a + b
