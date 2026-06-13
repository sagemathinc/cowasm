DEMOS:

- https://cowasm.org \- Python using SharedArrayBuffers
- https://zython.org \- Python using Service Workers
- https://cowasm.sh \- Dash Shell with Python, Sqlite, Lua, etc., using SharedArrayBuffers

TEST STATUS:

- [![make test CI](https://github.com/sagemathinc/cowasm/actions/workflows/make-test.yml/badge.svg)](https://github.com/sagemathinc/cowasm/actions/workflows/make-test.yml)

Or Type this if you have nodejs at least version 16 installed:

```sh
~$ npx python-wasm@latest
Python 3.14.6 ... [Clang 15.0.7 ...] on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> 2 + 3
5
>>> import numpy
>>> import sympy
...
```

NOTE: On Microsoft Windows you have to enter a few times, and there is an issue with terminal echo. We are working on this.

### Try python-wasm

Try the python-wasm REPL under node.js (version at least 16):

```py
~$ npx python-wasm@latest
Python 3.14.6 ... [Clang 15.0.7 ...] on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> 2 + 3
5
>>> import sys; sys.version
'3.14.6 ... [Clang 15.0.7 ...'
>>> sys.platform
'wasi'
```

### Install python\-wasm

Install python\-wasm into your project, and try it via the library interface and the node.js terminal.

```sh
npm install python-wasm
```

Then from the nodejs REPL:

```js
~/cowasm/python/python-wasm$ node
Welcome to Node.js v19.0.0.
Type ".help" for more information.
> {syncPython, asyncPython} = require('.')
{
  syncPython: [AsyncFunction: syncPython],
  asyncPython: [AsyncFunction: asyncPython],
  default: [AsyncFunction: asyncPython]
}
> python = await syncPython(); 0;
0
> python.exec('import sys')
undefined
> python.repr('sys.version')
"'3.14.6 ... [Clang 15.0.7 ...'"
> python.exec('import numpy')
undefined
> python.repr('numpy.linspace(0, 10, num=5)')
'array([ 0. ,  2.5,  5. ,  7.5, 10. ])'
```

There is also a Python REPL that is part of python\-wasm:

```py
> python.terminal()
Python 3.14.6 ... [Clang 15.0.7 ...] on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> 2 + 3   # you can edit using readline
5
>>> input('name? ')*3
name? william  <-- I just typed "william"
'williamwilliamwilliam'
>>> import time; time.sleep(3)  # sleep works
>>> while True: pass   # ctrl+c works, but exits this terminal
> # back in node.
```

You can also use python\-wasm in your own [web applications via webpack](https://github.com/sagemathinc/cowasm/tree/main/core/webpack). In the browser, this transparently uses SharedArrayBuffers if available, and falls back to ServiceWorkers.
