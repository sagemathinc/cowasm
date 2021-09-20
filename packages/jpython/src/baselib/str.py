# vim:fileencoding=utf-8
# License: BSD
# Copyright: 2015, Kovid Goyal <kovid at kovidgoyal.net>

# globals: ρσ_kwargs_symbol, ρσ_list_decorate, ρσ_iterator_symbol, HTMLElement

# Locale can’t be changed in-flight, so we just retrieve this once.
# Sadly older node versions (< 8) don’t support formatToParts
# decimal_sep = Intl.NumberFormat() \
#     .formatToParts(1.1) \
#     .find(def(part): return part.type == 'decimal';) \
#     .value
decimal_sep = (1.1).toLocaleString()[1]

def ρσ_repr_js_builtin(x, as_array):
    ans = v'[]'
    b = '{}'
    if as_array:
        b = '[]'
        for v'var i = 0; i < x.length; i++':
            ans.push(ρσ_repr(x[i]))
    else:
        keys = Object.keys(x)
        for v'var k = 0; k < keys.length; k++':
            key = keys[k]
            ans.push(JSON.stringify(key) + ':' + ρσ_repr(x[key]))
    return b[0] + ans.join(', ') + b[1]

def ρσ_html_element_to_string(elem):
    attrs = v'[]'
    for attr in elem.attributes:
        if attr.specified:
            val = attr.value
            if val.length > 10:
                val = val[:15] + '...'
            val = JSON.stringify(val)
            attrs.push(f'{attr.name}={val}')
    attrs = (' ' + attrs.join(' ')) if attrs.length else ''
    ans = f'<{elem.tagName}{attrs}>'
    return ans

def ρσ_repr(x):
    if x is None:
        return 'None'
    if x is undefined:
        return 'undefined'
    ans = x
    if v'typeof x.__repr__ === "function"':
        ans = x.__repr__()
    elif x is True or x is False:
        ans = 'True' if x else 'False'
    elif Array.isArray(x):
        ans = ρσ_repr_js_builtin(x, True)
    elif jstype(x) is 'function':
        ans = x.toString()
    elif jstype(x) is 'object' and not x.toString:
        # Assume this is a dictionary
        ans = ρσ_repr_js_builtin(x)
    else:
        name = Object.prototype.toString.call(x).slice(8, -1)
        if "Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".indexOf(name) != -1:
            return name + '([' + x.map(def(i): return str.format('0x{:02x}', i);).join(', ') + '])'
        if jstype(HTMLElement) is not 'undefined' and v'x instanceof HTMLElement':
            ans = ρσ_html_element_to_string(x)
        else:
            ans = x.toString() if v'typeof x.toString === "function"' else x
        if ans is '[object Object]':
            # Assume this is a dictionary
            return ρσ_repr_js_builtin(x)
        try:
            ans = JSON.stringify(x)
        except:
            pass
    return ans + ''  # Ensures we return an object of type string (i.e. primitive value) rather than a String object

def ρσ_str(x):
    if x is None:
        return 'None'
    if x is undefined:
        return 'undefined'
    ans = x
    if v'typeof x.__str__ === "function"':
        ans = x.__str__()
    elif v'typeof x.__repr__ === "function"':
        ans = x.__repr__()
    elif x is True or x is False:
        ans = 'True' if x else 'False'
    elif Array.isArray(x):
        ans = ρσ_repr_js_builtin(x, True)
    elif v'typeof x.toString === "function"':
        name = Object.prototype.toString.call(x).slice(8, -1)
        if "Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".indexOf(name) != -1:
            return name + '([' + x.map(def(i): return str.format('0x{:02x}', i);).join(', ') + '])'
        if jstype(HTMLElement) is not 'undefined' and v'x instanceof HTMLElement':
            ans = ρσ_html_element_to_string(x)
        else:
            ans = x.toString()
        if ans is '[object Object]':
            # Assume this is a dictionary
            ans = ρσ_repr_js_builtin(x)
    elif jstype(x) is 'object' and not x.toString:
        # Assume this is a dictionary
        ans = ρσ_repr_js_builtin(x)
    return ans + ''  # Ensures we return an object of type string (i.e. primitive value) rather than a String object

define_str_func = def(name, func):
    ρσ_str.prototype[name] = func
    ρσ_str[name] = f = func.call.bind(func)
    if func.__argnames__:
        Object.defineProperty(f, '__argnames__', {'value':v"['string']".concat(func.__argnames__)})

ρσ_orig_split, ρσ_orig_replace = String.prototype.split.call.bind(String.prototype.split), String.prototype.replace.call.bind(String.prototype.replace)

# format()  {{{
define_str_func('format', def ():
    template = this
    if template is undefined:
        raise TypeError("Template is required")
    args = Array.prototype.slice.call(arguments)
    kwargs = {}
    if args[-1] and args[-1][ρσ_kwargs_symbol] is not undefined:
        kwargs = args[-1]
        args = args[:-1]

    explicit = implicit = False
    idx = 0
    split = ρσ_orig_split

    if ρσ_str.format._template_resolve_pat is undefined:
        ρσ_str.format._template_resolve_pat = /[.\[]/

    def resolve(arg, object):
        if not arg:
            return object
        first, arg = arg[0], arg[1:]
        key = split(arg, ρσ_str.format._template_resolve_pat, 1)[0]
        rest = arg[key.length:]
        ans = object[key[:-1]] if first is '[' else getattr(object, key)
        if ans is undefined:
            raise KeyError(key[:-1] if first is '[' else key)
        return resolve(rest, ans)

    def resolve_format_spec(format_spec):
        if ρσ_str.format._template_resolve_fs_pat is undefined:
            ρσ_str.format._template_resolve_fs_pat = /[{]([a-zA-Z0-9_]+)[}]/g
        return format_spec.replace(ρσ_str.format._template_resolve_fs_pat, def (match, key):
            if not Object.prototype.hasOwnProperty.call(kwargs, key):
                return ''
            return '' + kwargs[key]
        )

    def set_comma(ans, comma):
        if comma is not ',':
            sep = 1234
            sep = sep.toLocaleString(undefined, v'{useGrouping: true}')[1]
            ans = str.replace(ans, sep, comma)
        return ans

    def safe_comma(value, comma):
        try:
            return set_comma(value.toLocaleString(undefined, v'{useGrouping: true}'), comma)
        except:
            return value.toString(10)


    def safe_fixed(value, precision, comma):
        if not comma:
            return value.toFixed(precision)
        try:
            return set_comma(value.toLocaleString(undefined, v'{useGrouping: true, minimumFractionDigits: precision, maximumFractionDigits: precision}'), comma)
        except:
            return value.toFixed(precision)


    def apply_formatting(value, format_spec):
        if format_spec.indexOf('{') is not -1:
            format_spec = resolve_format_spec(format_spec)
        if ρσ_str.format._template_format_pat is undefined:
            ρσ_str.format._template_format_pat = ///
                ([^{}](?=[<>=^]))?([<>=^])? # fill & align
                ([-+\x20])? # sign
                (\#)? # integer base specifier
                (0)? # zero-padding
                (\d+)? # width
                ([,_])? # use a grouping (thousands) seperator
                (?:\.(\d+))? # precision
                ([bcdeEfFgGnosxX%])? # type
            ///

        try:
            fill, align, sign, fhash, zeropad, width, comma, precision, ftype = format_spec.match(ρσ_str.format._template_format_pat)[1:]
        except TypeError:
            return value
        if zeropad:
            fill = fill or '0'
            align = align or '='
        else:
            fill = fill or ' '
            align = align or '>'
        is_numeric = v'Number(value) === value'
        is_int = is_numeric and v'value % 1 === 0'
        precision = parseInt(precision, 10)
        lftype = (ftype or '').toLowerCase()

        if ftype is 'n':
            is_numeric = True
            if is_int:
                if comma:
                    raise ValueError("Cannot specify ',' with 'n'")
                value = parseInt(value, 10).toLocaleString()
            else:
                value = parseFloat(value).toLocaleString()

        elif v"['b', 'c', 'd', 'o', 'x']".indexOf(lftype) is not -1:
            value = parseInt(value, 10)
            is_numeric = True
            if not isNaN(value):
                if ftype is 'b':
                    value = v'(value >>> 0).toString(2)'
                    if fhash:
                        value = '0b' + value
                elif ftype is 'c':
                    if value > 0xFFFF:
                        code = value - 0x10000
                        value = String.fromCharCode(0xD800+(code>>10), 0xDC00+(code&0x3FF))
                    else:
                        value = String.fromCharCode(value)
                elif ftype is 'd':
                    if comma:
                        value = safe_comma(value, comma)
                    else:
                        value = value.toString(10)
                elif ftype is 'o':
                    value = value.toString(8)
                    if fhash:
                        value = '0o' + value
                elif lftype is 'x':
                    value = value.toString(16)
                    value = value.toLowerCase() if ftype is 'x' else value.toUpperCase()
                    if fhash:
                        value = '0x' + value

        elif v"['e','f','g','%']".indexOf(lftype) is not -1:
            is_numeric = True
            value = parseFloat(value)
            prec = 6 if isNaN(precision) else precision
            if lftype is 'e':
                value = value.toExponential(prec)
                value = value.toUpperCase() if ftype is 'E' else value.toLowerCase()
            elif lftype is 'f':
                value = safe_fixed(value, prec, comma)
                value = value.toUpperCase() if ftype is 'F' else value.toLowerCase()
            elif lftype is '%':
                value *= 100
                value = safe_fixed(value, prec, comma) + '%'
            elif lftype is 'g':
                prec = max(1, prec)
                exp = parseInt(split(value.toExponential(prec - 1).toLowerCase(), 'e')[1], 10)
                if -4 <= exp < prec:
                    value = safe_fixed(value, prec - 1 - exp, comma)
                else:
                    value = value.toExponential(prec - 1)
                value = value.replace(/0+$/g, '')
                if value[-1] is decimal_sep:
                    value = value[:-1]
                if ftype is 'G':
                    value = value.toUpperCase()

        else:
            if comma:
                value = parseInt(value, 10)
                if isNaN(value):
                    raise ValueError('Must use numbers with , or _')
                value = safe_comma(value, comma)
            value += ''  # Ensure we have a string
            if not isNaN(precision):
                value = value[:precision]

        value += ''  # Ensure we have a string

        if is_numeric and sign:
            nval = v'Number(value)'
            is_positive = not isNaN(nval) and nval >= 0
            if is_positive and (sign is ' ' or sign is '+'):
                value = sign + value

        def repeat(char, num):
            return v'(new Array(num+1)).join(char)'

        if is_numeric and width and width[0] is '0':
            width = width[1:]
            fill, align = '0', '='

        width = parseInt(width or '-1', 10)
        if isNaN(width):
            raise ValueError('Invalid width specification: ' + width)

        if fill and value.length < width:
            if align is '<':
                value = value + repeat(fill, width - value.length)
            elif align is '>':
                value = repeat(fill, width - value.length) + value
            elif align is '^':
                left = (width - value.length) // 2
                right = width - left - value.length
                value = repeat(fill, left) + value + repeat(fill, right)
            elif align is '=':
                if value[0] in "+- ":
                    value = value[0] + repeat(fill, width - value.length) + value[1:]
                else:
                    value = repeat(fill, width - value.length) + value
            else:
                raise ValueError('Unrecognized alignment: ' + align)

        return value

    def parse_markup(markup):
        key = transformer = format_spec = ''
        pos = 0
        state = 0
        while pos < markup.length:
            ch = markup[pos]
            if state is 0:
                if ch is '!':
                    state = 1
                elif ch is ':':
                    state = 2
                else:
                    key += ch
            elif state is 1:
                if ch is ':':
                    state = 2
                else:
                    transformer += ch
            else:
                format_spec += ch
            pos += 1
        return key, transformer, format_spec

    def render_markup(markup):
        nonlocal explicit, implicit, idx
        key, transformer, format_spec = parse_markup(markup)
        if transformer and v"['a', 'r', 's']".indexOf(transformer) is -1:
            raise ValueError('Unknown conversion specifier: ' + transformer)
        ends_with_equal = key.endsWith('=')
        if ends_with_equal:
            key = key[:-1]
        lkey = key.length and split(key, /[.\[]/, 1)[0]
        if lkey:
            explicit = True
            if implicit:
                raise ValueError('cannot switch from automatic field numbering to manual field specification')
            nvalue = parseInt(lkey)
            object = kwargs[lkey] if isNaN(nvalue) else args[nvalue]
            if object is undefined:
                if isNaN(nvalue):
                    raise KeyError(lkey)
                raise IndexError(lkey)
            object = resolve(key[lkey.length:], object)
        else:
            implicit = True
            if explicit:
                raise ValueError('cannot switch from manual field specification to automatic field numbering')
            if idx >= args.length:
                raise IndexError('Not enough arguments to match template: ' + template)
            object = args[idx]
            idx += 1
        if jstype(object) is 'function':
            object = object()
        ans = '' + object
        if format_spec:
            ans = apply_formatting(ans, format_spec)
        if ends_with_equal:
            ans = f'{key}={ans}'
        return ans


    ans = ''
    pos = 0
    in_brace = 0
    markup = ''
    while pos < template.length:
        ch = template[pos]
        if in_brace:
            if ch is '{':
                in_brace += 1
                markup += '{'
            elif ch is '}':
                in_brace -= 1
                if in_brace > 0:
                    markup += '}'
                else:
                    ans += render_markup(markup)
            else:
                markup += ch
        else:
            if ch is '{':
                if template[pos+1] is '{':
                    pos += 1
                    ans += '{'
                else:
                    in_brace = 1
                    markup = ''
            else:
                ans += ch
                if ch is '}' and template[pos+1] is '}':
                    pos += 1

        pos += 1

    if in_brace:
        raise ValueError("expected '}' before end of string")

    return ans
)
# }}}

define_str_func('capitalize', def ():
    string = this
    if string:
        string = string[0].toUpperCase() + string[1:].toLowerCase()
    return string
)

define_str_func('center', def(width, fill):
    left = (width - this.length) // 2
    right = width - left - this.length  # noqa:unused-local
    fill = fill or ' '
    return v'new Array(left+1).join(fill)' + this + v'new Array(right+1).join(fill)'
)

define_str_func('count', def(needle, start, end):
    string = this
    start = start or 0
    end = end or string.length
    if start < 0 or end < 0:
        string = string[start:end]
        start, end = 0, string.length
    pos = start
    step = needle.length
    if not step:
        return 0
    ans = 0
    while pos is not -1:
        pos = string.indexOf(needle, pos)
        if pos is not -1:
            ans += 1
            pos += step
    return ans
)

define_str_func('endswith', def(suffixes, start, end):
    string = this
    start = start or 0
    if jstype(suffixes) is 'string':
        suffixes = v'[suffixes]'
    if end is not undefined:
        string = string[:end]
    for v'var i = 0; i < suffixes.length; i++':
        q = suffixes[i]  # noqa:undef
        if string.indexOf(q, Math.max(start, string.length - q.length)) is not -1:
            return True
    return False
)

define_str_func('startswith', def(prefixes, start, end):
    start = start or 0
    if jstype(prefixes) is 'string':
        prefixes = v'[prefixes]'
    for v'var i = 0; i < prefixes.length; i++':
        prefix = prefixes[i]  # noqa:undef
        end = this.length if end is undefined else end
        if end - start >= prefix.length and prefix is this[start:start + prefix.length]:
            return True
    return False
)

define_str_func('find', def(needle, start, end):
    while start < 0:
        start += this.length
    ans = this.indexOf(needle, start)
    if end is not undefined and ans is not -1:
        while end < 0:
            end += this.length
        if ans >= end - needle.length:
            return -1
    return ans
)

define_str_func('rfind', def(needle, start, end):
    while end < 0:
        end += this.length
    ans = this.lastIndexOf(needle, end - 1)
    if start is not undefined and ans is not -1:
        while start < 0:
            start += this.length
        if ans < start:
            return -1
    return ans
)

define_str_func('index', def(needle, start, end):
    ans = ρσ_str.prototype.find.apply(this, arguments)
    if ans is -1:
        raise ValueError('substring not found')
    return ans
)

define_str_func('rindex', def(needle, start, end):
    ans = ρσ_str.prototype.rfind.apply(this, arguments)
    if ans is -1:
        raise ValueError('substring not found')
    return ans
)

define_str_func('islower', def():
    return this.length > 0 and this.toLowerCase() is this.toString()
)

define_str_func('isupper', def():
    return this.length > 0 and this.toUpperCase() is this.toString()
)

define_str_func('isspace', def():
    return this.length > 0 and /^\s+$/.test(this)
)

define_str_func('join', def(iterable):
    if Array.isArray(iterable):
        return iterable.join(this)
    ans = ''
    r = iterable.next()
    while not r.done:
        if ans:
            ans += this
        ans += r.value
        r = iterable.next()
    return ans
)

define_str_func('ljust', def(width, fill):
    string = this
    if width > string.length:
        fill = fill or ' '
        string += v'new Array(width - string.length + 1).join(fill)'
    return string
)

define_str_func('rjust', def(width, fill):
    string = this
    if width > string.length:
        fill = fill or ' '
        string = v'new Array(width - string.length + 1).join(fill)' + string
    return string
)

define_str_func('lower', def():
    return this.toLowerCase()
)

define_str_func('upper', def():
    return this.toUpperCase()
)

define_str_func('lstrip', def(chars):
    string = this
    pos = 0
    chars = chars or ρσ_str.whitespace
    while chars.indexOf(string[pos]) is not -1:
        pos += 1
    if pos:
        string = string[pos:]
    return string
)

define_str_func('rstrip', def(chars):
    string = this
    pos = string.length - 1
    chars = chars or ρσ_str.whitespace
    while chars.indexOf(string[pos]) is not -1:
        pos -= 1
    if pos < string.length - 1:
        string = string[:pos + 1]
    return string
)

define_str_func('strip', def(chars):
    return ρσ_str.prototype.lstrip.call(ρσ_str.prototype.rstrip.call(this, chars), chars)
)

define_str_func('partition', def(sep):
    idx = this.indexOf(sep)
    if idx is -1:
        return this, '', ''
    return this[:idx], sep, this[idx + sep.length:]
)

define_str_func('rpartition', def(sep):
    idx = this.lastIndexOf(sep)
    if idx is -1:
        return '', '', this
    return this[:idx], sep, this[idx + sep.length:]
)

define_str_func('replace', def(old, repl, count):
    string = this
    if count is 1:
        return ρσ_orig_replace(string, old, repl)
    if count < 1:
        return string
    count = count or Number.MAX_VALUE
    pos = 0
    while count > 0:
        count -= 1
        idx = string.indexOf(old, pos)
        if idx is -1:
            break
        pos = idx + repl.length
        string = string[:idx] + repl + string[idx + old.length:]
    return string
)

define_str_func('split', def(sep, maxsplit):
    if maxsplit is 0:
        return [this]
    split = ρσ_orig_split
    if sep is undefined or sep is None:
        if maxsplit > 0:
            ans = split(this, /(\s+)/)
            extra = ''
            parts = v'[]'
            for v'var i = 0; i < ans.length; i++':
                if parts.length >= maxsplit + 1:
                    extra += ans[i]
                elif i % 2 is 0:
                    parts.push(ans[i])  # noqa:undef
            parts[-1] += extra
            ans = parts
        else:
            ans = split(this, /\s+/)
    else:
        if sep is '':
            raise ValueError('empty separator')
        ans = split(this, sep)
        if maxsplit > 0 and ans.length > maxsplit:
            extra = ans[maxsplit:].join(sep)
            ans = ans[:maxsplit]
            ans.push(extra)
    return ρσ_list_decorate(ans)
)

define_str_func('rsplit', def(sep, maxsplit):
    if not maxsplit:
        return ρσ_str.prototype.split.call(this, sep)
    split = ρσ_orig_split
    if sep is undefined or sep is None:
        if maxsplit > 0:
            ans = v'[]'
            is_space = /\s/
            pos = this.length - 1
            current = ''
            while pos > -1 and maxsplit > 0:
                spc = False
                ch = this[pos]
                while pos > -1 and is_space.test(ch):
                    spc = True
                    ch = v'this[--pos]'
                if spc:
                    if current:
                        ans.push(current)
                        maxsplit -= 1
                    current = ch
                else:
                    current += ch
                pos -= 1
            ans.push(this[:pos + 1] + current)
            ans.reverse()
        else:
            ans = split(this, /\s+/)
    else:
        if sep is '':
            raise ValueError('empty separator')
        ans = v'[]'
        pos = end = this.length
        while pos > -1 and maxsplit > 0:
            maxsplit -= 1
            idx = this.lastIndexOf(sep, pos)
            if idx is -1:
                break
            ans.push(this[idx + sep.length:end])
            pos = idx - 1
            end = idx
        ans.push(this[:end])
        ans.reverse()
    return ρσ_list_decorate(ans)
)

define_str_func('splitlines', def(keepends):
    split = ρσ_orig_split
    if keepends:
        parts = split(this, /((?:\r?\n)|\r)/)
        ans = v'[]'
        for v'var i = 0; i < parts.length; i++':
            if i % 2 is 0:
                ans.push(parts[i])
            else:
                ans[-1] += parts[i]  # noqa:undef
    else:
        ans = split(this, /(?:\r?\n)|\r/)
    return ρσ_list_decorate(ans)
)

define_str_func('swapcase', def():
    ans = v'new Array(this.length)'
    for v'var i = 0; i < ans.length; i++':
        a = this[i]
        # We dont care about non-BMP chars as they are not cased anyway
        b = a.toLowerCase()
        if a is b:
            b = a.toUpperCase()
        ans[i] = b  # noqa:undef
    return ans.join('')
)

define_str_func('zfill', def(width):
    string = this
    if width > string.length:
        string = v'new Array(width - string.length + 1).join("0")' + string
    return string
)

ρσ_str.uchrs = def(string, with_positions):
    # Return iterator over unicode chars in string. Will yield the unicode
    # replacement char U+FFFD for broken surrogate pairs
    return {
        '_string': string,
        '_pos': 0,
        ρσ_iterator_symbol: def(): return this;,
        'next' : def():
            length = this._string.length
            if this._pos >= length:
                return {'done': True}
            pos = this._pos
            value = v'this._string.charCodeAt(this._pos++)'
            ans = '\ufffd'
            if 0xD800 <= value <= 0xDBFF:
                if this._pos < length:
                    # high surrogate, and there is a next character
                    extra = v'this._string.charCodeAt(this._pos++)'
                    if (extra & 0xDC00) is 0xDC00: # low surrogate
                        ans = String.fromCharCode(value, extra)
            elif (value & 0xDC00) is not 0xDC00: # not a low surrogate
                ans = String.fromCharCode(value)
            if with_positions:
                return {'done':False, 'value':[pos, ans]}
            else:
                return {'done':False, 'value':ans}
    }

ρσ_str.uslice = def(string, start, end):
    items = v'[]'
    iterator = ρσ_str.uchrs(string)
    r = iterator.next()
    while not r.done:
        items.push(r.value)
        r = iterator.next()
    return items[start or 0:items.length if end is undefined else end].join('')

ρσ_str.ulen = def(string):
    iterator = ρσ_str.uchrs(string)
    r = iterator.next()
    ans = 0
    while not r.done:
        r = iterator.next()
        ans += 1
    return ans

ρσ_str.ascii_lowercase = 'abcdefghijklmnopqrstuvwxyz'
ρσ_str.ascii_uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
ρσ_str.ascii_letters   = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
ρσ_str.digits   = '0123456789'
ρσ_str.punctuation = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'
ρσ_str.printable = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~ \t\n\r\x0b\x0c'
ρσ_str.whitespace   = ' \t\n\r\x0b\x0c'

v'define_str_func = undefined'
v'var str = ρσ_str, repr = ρσ_repr'
