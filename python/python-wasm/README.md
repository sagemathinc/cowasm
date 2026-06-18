# Python\-Wasm: WebAssembly Python for Servers and Browsers

This is a component of [CoWasm](https://cowasm.org). 

URL: https://github.com/sagemathinc/cowasm 

DEMOS:

- https://cowasm.org \(uses Atomics and SharedArrayBuffers\)
- https://zython.org \(uses Service Workers\)

## Usage

You must use node v16 or newer.

```py
~/$ mkdir cowasm; cd cowasm
~/cowasm $ npm init -y
~/cowasm $ npm install python-wasm
~/cowasm $ node
Welcome to Node.js v19.0.0.
Type ".help" for more information.
> {syncPython, asyncPython} = require('python-wasm')
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
~/cowasm $ npx python-wasm
Python 3.14.6 ... [Clang 15.0.7 ...] on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> 2 + 3   # you can edit using readline
5
>>> import numpy as np
>>> np.linspace(0, 10, num=5)
array([ 0. ,  2.5,  5. ,  7.5, 10. ])
>>> import sympy
>>> import networkx
>>> input('name? ')*3
name? william  <-- I just typed "william"
'williamwilliamwilliam'
>>> import time; time.sleep(3)  # sleep works
>>> while True: pass   # ctrl+c works
```

You can also use python-wasm in your web applications.  See

- https://github.com/sagemathinc/cowasm-python/tree/main/packages/browser
- https://github.com/sagemathinc/cowasm-python/tree/main/packages/terminal
