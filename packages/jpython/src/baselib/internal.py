# vim:fileencoding=utf-8
# License: BSD

# globals: exports, console, ρσ_iterator_symbol, ρσ_kwargs_symbol, ρσ_arraylike, ρσ_list_contains, ρσ_list_constructor, ρσ_str, ρσ_int, ρσ_float

def ρσ_eslice(arr, step, start, end):
    if jstype(arr) is 'string' or v'arr instanceof String':
        is_string = True
        arr = arr.split('')

    if step < 0:
        step = -step
        arr = arr.slice().reverse()
        if jstype(start) is not "undefined": start = arr.length - start - 1
        if jstype(end) is not "undefined": end = arr.length - end - 1
    if jstype(start) is "undefined": start = 0
    if jstype(end) is "undefined": end = arr.length

    arr = arr.slice(start, end).filter(def(e, i): return i % step is 0;)
    if is_string:
        arr = arr.join('')
    return arr

def ρσ_delslice(arr, step, start, end):
    if jstype(arr) is 'string' or v'arr instanceof String':
        is_string = True
        arr = arr.split('')
    if step < 0:
        if jstype(start) is "undefined": start = arr.length
        if jstype(end) is "undefined": end = 0
        start, end, step = end, start, -step
    if jstype(start) is "undefined": start = 0
    if jstype(end) is "undefined": end = arr.length

    if step is 1:
        arr.splice(start, end - start)
    else:
        if end > start:
            indices = v'[]'
            for v'var i = start; i < end; i += step':
                indices.push(i)
            for v'var i = indices.length - 1; i >= 0; i--':
                arr.splice(indices[i], 1)

    if is_string:
        arr = arr.join('')
    return arr

def ρσ_flatten(arr):
    ans = []
    for v'var i=0; i < arr.length; i++':
        value = arr[i]  # noqa:undef
        if Array.isArray(value):
            ans = ans.concat(ρσ_flatten(value))
        else:
            ans.push(value)
    return ans

def ρσ_unpack_asarray(num, iterable):
    if ρσ_arraylike(iterable):
        return iterable
    ans = v'[]'
    if jstype(iterable[ρσ_iterator_symbol]) is 'function':
        iterator = iterable.keys() if jstype(Map) is 'function' and v'iterable instanceof Map' else iterable[ρσ_iterator_symbol]()
        result = iterator.next()
        while not result.done and ans.length < num:
            ans.push(result.value)
            result = iterator.next()
    return ans

def ρσ_extends(child, parent):
    child.prototype = Object.create(parent.prototype)
    child.prototype.constructor = child

ρσ_in = (def ():
    if jstype(Map) is 'function' and jstype(Set) is 'function':
        return def(val, arr):
            if jstype(arr) is 'string':
                return arr.indexOf(val) is not -1
            if jstype(arr.__contains__) is 'function':
                return arr.__contains__(val)
            if v'arr instanceof Map || arr instanceof Set':
                return arr.has(val)
            if ρσ_arraylike(arr):
                return ρσ_list_contains.call(arr, val)
            return Object.prototype.hasOwnProperty.call(arr, val)
    return def(val, arr):
        if jstype(arr) is 'string':
            return arr.indexOf(val) is not -1
        if jstype(arr.__contains__) is 'function':
            return arr.__contains__(val)
        if ρσ_arraylike(arr):
            return ρσ_list_contains.call(arr, val)
        return Object.prototype.hasOwnProperty.call(arr, val)
)()

def ρσ_Iterable(iterable):
    # Once ES6 is mature, change AST_ForIn to use the iterator protocol and get
    # rid of this function entirely
    if ρσ_arraylike(iterable):
        return iterable
    if jstype(iterable[ρσ_iterator_symbol]) is 'function':
        iterator = iterable.keys() if jstype(Map) is 'function' and v'iterable instanceof Map' else iterable[ρσ_iterator_symbol]()
        ans = []
        result = iterator.next()
        while not result.done:
            ans.push(result.value)
            result = iterator.next()
        return ans
    # so we can use 'for ... in' syntax with objects, as we would with dicts in python
    return Object.keys(iterable)

ρσ_desugar_kwargs = (def ():
    if jstype(Object.assign) is 'function':
        return def():
            ans = Object.create(None)
            ans[ρσ_kwargs_symbol] = True
            for v'var i = 0; i < arguments.length; i++':
                Object.assign(ans, arguments[i])
            return ans
    return def():
        ans = Object.create(None)
        ans[ρσ_kwargs_symbol] = True
        for v'var i = 0; i < arguments.length; i++':
            keys = Object.keys(arguments[i])
            for v'var j = 0; j < keys.length; j++':
                ans[keys[j]] = arguments[i][keys[j]]
        return ans
)()

def ρσ_interpolate_kwargs(f, supplied_args):
    if not f.__argnames__:
        return f.apply(this, supplied_args)
    has_prop = Object.prototype.hasOwnProperty
    kwobj = supplied_args.pop()
    if f.__handles_kwarg_interpolation__:
        args = Array(Math.max(supplied_args.length, f.__argnames__.length) + 1)
        args[-1] = kwobj
        for v'var i = 0; i < args.length - 1; i++':
            if i < f.__argnames__.length:
                prop = f.__argnames__[i]
                if has_prop.call(kwobj, prop):
                    args[i] = kwobj[prop]
                    v'delete kwobj[prop]'
                elif i < supplied_args.length:
                    args[i] = supplied_args[i]
            else:
                args[i] = supplied_args[i]
        return f.apply(this, args)

    for v'var i = 0; i < f.__argnames__.length; i++':
        prop = f.__argnames__[i]
        if has_prop.call(kwobj, prop):
            supplied_args[i] = kwobj[prop]
    return f.apply(this, supplied_args)

def ρσ_interpolate_kwargs_constructor(apply, f, supplied_args):
    if apply:
        f.apply(this, supplied_args)
    else:
        ρσ_interpolate_kwargs.call(this, f, supplied_args)
    return this

def ρσ_getitem(obj, key):
    if obj.__getitem__:
        return obj.__getitem__(key)
    if jstype(key) is 'number' and key < 0:
        key += obj.length
    return obj[key]

def ρσ_setitem(obj, key, val):
    if obj.__setitem__:
        obj.__setitem__(key, val)
    else:
        if jstype(key) is 'number' and key < 0:
            key += obj.length
        obj[key] = val

def ρσ_delitem(obj, key):
    if obj.__delitem__:
        obj.__delitem__(key)
    elif jstype(obj.splice) is 'function':
        obj.splice(key, 1)
    else:
        if jstype(key) is 'number' and key < 0:
            key += obj.length
        v'delete obj[key]'

def ρσ_bound_index(idx, arr):
    if jstype(idx) is 'number' and idx < 0:
        idx += arr.length
    return idx

def ρσ_splice(arr, val, start, end):
    start = start or 0
    if start < 0:
        start += arr.length
    if end is undefined:
        end = arr.length
    if end < 0:
        end += arr.length
    Array.prototype.splice.apply(arr, v'[start, end - start].concat(val)')

ρσ_exists = {
     'n': def(expr):
        return expr is not undefined and expr is not None
    ,'d': def(expr):
        if expr is undefined or expr is None:
            return Object.create(None)
        return expr
    ,'c': def(expr):
        if jstype(expr) is 'function':
            return expr
        return def():
            return undefined
    ,'g': def(expr):
        if expr is undefined or expr is None or jstype(expr.__getitem__) is not 'function':
            return {'__getitem__': def(): return undefined;}
    ,'e': def(expr, alt):
        return alt if expr is undefined or expr is None else expr
}

def ρσ_mixin():
    # Implement a depth-first left-to-right method resolution order This is not
    # the same as python's MRO, but I really dont feel like implementing the C3
    # linearization right now, if that is even possible with prototypical
    # inheritance.
    seen = Object.create(None)
    # Ensure the following special properties are never copied
    seen.__argnames__ = seen.__handles_kwarg_interpolation__ = seen.__init__ = seen.__annotations__ = seen.__doc__ = seen.__bind_methods__ = seen.__bases__ = seen.constructor = seen.__class__ = True
    resolved_props = {}
    p = target = arguments[0].prototype
    while p and p is not Object.prototype:
        props = Object.getOwnPropertyNames(p)
        for v'var i = 0; i < props.length; i++':
            seen[props[i]] = True
        p = Object.getPrototypeOf(p)
    for v'var c = 1; c < arguments.length; c++':
        p = arguments[c].prototype
        while p and p is not Object.prototype:
            props = Object.getOwnPropertyNames(p)
            for v'var i = 0; i < props.length; i++':
                name = props[i]
                if seen[name]:
                    continue
                seen[name] = True
                resolved_props[name] = Object.getOwnPropertyDescriptor(p, name)
            p = Object.getPrototypeOf(p)
    Object.defineProperties(target, resolved_props)

def ρσ_instanceof():
    obj = arguments[0]
    bases = ''
    if obj and obj.constructor and obj.constructor.prototype:
        bases = obj.constructor.prototype.__bases__ or ''
    for v'var i = 1; i < arguments.length; i++':
        q = arguments[i]
        if v'obj instanceof q':
            return True
        if (q is Array or q is ρσ_list_constructor) and Array.isArray(obj):
            return True
        if q is ρσ_str and (jstype(obj) is 'string' or v'obj instanceof String'):
            return True
        if q is ρσ_int and (jstype(obj) is 'number' and Number.isInteger(obj)):
            return True
        if q is ρσ_float and (jstype(obj) is 'number' and not Number.isInteger(obj)):
            return True
        if bases.length > 1:
            for v'var c = 1; c < bases.length; c++':
                cls = bases[c]
                while cls:
                    if q is cls:
                        return True
                    p = Object.getPrototypeOf(cls.prototype)
                    if not p:
                        break
                    cls = p.constructor
    return False
