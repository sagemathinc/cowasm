# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
from __python__ import hash_literals  # type: ignore

has_prop = Object.prototype.hasOwnProperty.call.bind(
    Object.prototype.hasOwnProperty)


def array_to_hash(a):
    ret = Object.create(None)
    for i in range(len(a)):
        ret[a[i]] = True
    return ret


def slice(a, start):
    return Array.prototype.slice.call(a, start or 0)


def characters(str_):
    return str_.split("")


def member(name, array):
    for i in range(array.length - 1, -1, -1):
        if array[i] is name:
            return True
    return False


def repeat_string(str_, i):
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
    def __init__(self, name, defs):
        ValueError.__init__(
            self,
            name + ' is not a supported option. Supported options are: ' +
            str(Object.keys(defs)))


def defaults(args, defs, croak):
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


def merge(obj, ext):
    for i in ext:
        obj[i] = ext[i]
    return obj


def noop():
    pass


def create_MAP():
    def MAP(a, f, backwards):
        ret = []
        top = []

        def doit():
            val = f(a[i], i)
            is_last = isinstance(val, Last)
            if is_last:
                val = val.v
            if isinstance(val, AtTop):
                val = val.v
                if isinstance(val, Splice):
                    top.push.apply(
                        top, (val.v.slice().reverse() if backwards else val.v))
                else:
                    top.push(val)
            elif val is not skip:
                if isinstance(val, Splice):
                    ret.push.apply(
                        ret, (val.v.slice().reverse() if backwards else val.v))
                else:
                    ret.push(val)
            return is_last

        if Array.isArray(a):
            if backwards:
                for i in range(a.length - 1, -1, -1):
                    if doit():
                        break
                ret.reverse()
                top.reverse()
            else:
                for i in range(len(a)):
                    if doit():
                        break
        else:
            for i in a:
                if doit():
                    break
        return top.concat(ret)

    def at_top(val):
        return AtTop(val)

    MAP.at_top = at_top

    def splice(val):
        return Splice(val)

    MAP.splice = splice

    def last(val):
        return Last(val)

    MAP.last = last

    skip = MAP.skip = {}

    def AtTop(val):
        this.v = val

    def Splice(val):
        this.v = val

    def Last(val):
        this.v = val

    return MAP


MAP = create_MAP.call(this)


def push_uniq(array, el):
    if array.indexOf(el) < 0:
        array.push(el)


def string_template(text, props):
    def f(str_, p):
        return props[p]

    return text.replace(r"%js /\{(.+?)\}/g", f)


def remove(array, el):
    for i in range(array.length - 1, -1, -1):
        if array[i] is el:
            array.splice(i, 1)


def mergeSort(array, cmp):
    if array.length < 2:
        return array.slice()

    def merge(a, b):
        r = []
        ai = 0
        bi = 0
        i = 0
        while ai < a.length and bi < b.length:
            if cmp(a[ai], b[bi]) <= 0:
                r[i] = a[ai]
                ai += 1
            else:
                r[i] = b[bi]
                bi += 1
            i += 1
        if ai < a.length:
            r.push.apply(r, a.slice(ai))
        if bi < b.length:
            r.push.apply(r, b.slice(bi))
        return r

    def _ms(a):
        if a.length <= 1:
            return a
        m = Math.floor(a.length / 2)
        left = a.slice(0, m)
        right = a.slice(m)
        left = _ms(left)
        right = _ms(right)
        return merge(left, right)

    return _ms(array)


def set_difference(a, b):
    def not_in_b(el):
        return not b.includes(el)

    return a.filter(not_in)


def set_intersection(a, b):
    def is_in_b(el):
        return b.indexOf(el) >= 0

    return a.filter(is_in_b)


def make_predicate(words):
    if jstype(words) is 'string':
        words = words.split(" ")
    a = Object.create(None)
    for k in words:
        a[k] = True
    return a


def cache_file_name(src, cache_dir):
    if cache_dir:
        src = str.replace(src, '\\', '/')
        return cache_dir + '/' + str.lstrip(
            str.replace(src, '/', '-') + '.json', '-')
    return None
