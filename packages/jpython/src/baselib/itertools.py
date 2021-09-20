# vim:fileencoding=utf-8
# License: BSD
# Copyright: 2015, Kovid Goyal <kovid at kovidgoyal.net>

# globals: ρσ_iterator_symbol, ρσ_bool

def sum(iterable, start):
    if Array.isArray(iterable):
        return iterable.reduce(
            def(prev, cur): return prev+cur
            ,
            start or 0
        )
    ans = start or 0
    iterator = iter(iterable)
    r = iterator.next()
    while not r.done:
        ans += r.value
        r = iterator.next()
    return ans

def map():
    iterators = new Array(arguments.length - 1)
    func = arguments[0]  # noqa: unused-local
    args = new Array(arguments.length - 1)  # noqa: unused-local
    for v'var i = 1; i < arguments.length; i++':
        iterators[i - 1] = iter(arguments[i])  # noqa:undef
    ans = v"{'_func':func, '_iterators':iterators, '_args':args}"
    ans[ρσ_iterator_symbol] = def():
        return this
    ans['next'] = def():
        for v'var i = 0; i < this._iterators.length; i++':
            r = this._iterators[i].next()
            if r.done:
                return v"{'done':true}"
            this._args[i] = r.value  # noqa:undef
        return v"{'done':false, 'value':this._func.apply(undefined, this._args)}"
    return ans

def filter(func_or_none, iterable):
    func = ρσ_bool if func_or_none is None else func_or_none  # noqa: unused-local
    ans = v"{'_func':func, '_iterator':ρσ_iter(iterable)}"
    ans[ρσ_iterator_symbol] = def():
        return this
    ans['next'] = def():
        r = this._iterator.next()
        while not r.done:
            if this._func(r.value):
                return r
            r = this._iterator.next()
        return v"{'done':true}"
    return ans

def zip():
    iterators = new Array(arguments.length)
    for v'var i = 0; i < arguments.length; i++':
        iterators[i] = iter(arguments[i])  # noqa:undef
    ans = v"{'_iterators':iterators}"
    ans[ρσ_iterator_symbol] = def():
        return this
    ans['next'] = def():
        args = new Array(this._iterators.length)
        for v'var i = 0; i < this._iterators.length; i++':
            r = this._iterators[i].next()
            if r.done:
                return v"{'done':true}"
            args[i] = r.value  # noqa:undef
        return v"{'done':false, 'value':args}"
    return ans

def any(iterable):
    for i in iterable:
        if i:
            return True
    return False

def all(iterable):
    for i in iterable:
        if not i:
            return False
    return True
