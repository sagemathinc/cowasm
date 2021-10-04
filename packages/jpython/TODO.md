# TODO List of little things that I want to change in JPython

## Not Done
---


[ ] source maps.

---

[ ] The REPL doesn't let you use any of the string modifiers are variables, sort of. In particular, for any letter in `vrufVRUF` (defined in `tokenizer.py`) in the repl we have:

```py
>>> f = 10
>>> f
[Object: null prototype] {}
>>> print(f)
10
```

---

[ ] eval.  The eval function is **Javascript** eval, rather than running our Python compiler, then evaling that, which makes way more sense.
```py
>>> eval('for(i=0;i<10;i++){console.log(i)}')
0
1
...
```

## Done

[x] sage preparser style mode that makes `^` be exponentiation. Have a bin script `jsage` (instead of `jpython`) that enables this mode everywhere.

- repl has --jsage mode for interaction with everything enabled, but only for interactive use
- for files, instead of .sage files, we have .py files with lines like this at the top:

```py
from __python__ import exponent
```

that switch the parsing mode. This way we can use all the standard py tooling,
and in theory someday change the official python parser to support our custom
syntax, while making it much clearer when we're using our special language and
how, and how to turn on only parts of it. It's also easier to test with
our existing infrastructure. This also makes it possible for a user to write
code that can work in official Python or "preparsed Python".

Things I might want: exponents, [a..b] syntax for ranges (it's a PEP), arbitrary precision integers (wrapping GMP rather than BigInt, since BigInt is way too slow and no rationals).

---


[x] Alternative to raw "v"-strings. These are not valid Python, hence they break all Python tooling (e.g., syntax highlighting, formatting, running the module under real Python, etc.). Instead, replace them by a function call with a normal string. With v-strings you can't even load the code into normal Python since it gets stopped at the parsing stage. It's much better if it is at runtime for normal Python, so you can run the same code with both jpython and normal Python. Example, it would be nice to make something like this possible:

```py
def hello():
    try:
        v"console.log('hello world')"
    except:
        print('hello world')
```

The simplest solution would be this:

```py
def hello():
    try:
        javascript("console.log('hello world')")
    except:
        print('hello world')
```

There could even be a Python fallback to actually try to run the Javascript in some cases.

Another possibility could be to use Python raw strings with some special interpretation of those strings, e.g., `v"` --&gt; r`"something`

```py
r"js:console.log('hello world')"
```

I like using raw since it discourages using formatting characters in the string or thinking javascript(...) is a normal function call with a string -- it isn't since the contents go straight to the output.

Another possibility would be a unicode character to make this even more obfuscated...

```py
r"ρ:console.log('hello world')"
```

Nope that's horrible. It could just be more verbose -- e.g., verbatim: `r"verbatim:console.log"`

Oh, I know, make it like an IPython magic:

```by
r"%js for(i=0;i<10;i++){console.log('blah')}"
```

---

[x] Implement + for lists -- which falls back to string concat right now :frowning:

```py
>>> [1,2,3] + [4,5,6]
[1, 2, 3][4, 5, 6]
```
