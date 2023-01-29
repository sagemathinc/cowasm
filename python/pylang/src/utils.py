# mypy
from __python__ import hash_literals, Object  # type: ignore

from typing import Any, Callable, Literal, Optional, Union


def array_to_hash(a: list[str]) -> dict[str, bool]:
    ret = {}
    for i in range(len(a)):
        ret[a[i]] = True
    return ret


def characters(str_: str) -> list[str]:
    return str_.split("")


def repeat_string(str_: str, i: int) -> str:
    if i <= 0:
        return ""
    if i is 1:
        return str_
    d = repeat_string(str_, i >> 1)
    d += d
    if i & 1:
        d += str_
    return d


class DefaultsError(ValueError):
    def __init__(self, name: str, defs: dict):
        ValueError.__init__(
            self,
            name + ' is not a supported option. Supported options are: ' +
            str(Object.keys(defs)))


has_prop = Object.prototype.hasOwnProperty.call.bind(
    Object.prototype.hasOwnProperty)


def defaults(args: Union[Literal[True], dict], defs: dict, croak: Callable):
    if args is True:
        args = {}
    ret = args or {}
    if croak:
        for i in ret:
            if not has_prop(defs, i):
                raise DefaultsError(i, defs)

    for i in defs:
        ret[i] = args[i] if args and has_prop(args, i) else defs[i]
    return ret


def merge(obj: dict, ext: dict) -> dict:
    for i in ext:
        obj[i] = ext[i]
    return obj


def noop() -> None:
    pass


def push_uniq(array, el) -> None:
    if not array.includes(el):
        array.push(el)


def string_template(text: str, props: dict) -> str:
    def f(str_, p):
        return props[p]

    # js replace takes function
    return text.replace(r"%js /\{(.+?)\}/g", f)  # type: ignore


def make_predicate(words: Union[str, list[str]]) -> dict[str, Literal[True]]:
    if isinstance(words, str):
        words = words.split(" ")
    a = Object.create(None)
    for k in words:
        a[k] = True
    return a


def cache_file_name(src: str, cache_dir: str) -> Union[None, str]:
    if cache_dir:
        src = str.replace(src, '\\', '/')
        return cache_dir + '/' + str.lstrip(
            str.replace(src, '/', '-') + '.json', '-')
    return None


# This charAt is defined in Javascript and is definitely not s[n],
# so here's a version that will work in pure Python *and* pylang.
def charAt(s: str, n: int) -> str:
    try:
        return s.charAt(n)  # type: ignore
    except:
        if n < 0 or n >= len(s): return ''
        return s[n]


# Version of indexOf that works in pure python and pylang
def indexOf(s: str, t: str) -> int:
    try:
        return s.indexOf(t)  # type: ignore
    except:
        # pure python
        try:
            return s.index(t)
        except:
            return -1


def startswith(s: str, t: str) -> bool:
    try:
        # pylang
        return s.startsWith(t)  # type: ignore
    except:
        # pure python
        return s.startswith(t)
