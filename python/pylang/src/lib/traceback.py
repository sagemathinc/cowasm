# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
# globals: ρσ_str, ρσ_last_exception


def _get_internal_traceback(err):
    if isinstance(err, Exception) and err.stack:
        lines = ρσ_str.splitlines(err.stack)
        final_lines = v'[]'
        found_sentinel = False
        for i, line in enumerate(lines):
            sline = ρσ_str.strip(line)
            if i is 0:
                final_lines.push(line)
                continue
            if found_sentinel:
                final_lines.push(line)
                continue
            # These two conditions work on desktop Chrome and Firefox to identify the correct
            # line in the traceback.
            if sline.startsWith('at new ' + err.name) or sline.startsWith(err.name + '@'):
                found_sentinel = True
        return final_lines.join('\n')
    return err and err.stack

def format_exception(exc, limit):
    if jstype(exc) is 'undefined':
        exc = ρσ_last_exception
    if not isinstance(exc, Error):
        if exc and exc.toString:
            return [exc.toString()]
        return []
    tb = _get_internal_traceback(exc)
    if tb:
        lines = ρσ_str.splitlines(tb)
        e = lines[0]
        lines = lines[1:]
        if limit:
            lines = lines[:limit+1] if limit > 0 else lines[limit:]
        lines.reverse()
        lines.push(e)
        lines.insert(0, 'Traceback (most recent call last):')
        return [l+'\n' for l in lines]
    return [exc.toString()]

def format_exc(limit):
    return format_exception(ρσ_last_exception, limit).join('')

def print_exc(limit):
    print(format_exc(limit))

def format_stack(limit):
    stack = Error().stack
    if not stack:
        return []
    lines = str.splitlines(stack)[2:]
    lines.reverse()
    if limit:
        lines = lines[:limit+1] if limit > 0 else lines[limit:]
    return [l + '\n' for l in lines]

def print_stack(limit):
    print(format_stack(limit).join(''))
