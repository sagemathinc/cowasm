# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
from __python__ import hash_literals

def quoted_string(x):
    return '"' + x.replace(/\\/g, '\\\\').replace(/"/g, r'\"').replace(/\n/g, '\\n') + '"'

def render_markup(markup):
    pos, key = 0, ''
    while pos < markup.length:
        ch = markup[pos]
        if ch is '!' or ch is ':':
            break
        key += ch
        pos += 1
    fmtspec = markup[pos:]
    prefix = ''
    if key.endsWith('='):
        prefix=key
        key = key[:-1]
    return 'ρσ_str.format("' + prefix + '{' + fmtspec + '}", ' + key + ')'


def interpolate(template, raise_error):
    pos = in_brace = 0
    markup = ''
    ans = v'[""]'
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
                    ans.push(v'[markup]')
                    ans.push('')
            else:
                markup += ch
        else:
            if ch is '{':
                if template[pos+1] is '{':
                    pos += 1
                    ans[-1] += '{'
                else:
                    in_brace = 1
                    markup = ''
            elif ch is '}':
                if template[pos+1] is '}':
                    pos += 1
                    ans[-1] += '}'
                else:
                    raise_error("f-string: single '}' is not allowed")
            else:
                ans[-1] += ch

        pos += 1

    if in_brace:
        raise_error("expected '}' before end of string")

    if ans[-1] is '+':
        ans[-1] = ''
    for v'var i = 0; i < ans.length; i++':
        if jstype(ans[i]) is 'string':
            ans[i] = quoted_string(ans[i])
        else:
            ans[i] = '+' + render_markup.apply(this, ans[i]) + '+'
    return ans.join('')
