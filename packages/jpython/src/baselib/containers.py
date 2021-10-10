# vim:fileencoding=utf-8
# License: BSD
# Copyright: 2015, Kovid Goyal <kovid at kovidgoyal.net>

# globals:ρσ_iterator_symbol, ρσ_kwargs_symbol, ρσ_arraylike, ρσ_repr

def ρσ_equals(a, b):
    if a is b:
        return True
    type_a = jstype(a)
    type_b = jstype(b)
    # WARNING: We have to use "is" here to avoid recursive call to ρσ_equals by getting "===".
    # However, in genuine Python is comparison with a constant is a WARNING/Error.
    if type_a is type_b and (type_a is 'number' or type_a is 'string'
                             or type_a is 'boolean'):
        return a is b
    if a and jstype(a.__eq__) is 'function':
        return a.__eq__(b)
    if b and jstype(b.__eq__) is 'function':
        return b.__eq__(a)
    if ρσ_arraylike(a) and ρσ_arraylike(b):
        if a.length != b.length:
            return False
        for i in range(len(a)):
            if not (a[i] == b[i]):
                return False
        return True
    if jstype(a) is 'object' and jstype(
            b) is 'object' and a is not None and b is not None and (
                (a.constructor is Object or Object.getPrototypeOf(a) is None)
                and
                (b.constructor is Object or Object.getPrototypeOf(b) is None)):
        # Do a dict like comparison as this is most likely either a JS has
        # (Object.create(null) or a JS object used as a hash (v"{}"))
        akeys, bkeys = Object.keys(a), Object.keys(b)
        if akeys.length is not bkeys.length:
            return False
        for j in range(len(akeys)):
            key = akeys[j]
            if not (a[key] == b[key]):
                return False
        return True
    return False

def ρσ_not_equals(a, b):
    if a is b:
        return False
    if a and jstype(a.__ne__) is 'function':
        return a.__ne__(b)
    if b and jstype(b.__ne__) is 'function':
        return b.__ne__(a)
    return not ρσ_equals(a, b)

v'var equals = ρσ_equals'

# list {{{

def ρσ_list_extend(iterable):
    if Array.isArray(iterable) or jstype(iterable) is 'string':
        # Allocate all new memory in one operation
        start = this.length
        this.length += iterable.length
        for v'var i = 0; i < iterable.length; i++':
            this[start + i] = iterable[i]  # noqa:undef
    else:
        iterator = iterable.keys() if jstype(Map) is 'function' and v'iterable instanceof Map' else iterable[ρσ_iterator_symbol]()
        result = iterator.next()
        while not result.done:
            this.push(result.value)
            result = iterator.next()

def ρσ_list_index(val, start, stop):
    start = start or 0
    if start < 0:
        start = this.length + start
    if start < 0:
        raise ValueError(val + ' is not in list')
    if stop is undefined:
        idx = this.indexOf(val, start)
        if idx is -1:
            raise ValueError(val + ' is not in list')
        return idx
    if stop < 0:
        stop = this.length + stop
    for v'var i = start; i < stop; i++':
        if this[i] == val:
            return i  # noqa:undef
    raise ValueError(val + ' is not in list')

def ρσ_list_pop(index):
    if this.length is 0:
        raise IndexError('list is empty')
    if index is undefined:
        index = -1
    ans = this.splice(index, 1)
    if not ans.length:
        raise IndexError('pop index out of range')
    return ans[0]

def ρσ_list_remove(value):
    idx = this.indexOf(value)
    if idx is -1:
        raise ValueError(value + ' not in list')
    this.splice(idx, 1)

def ρσ_list_to_string():
    return '[' + this.join(', ') + ']'

def ρσ_list_insert(index, val):
    if index < 0:
        index += this.length
    index = min(this.length, max(index, 0))
    if index is 0:
        this.unshift(val)
        return
    for v'var i = this.length; i > index; i--':
        this[i] = this[i - 1]  # noqa:undef
    this[index] = val

def ρσ_list_copy():
    return ρσ_list_constructor(this)

def ρσ_list_clear():
    this.length = 0

def ρσ_list_as_array():
    return Array.prototype.slice.call(this)

def ρσ_list_count(value):
    return this.reduce(def(n, val): return n + (val is value);, 0)

def ρσ_list_sort_key(value):
    t = jstype(value)
    if t is 'string' or t is 'number':
        return value
    return value.toString()

def ρσ_list_sort_cmp(a, b, ap, bp):
    if a < b:
        return -1
    if a > b:
        return 1
    return ap - bp

def ρσ_list_sort(key=None, reverse=False):
    key = key or ρσ_list_sort_key
    mult = -1 if reverse else 1
    keymap = dict()
    posmap = dict()
    for v'var i=0; i < this.length; i++':
        k = this[i]  # noqa:undef
        keymap.set(k, key(k))
        posmap.set(k, i)
    this.sort(def (a, b): return mult * ρσ_list_sort_cmp(keymap.get(a), keymap.get(b), posmap.get(a), posmap.get(b));)

def ρσ_list_concat():  # ensure concat() returns an object of type list
    ans = Array.prototype.concat.apply(this, arguments)
    ρσ_list_decorate(ans)
    return ans

def ρσ_list_slice():  # ensure slice() returns an object of type list
    ans = Array.prototype.slice.apply(this, arguments)
    ρσ_list_decorate(ans)
    return ans

def ρσ_list_iterator(value):
    self = this
    return {
        '_i':-1,
        '_list':self,
        'next':def():
            this._i += 1
            if this._i >= this._list.length:
                return {'done':True}
            return {'done':False, 'value':this._list[this._i]}
        ,
    }

def ρσ_list_len():
    return this.length

def ρσ_list_contains(val):
    for v'var i = 0; i < this.length; i++':
        if this[i] == val:
            return True
    return False

def ρσ_list_eq(other):
    if not ρσ_arraylike(other):
        return False
    if this.length != other.length:
        return False
    for v'var i = 0; i < this.length; i++':
        if not (this[i] == other[i]):
            return False
    return True

def ρσ_list_mul(other):
    # In Javascript it seems that the fastest way
    # is to directly assign using a for loop. Everything
    # else seems much slower.  This is something that
    # Python is just much faster at, perhaps because Javascript
    # doesn't really have arrays (they are really hash maps).
    ans = []
    k = int(other)
    n = this.length
    r"%js let s=0; for(let i=0; i<k; i++) { for(let j=0; j<n; j++) {ans[s++]=this[j];}}"
    return ans

def ρσ_list_decorate(ans):
    ans.append = Array.prototype.push
    ans.toString = ρσ_list_to_string
    ans.inspect = ρσ_list_to_string
    ans.extend = ρσ_list_extend
    ans.index = ρσ_list_index
    ans.pypop = ρσ_list_pop
    ans.remove = ρσ_list_remove
    ans.insert = ρσ_list_insert
    ans.copy = ρσ_list_copy
    ans.clear = ρσ_list_clear
    ans.count = ρσ_list_count
    ans.concat = ρσ_list_concat
    ans.pysort = ρσ_list_sort
    ans.slice = ρσ_list_slice
    ans.as_array = ρσ_list_as_array
    ans.__len__ = ρσ_list_len
    ans.__contains__ = ρσ_list_contains
    ans.__eq__ = ρσ_list_eq
    ans.__mul__ = ρσ_list_mul
    ans.constructor = ρσ_list_constructor
    if jstype(ans[ρσ_iterator_symbol]) is not 'function':
        # Happens on ES 5 runtimes
        ans[ρσ_iterator_symbol] = ρσ_list_iterator
    return ans

def ρσ_list_constructor(iterable):
    if iterable is undefined:
        ans = v'[]'
    elif ρσ_arraylike(iterable):
        ans = new Array(iterable.length)
        for v'var i = 0; i < iterable.length; i++':
            ans[i] = iterable[i]  # noqa:undef
    elif jstype(iterable[ρσ_iterator_symbol]) is 'function':
        ans = Array.from(iterable)
    elif jstype(iterable) is 'number':
        # non-pythonic optimization to allocate all needed memory in a single operation
        ans = new Array(iterable)
    else:
        ans = Object.keys(iterable)
    return ρσ_list_decorate(ans)
ρσ_list_constructor.__name__ = 'list'

v'var list = ρσ_list_constructor, list_wrap = ρσ_list_decorate'

def sorted(iterable, key=None, reverse=False):
    ans = ρσ_list_constructor(iterable)
    ans.pysort(key, reverse)
    return ans
# }}}

# set {{{
v'var ρσ_global_object_id = 0, ρσ_set_implementation'

def ρσ_set_keyfor(x):
    t = jstype(x)
    if t is 'string' or t is 'number' or t is 'boolean':
        return '_' + t[0] + x
    if v'x === null': # also matches undefined
        return "__!@#$0"
    ans = x.ρσ_hash_key_prop
    if ans is undefined:
        v'ans = "_!@#$" + (++ρσ_global_object_id)'
        Object.defineProperty(x, 'ρσ_hash_key_prop', { 'value': ans })
    return ans

def ρσ_set_polyfill():
    this._store = {}
    this.size = 0

ρσ_set_polyfill.prototype.add = def(x):
    key = ρσ_set_keyfor(x)
    if not Object.prototype.hasOwnProperty.call(this._store, key):
        this.size += 1
        this._store[key] = x
    return this

ρσ_set_polyfill.prototype.clear = def(x):
    this._store = {}
    this.size = 0

ρσ_set_polyfill.prototype.delete = def(x):
    key = ρσ_set_keyfor(x)
    if Object.prototype.hasOwnProperty.call(this._store, key):
        this.size -= 1
        v'delete this._store[key]'
        return True
    return False

ρσ_set_polyfill.prototype.has = def(x):
    return Object.prototype.hasOwnProperty.call(this._store, ρσ_set_keyfor(x))

ρσ_set_polyfill.prototype.values = def(x):
    ans = v"{'_keys': Object.keys(this._store), '_i':-1, '_s':this._store}"
    ans[ρσ_iterator_symbol] = def():
        return this
    ans['next'] = def():
        this._i += 1
        if this._i >= this._keys.length:
            return v"{'done': true}"
        return v"{'done':false, 'value':this._s[this._keys[this._i]]}"
    return ans

if jstype(Set) is not 'function' or jstype(Set.prototype.delete) is not 'function':
    v'ρσ_set_implementation = ρσ_set_polyfill'
else:
    v'ρσ_set_implementation = Set'

def ρσ_set(iterable):
    if v'this instanceof ρσ_set':
        this.jsset = new ρσ_set_implementation()  # noqa:undef
        ans = this
        if iterable is undefined:
            return ans
        s = ans.jsset
        if ρσ_arraylike(iterable):
            for v'var i = 0; i < iterable.length; i++':
                s.add(iterable[i])
        elif jstype(iterable[ρσ_iterator_symbol]) is 'function':
            iterator = iterable.keys() if jstype(Map) is 'function' and v'iterable instanceof Map' else iterable[ρσ_iterator_symbol]()
            result = iterator.next()
            while not result.done:
                s.add(result.value)
                result = iterator.next()
        else:
            keys = Object.keys(iterable)
            for v'var j=0; j < keys.length; j++':
                s.add(keys[j])
        return ans
    else:
        return new ρσ_set(iterable)
ρσ_set.prototype.__name__ = 'set'

# These are for JavaScript users' convenience
Object.defineProperties(ρσ_set.prototype, {
    'length': { 'get': def(): return this.jsset.size; },
    'size': { 'get': def(): return this.jsset.size; },
})

ρσ_set.prototype.__len__ = def(): return this.jsset.size
ρσ_set.prototype.has = ρσ_set.prototype.__contains__ = def(x): return this.jsset.has(x)
ρσ_set.prototype.add = def(x): this.jsset.add(x)
ρσ_set.prototype.clear = def(): this.jsset.clear()
ρσ_set.prototype.copy = def(): return ρσ_set(this)
ρσ_set.prototype.discard = def(x): this.jsset.delete(x)
ρσ_set.prototype[ρσ_iterator_symbol] = def(): return this.jsset.values()

ρσ_set.prototype.difference = def():
    ans = new ρσ_set()
    s = ans.jsset
    iterator = this.jsset.values()
    r = iterator.next()
    while not r.done:
        x = r.value
        has = False
        for v'var i = 0; i < arguments.length; i++':
            if arguments[i].has(x):  # noqa:undef
                has = True
                break
        if not has:
            s.add(x)
        r = iterator.next()
    return ans

ρσ_set.prototype.difference_update = def():
    s = this.jsset
    remove = v'[]'
    iterator = s.values()
    r = iterator.next()
    while not r.done:
        x = r.value
        for v'var i = 0; i < arguments.length; i++':
            if arguments[i].has(x):  # noqa:undef
                remove.push(x)
                break
        r = iterator.next()
    for v'var j = 0; j < remove.length; j++':
        s.delete(remove[j])  # noqa:undef

ρσ_set.prototype.intersection = def():
    ans = new ρσ_set()
    s = ans.jsset
    iterator = this.jsset.values()
    r = iterator.next()
    while not r.done:
        x = r.value
        has = True
        for v'var i = 0; i < arguments.length; i++':
            if not arguments[i].has(x):  # noqa:undef
                has = False
                break
        if has:
            s.add(x)
        r = iterator.next()
    return ans

ρσ_set.prototype.intersection_update = def():
    s = this.jsset
    remove = v'[]'
    iterator = s.values()
    r = iterator.next()
    while not r.done:
        x = r.value
        for v'var i = 0; i < arguments.length; i++':
            if not arguments[i].has(x):  # noqa:undef
                remove.push(x)
                break
        r = iterator.next()
    for v'var j = 0; j < remove.length; j++':
        s.delete(remove[j])  # noqa:undef

ρσ_set.prototype.isdisjoint = def(other):
    iterator = this.jsset.values()
    r = iterator.next()
    while not r.done:
        x = r.value
        if other.has(x):
            return False
        r = iterator.next()
    return True

ρσ_set.prototype.issubset = def(other):
    iterator = this.jsset.values()
    r = iterator.next()
    while not r.done:
        x = r.value
        if not other.has(x):
            return False
        r = iterator.next()
    return True

ρσ_set.prototype.issuperset = def(other):
    s = this.jsset
    iterator = other.jsset.values()
    r = iterator.next()
    while not r.done:
        x = r.value
        if not s.has(x):
            return False
        r = iterator.next()
    return True

ρσ_set.prototype.pop = def():
    iterator = this.jsset.values()
    r = iterator.next()
    if r.done:
        raise KeyError('pop from an empty set')
    this.jsset.delete(r.value)
    return r.value

ρσ_set.prototype.remove = def(x):
    if not this.jsset.delete(x):
        raise KeyError(x.toString())

ρσ_set.prototype.symmetric_difference = def(other):
    return this.union(other).difference(this.intersection(other))

ρσ_set.prototype.symmetric_difference_update = def(other):
    common = this.intersection(other)
    this.update(other)
    this.difference_update(common)

ρσ_set.prototype.union = def():
    ans = ρσ_set(this)
    ans.update.apply(ans, arguments)
    return ans

ρσ_set.prototype.update = def():
    s = this.jsset
    for v'var i=0; i < arguments.length; i++':
        iterator = arguments[i][ρσ_iterator_symbol]()  # noqa:undef
        r = iterator.next()
        while not r.done:
            s.add(r.value)
            r = iterator.next()

ρσ_set.prototype.toString = ρσ_set.prototype.__repr__ = ρσ_set.prototype.__str__ = ρσ_set.prototype.inspect = def():
    return '{' + list(this).join(', ') + '}'

ρσ_set.prototype.__eq__ = def(other):
    if not v'other instanceof this.constructor':
        return False
    if other.size is not this.size:
        return False
    if other.size is 0:
        return True
    iterator = other[ρσ_iterator_symbol]()
    r = iterator.next()
    while not r.done:
        if not this.has(r.value):
            return False
        r = iterator.next()
    return True

def ρσ_set_wrap(x):
    ans = new ρσ_set()
    ans.jsset = x
    return ans

v'var set = ρσ_set, set_wrap = ρσ_set_wrap'
# }}}

# dict {{{
v'var ρσ_dict_implementation'

def ρσ_dict_polyfill():
    this._store = {}
    this.size = 0

ρσ_dict_polyfill.prototype.set = def(x, value):
    key = ρσ_set_keyfor(x)
    if not Object.prototype.hasOwnProperty.call(this._store, key):
        this.size += 1
    this._store[key] = v'[x, value]'
    return this

ρσ_dict_polyfill.prototype.clear = def(x):
    this._store = {}
    this.size = 0

ρσ_dict_polyfill.prototype.delete = def(x):
    key = ρσ_set_keyfor(x)
    if Object.prototype.hasOwnProperty.call(this._store, key):
        this.size -= 1
        v'delete this._store[key]'
        return True
    return False

ρσ_dict_polyfill.prototype.has = def(x):
    return Object.prototype.hasOwnProperty.call(this._store, ρσ_set_keyfor(x))

ρσ_dict_polyfill.prototype.get = def(x):
    try:
        return this._store[ρσ_set_keyfor(x)][1]
    except TypeError:  # Key is not present
        return undefined

ρσ_dict_polyfill.prototype.values = def(x):
    ans = v"{'_keys': Object.keys(this._store), '_i':-1, '_s':this._store}"
    ans[ρσ_iterator_symbol] = def():
        return this
    ans['next'] = def():
        this._i += 1
        if this._i >= this._keys.length:
            return v"{'done': true}"
        return v"{'done':false, 'value':this._s[this._keys[this._i]][1]}"
    return ans

ρσ_dict_polyfill.prototype.keys = def(x):
    ans = v"{'_keys': Object.keys(this._store), '_i':-1, '_s':this._store}"
    ans[ρσ_iterator_symbol] = def():
        return this
    ans['next'] = def():
        this._i += 1
        if this._i >= this._keys.length:
            return v"{'done': true}"
        return v"{'done':false, 'value':this._s[this._keys[this._i]][0]}"
    return ans

ρσ_dict_polyfill.prototype.entries = def(x):
    ans = v"{'_keys': Object.keys(this._store), '_i':-1, '_s':this._store}"
    ans[ρσ_iterator_symbol] = def():
        return this
    ans['next'] = def():
        this._i += 1
        if this._i >= this._keys.length:
            return v"{'done': true}"
        return v"{'done':false, 'value':this._s[this._keys[this._i]]}"
    return ans

if jstype(Map) is not 'function' or jstype(Map.prototype.delete) is not 'function':
    v'ρσ_dict_implementation = ρσ_dict_polyfill'
else:
    v'ρσ_dict_implementation = Map'

def ρσ_dict(iterable, **kw):
    if v'this instanceof ρσ_dict':
        # TODO: this is really for copying dicts.
        this.jsmap = new ρσ_dict_implementation()  # noqa:undef
        if iterable is not undefined:
            this.update(iterable)
        this.update(kw)
        return this
    else:
        return new ρσ_dict(iterable, **kw)
ρσ_dict.prototype.__name__ = 'dict'


# These are for JavaScript users' convenience
Object.defineProperties(ρσ_dict.prototype, {
    'length': { 'get': def(): return this.jsmap.size; },
    'size': { 'get': def(): return this.jsmap.size; },
})

ρσ_dict.prototype.__len__ = def(): return this.jsmap.size
ρσ_dict.prototype.has = ρσ_dict.prototype.__contains__ = def(x): return this.jsmap.has(x)
ρσ_dict.prototype.set = ρσ_dict.prototype.__setitem__ = def(key, value): this.jsmap.set(key, value)
ρσ_dict.prototype.__delitem__ = def (key): this.jsmap.delete(key)
ρσ_dict.prototype.clear = def(): this.jsmap.clear()
ρσ_dict.prototype.copy = def(): return ρσ_dict(this)
ρσ_dict.prototype.keys = def(): return this.jsmap.keys()
ρσ_dict.prototype.values = def(): return this.jsmap.values()
ρσ_dict.prototype.items = ρσ_dict.prototype.entries = def(): return this.jsmap.entries()
ρσ_dict.prototype[ρσ_iterator_symbol] = def(): return this.jsmap.keys()

ρσ_dict.prototype.__getitem__ = def (key):
    ans = this.jsmap.get(key)
    if ans is undefined and not this.jsmap.has(key):
        raise KeyError(key + '')
    return ans

ρσ_dict.prototype.get = def (key, defval):
    ans = this.jsmap.get(key)
    if ans is undefined and not this.jsmap.has(key):
        return None if defval is undefined else defval
    return ans

ρσ_dict.prototype.set_default = def (key, defval):
    j = this.jsmap
    if not j.has(key):
        j.set(key, defval)
        return defval
    return j.get(key)

ρσ_dict.fromkeys = ρσ_dict.prototype.fromkeys = def (iterable, value=None):
    ans = ρσ_dict()
    iterator = iter(iterable)
    r = iterator.next()
    while not r.done:
        ans.set(r.value, value)
        r = iterator.next()
    return ans

ρσ_dict.prototype.pop = def (key, defval):
    ans = this.jsmap.get(key)
    if ans is undefined and not this.jsmap.has(key):
        if defval is undefined:
            raise KeyError(key)
        return defval
    this.jsmap.delete(key)
    return ans

ρσ_dict.prototype.popitem = def ():
    r = this.jsmap.entries().next()
    if r.done:
        raise KeyError('dict is empty')
    this.jsmap.delete(r.value[0])
    return r.value

ρσ_dict.prototype.update = def ():
    if arguments.length is 0:
        return
    m = this.jsmap
    iterable = arguments[0]
    if Array.isArray(iterable):
        for v'var i = 0; i < iterable.length; i++':
            m.set(iterable[i][0], iterable[i][1])
    elif v'iterable instanceof ρσ_dict':
        iterator = iterable.items()
        result = iterator.next()
        while not result.done:
            m.set(result.value[0], result.value[1])
            result = iterator.next()
    elif jstype(Map) is 'function' and v'iterable instanceof Map':
        iterator = iterable.entries()
        result = iterator.next()
        while not result.done:
            m.set(result.value[0], result.value[1])
            result = iterator.next()
    elif jstype(iterable[ρσ_iterator_symbol]) is 'function':
        iterator = iterable[ρσ_iterator_symbol]()
        result = iterator.next()
        while not result.done:
            m.set(result.value[0], result.value[1])
            result = iterator.next()
    else:
        keys = Object.keys(iterable)
        for v'var j=0; j < keys.length; j++':
            if keys[j] is not ρσ_iterator_symbol:
                m.set(keys[j], iterable[keys[j]])
    if arguments.length > 1:
        ρσ_dict.prototype.update.call(this, arguments[1])

ρσ_dict.prototype.toString = ρσ_dict.prototype.inspect = ρσ_dict.prototype.__str__ = ρσ_dict.prototype.__repr__ = def():
    entries = v'[]'
    iterator = this.jsmap.entries()
    r = iterator.next()
    while not r.done:
        entries.push(ρσ_repr(r.value[0]) + ': ' + ρσ_repr(r.value[1]))
        r = iterator.next()
    return '{' + entries.join(', ') + '}'

ρσ_dict.prototype.__eq__ = def(other):
    if not v'(other instanceof this.constructor)':
        return False
    if other.size is not this.size:
        return False
    if other.size is 0:
        return True
    iterator = other.items()
    r = iterator.next()
    while not r.done:
        x = this.jsmap.get(r.value[0])
        if (x is undefined and not this.jsmap.has(r.value[0])) or x is not r.value[1]:
            return False
        r = iterator.next()
    return True

ρσ_dict.prototype.as_object = def(other):
    ans = {}
    iterator = this.jsmap.entries()
    r = iterator.next()
    while not r.done:
        ans[r.value[0]] = r.value[1]
        r = iterator.next()
    return ans

def ρσ_dict_wrap(x):
    ans = new ρσ_dict()
    ans.jsmap = x
    return ans

v'var dict = ρσ_dict, dict_wrap = ρσ_dict_wrap'

# }}}
