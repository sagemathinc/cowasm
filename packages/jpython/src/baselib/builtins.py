# globals: exports, console, ρσ_iterator_symbol, ρσ_kwargs_symbol, ρσ_arraylike, ρσ_list_contains

def abs(a):
    return r"%js (typeof a === 'object' && a.__abs__ !== undefined) ? a.__abs__() : Math.abs(a)"

def ρσ_operator_add(a, b):
    return r"""%js (
typeof a !== 'object' ? a + b :
    ((a.__add__ !== undefined ? a.__add__(b) :
      a.concat !== undefined ? a.concat(b) :
      a + b)
    )
)
"""

def ρσ_operator_neg(a):
    return v"(typeof a === 'object' && a.__neg__ !== undefined) ? a.__neg__() : (-a)"

def ρσ_operator_sub(a, b):
    return v"(typeof a === 'object' && a.__sub__ !== undefined) ? a.__sub__(b) : a - b"

def ρσ_operator_mul(a, b):
    return v"(typeof a === 'object'  && a.__mul__ !== undefined) ? a.__mul__(b) : a * b"

def ρσ_operator_div(a, b):
    return v"(typeof a === 'object'  && a.__div__ !== undefined) ? a.__div__(b) : a / b"

def ρσ_operator_pow(a, b):
    return v"(typeof a === 'object'  && a.__pow__ !== undefined) ? a.__pow__(b) : a ** b"


def ρσ_operator_iadd(a, b):
    return v"(typeof a === 'object' && a.__iadd__ !== undefined) ? a.__iadd__(b) : ρσ_operator_add(a,b)"

def ρσ_operator_isub(a, b):
    return v"(typeof a === 'object' && a.__isub__ !== undefined) ? a.__isub__(b) : ρσ_operator_sub(a,b)"

def ρσ_operator_imul(a, b):
    return v"(typeof a === 'object' && a.__imul__ !== undefined) ? a.__imul__(b) : ρσ_operator_mul(a,b)"

def ρσ_operator_idiv(a, b):
    return v"(typeof a === 'object' && a.__idiv__ !== undefined) ? a.__idiv__(b) : ρσ_operator_div(a,b)"

def ρσ_operator_ipow(a, b):
    return v"(typeof a === 'object' && a.__ipow__ !== undefined) ? a.__ipow__(b) : ρσ_operator_pow(a,b)"


def ρσ_operator_truediv(a, b):
    return v"(typeof a === 'object'  && a.__truediv__ !== undefined) ? a.__truediv__(b) : a / b"

def ρσ_operator_floordiv(a, b):
    return v"(typeof a === 'object'  && a.__floordiv__ !== undefined) ? a.__floordiv__(b) : Math.floor(a / b)"

def ρσ_bool(val):
    return v'!!val'

def ρσ_round(val):
    # no attempt at Python semantics yet
    return v"Math.round(val)"

def ρσ_print():
    if v'typeof console' is 'object':
        parts = v'[]'
        for v'var i = 0; i < arguments.length; i++':
            parts.push(ρσ_str(arguments[i]))  # noqa: undef
        console.log(parts.join(' '))

def ρσ_int(val, base):
    if jstype(val) is "number":
        ans = val | 0
    else:
        ans = parseInt(val, base or 10)
    if isNaN(ans):
        raise ValueError('Invalid literal for int with base ' + (base or 10) + ': ' + val)
    return ans

def ρσ_float(val):
    if jstype(val) is "number":
        ans = val
    else:
        ans = parseFloat(val)
    if isNaN(ans):
        raise ValueError('Could not convert string to float: ' + arguments[0])
    return ans

def ρσ_arraylike_creator():
    names = 'Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array'.split(' ')
    if jstype(HTMLCollection) is 'function':
        names = names.concat('HTMLCollection NodeList NamedNodeMap TouchList'.split(' '))
    return def(x):
        if Array.isArray(x) or v'typeof x' is 'string' or names.indexOf(Object.prototype.toString.call(x).slice(8, -1)) > -1:
            return True
        return False

def options_object(f):
    return def():
        if v'typeof arguments[arguments.length - 1] === "object"':
            arguments[arguments.length - 1][ρσ_kwargs_symbol] = True
        return f.apply(this, arguments)

def ρσ_id(x):
    return x.ρσ_object_id

def ρσ_dir(item):
    # TODO: this isn't really representative of real Python's dir(), nor is it
    # an intuitive replacement for "for ... in" loop, need to update this logic
    # and introduce a different way of achieving "for ... in"
    arr = []
    for v'var i in item': arr.push(i)  # noqa:undef
    return arr

def ρσ_ord(x):
    ans = x.charCodeAt(0)
    if 0xD800 <= ans <= 0xDBFF:
        second = x.charCodeAt(1)
        if 0xDC00 <= second <= 0xDFFF:
            return (ans - 0xD800) * 0x400 + second - 0xDC00 + 0x10000
        raise TypeError('string is missing the low surrogate char')
    return ans

def ρσ_chr(code):
    if code <= 0xFFFF:
        return String.fromCharCode(code)
    code -= 0x10000
    return String.fromCharCode(0xD800+(code>>10), 0xDC00+(code&0x3FF))

def ρσ_callable(x):
    return v'typeof x === "function"'

def ρσ_bin(x):
    if jstype(x) is not 'number' or x % 1 is not 0:
        raise TypeError('integer required')
    ans = x.toString(2)
    if ans[0] is '-':
        ans = '-' + '0b' + ans[1:]
    else:
        ans = '0b' + ans
    return ans

def ρσ_hex(x):
    if jstype(x) is not 'number' or x % 1 is not 0:
        raise TypeError('integer required')
    ans = x.toString(16)
    if ans[0] is '-':
        ans = '-' + '0x' + ans[1:]
    else:
        ans = '0x' + ans
    return ans

def ρσ_enumerate(iterable):
    ans = v'{"_i":-1}'
    ans[ρσ_iterator_symbol] = def():
        return this
    if ρσ_arraylike(iterable):
        ans['next'] = def():
                this._i += 1
                if this._i < iterable.length:
                    return v"{'done':false, 'value':[this._i, iterable[this._i]]}"
                return v"{'done':true}"
        return ans
    if jstype(iterable[ρσ_iterator_symbol]) is 'function':
        iterator = iterable.keys() if jstype(Map) is 'function' and v'iterable instanceof Map' else iterable[ρσ_iterator_symbol]()
        ans['_iterator'] = iterator
        ans['next'] = def():
            r = this._iterator.next()
            if r.done:
                return v"{'done':true}"
            this._i += 1
            return v"{'done':false, 'value':[this._i, r.value]}"
        return ans
    return ρσ_enumerate(Object.keys(iterable))

def ρσ_reversed(iterable):
    if ρσ_arraylike(iterable):
        ans = v'{"_i": iterable.length}'
        ans['next'] = def():
            this._i -= 1
            if this._i > -1:
                return v"{'done':false, 'value':iterable[this._i]}"
            return v"{'done':true}"
        ans[ρσ_iterator_symbol] = def():
            return this
        return ans
    raise TypeError('reversed() can only be called on arrays or strings')

def ρσ_iter(iterable):
    # Generate a JavaScript iterator object from iterable
    if jstype(iterable[ρσ_iterator_symbol]) is 'function':
        return iterable.keys() if jstype(Map) is 'function' and v'iterable instanceof Map' else iterable[ρσ_iterator_symbol]()
    if ρσ_arraylike(iterable):
        ans = v'{"_i":-1}'
        ans[ρσ_iterator_symbol] = def():
            return this
        ans['next'] = def():
            this._i += 1
            if this._i < iterable.length:
                return v"{'done':false, 'value':iterable[this._i]}"
            return v"{'done':true}"
        return ans
    return ρσ_iter(Object.keys(iterable))

def ρσ_range_next(step, length):
    this._i += step
    this._idx += 1
    if this._idx >= length:
        this._i, this._idx = this.__i, -1
        return v"{'done':true}"
    return v"{'done':false, 'value':this._i}"

def ρσ_range(start, stop, step):
    if arguments.length <= 1:
        stop = start or 0
        start = 0
    step = arguments[2] or 1
    length = Math.max(Math.ceil((stop - start) / step), 0)
    ans = v'{start:start, step:step, stop:stop}'
    ans[ρσ_iterator_symbol] = def():
        it = v'{"_i": start - step, "_idx": -1}'
        it.next = ρσ_range_next.bind(it, step, length)
        it[ρσ_iterator_symbol] = def():
            return this
        return it
    ans.count = def(val):
        if not this._cached:
            this._cached = list(this)
        return this._cached.count(val)
    ans.index = def(val):
        if not this._cached:
            this._cached = list(this)
        return this._cached.index(val)

    def slice(new_start=undefined, new_stop=undefined):
        if step < 0:
            if new_start is undefined and new_stop is undefined:
                return ans
            # I'm too lazy to do this directly, so just fallback for now.
            return list(ans)[new_start:new_stop]

        if new_start is undefined:
            if new_stop is undefined:
                return ans
            else:
                if new_stop < 0:
                    new_stop = (length + new_stop);
                return ρσ_range(start, Math.max(start, Math.min(new_stop*step+start, stop)), step)
        if new_stop is undefined:
            if new_start < 0:
                new_start = (length + new_start);
            return ρσ_range(Math.min(stop, Math.max(new_start*step+start, start)), stop, step)
        else:
            if new_stop < 0:
                new_stop = (length + new_stop);
            if new_start < 0:
                new_start = (length + new_start);
            return ρσ_range(Math.min(new_stop*step, Math.max(new_start*step+start, start)), Math.max(new_start*step+start, Math.min(new_stop*step+start, stop)), step)
    ans.slice = slice;

    # ans.__getitem__

    ans.__len__ = def():
        return length
    ans.__repr__ = def():
        if step == 1:
            return f'range({start}, {stop})'
        else:
            return f'range({start}, {stop}, {step})'
    ans.__str__ = ans.toString = ans.__repr__
    if jstype(Proxy) is 'function':
        ans = new Proxy(ans, {
            'get': def(obj, prop):
                if jstype(prop) is 'string':
                    iprop = parseInt(prop)
                    if not isNaN(iprop):
                        prop = iprop
                if jstype(prop) is 'number':
                    if not obj._cached:
                        obj._cached = list(obj)
                    return obj._cached[prop]
                return obj[prop]
        })
    return ans

def ρσ_getattr(obj, name, defval):
    try:
        ret = obj[name]
    except TypeError:
        if defval is undefined:
            raise AttributeError('The attribute ' + name + ' is not present')
        return defval
    if ret is undefined and not v'(name in obj)':
        if defval is undefined:
            raise AttributeError('The attribute ' + name + ' is not present')
        ret = defval
    return ret

def ρσ_setattr(obj, name, value):
    obj[name] = value

def ρσ_hasattr(obj, name):
    return v'name in obj'

ρσ_len = (def ():

    def len(obj):
        if ρσ_arraylike(obj): return obj.length
        if jstype(obj.__len__) is 'function': return obj.__len__()
        if v'obj instanceof Set' or v'obj instanceof Map': return obj.size
        return Object.keys(obj).length

    def len5(obj):
        if ρσ_arraylike(obj): return obj.length
        if jstype(obj.__len__) is 'function': return obj.__len__()
        return Object.keys(obj).length

    return len if v'typeof Set' is 'function' and v'typeof Map' is 'function' else len5
)()

def ρσ_get_module(name):
    return ρσ_modules[name]

def ρσ_pow(x, y, z):
    ans = Math.pow(x, y)
    if z is not undefined:
        ans %= z
    return ans

def ρσ_type(x):
    return x.constructor


def ρσ_divmod(x, y):
    if y is 0:
        raise ZeroDivisionError('integer division or modulo by zero')
    d = Math.floor(x / y)
    return d, x - d * y


def ρσ_max(*args, **kwargs):
    if args.length is 0:
        if kwargs.defval is not undefined:
            return kwargs.defval
        raise TypeError('expected at least one argument')
    if args.length is 1:
        args = args[0]
    if kwargs.key:
        args = [kwargs.key(x) for x in args]
    if not Array.isArray(args):
        args = list(args)
    if args.length:
        return this.apply(None, args)
    if kwargs.defval is not undefined:
        return kwargs.defval
    raise TypeError('expected at least one argument')

v'var round = ρσ_round; var max = ρσ_max.bind(Math.max), min = ρσ_max.bind(Math.min), bool = ρσ_bool, type = ρσ_type'
v'var float = ρσ_float, int = ρσ_int, arraylike = ρσ_arraylike_creator(), ρσ_arraylike = arraylike'
v'var print = ρσ_print, id = ρσ_id, get_module = ρσ_get_module, pow = ρσ_pow, divmod = ρσ_divmod'
v'var dir = ρσ_dir, ord = ρσ_ord, chr = ρσ_chr, bin = ρσ_bin, hex = ρσ_hex, callable = ρσ_callable'
v'var enumerate = ρσ_enumerate, iter = ρσ_iter, reversed = ρσ_reversed, len = ρσ_len'
v'var range = ρσ_range, getattr = ρσ_getattr, setattr = ρσ_setattr, hasattr = ρσ_hasattr'
