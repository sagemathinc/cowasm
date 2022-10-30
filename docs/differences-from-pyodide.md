# Differences Between python\-wasm and Pyodide

We will collect differences between python\-wasm and [Pyodide](https://pyodide.org/) here.

NOTE: I discovered that there is [another python\-wasm](https://github.com/ethanhs/python-wasm/issues/68) that is also a sort of reboot of Python\+emscripten.

## Build Tooling

python\-wasm is built mainly using [Zig](https://ziglang.org/)'s [Web Assembly support](https://ziglang.org/documentation/master/#WebAssembly), whereas Pyodide is built using [emscripten.](https://emscripten.org/) Emscripten has been around for decades, and is over 1.2million lines of code, and emulates a huge amount of POSIX functionality that goes beyond the core wasm spec. We reuse as much as we can from zig, wasi libraries, standard npm modules, etc., instead of the code in emscripten.

I chose Zig over emscripten after spending a lot of time learning emscripten and realizing the codebase is very bloated and dated, and zig has made [major innovations in compiler and build tooling](https://andrewkelley.me/post/zig-cc-powerful-drop-in-replacement-gcc-clang.html). Moreover, the zig language itself is fantastic, and we're using it some for writing new compiled WASM code \(I wrote a lot of low level pure mathematics research code for [another project](https://github.com/sagemathinc/JSage/tree/main/lib/src)\).

Pyodide does not fully support building on MacOS: "[there are known issues that you must work around](https://github.com/pyodide/pyodide/blob/main/docs/development/building-from-sources.md)."

## Critical Usability Functionality: sleep, control\+c interrupts, and synchronous input

Pyodide tends to be missing some key functionality: sleep, control\+c interrupts, synchronous input. For the browser, we implement all of these in python\-wasm in the standard ways using WebWorkers, and fully support **both of the following:**

- Use _SharedArrayBuffers and Atomic_ locks: this is used automatically if your webserver has [cross\-origin isolation](https://web.dev/cross-origin-isolation-guide) enabled, or

- Use _synchronous XMLHttpRequest with a ServiceWorker,_ if cross\-origin isolation headers are not set.  The drawback is sometimes the page has to be refreshed to enable the service worker, and it doesn't work in private browsing mode on Firefox, or in an iframe with Firefox.

No extra configuration of python\-wasm is needed to use either of these. In the browser, CoWasm uses Atomics if possible; if not, it creates a service worker and uses that.

There are _**two additional approaches**_ to this problem:

- Server only: if you're running on a server, e.g., under node.js, you can write extension code in Zig to sleep. I've done this in posix\-node; see the sleep function in packages/posix\-node/src/index.ts.

- Use Asyncify. Watch Alon's [youtube talk](https://youtu.be/qQOP6jqZqf8), [blog
  post](https://kripken.github.io/blog/wasm/2019/07/16/asyncify.html), the
  [official
  docs](https://github.com/WebAssembly/binaryen/blob/main/src/passes/Asyncify.cpp),
  and [this other blog
  post](https://web.dev/asyncify/#bridging-the-gap-with-asyncify). I have not
  fully investigated this option, except that: 
    - It makes kernel.wasm over 50% larger.
    - It takes **a very long time** to run asyncify on python.wasm, e.g.,
  with the wasm version of binaryen I gave up after 10\+ minutes. The native
  version took 16 minutes to build successfully. The asyncified version takes 42%
  longer to run my benchmark suite \(40.5 seconds instead of 28 seconds\). So
  asyncify is not a realistic option for a program as complicated as Python, at
  least not without more work.

For node.js by default CoWasm uses posix-node if possible, or falls back to atomics, since they are always supported in node.

REFERENCE: See [this Pyodide ticket](https://github.com/pyodide/pyodide/issues/1503) for a discussion of the status of some of these approaches in Pyodide.

### sleeping

\- `import time; time.sleep(10)` works in python\-wasm, without being fake or burning 100% cpu. Pyodide treats this as a no\-op. This is thus [broken in pyodide.](https://github.com/pyodide/pyodide/issues/2354)

### control\+c / interrupt signal

In python\-wasm, you can launch code that has an infinite blocking loop, e.g.,

```py
s = 0
while True: s += 1
```

then hit control\+c and it interrupts the loop:

```py
>>> s = 0
>>> while True: s += 1
...
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
KeyboardInterrupt
>>> print(s)
9346028
```

This doesn't "trivially" just work with Pyodide, which instead just blocks. There's a discussion [here about how this is coming to Pyodide,](https://github.com/pyodide/pyodide/issues/1504#issuecomment-827556939) and [maybe it is already supported in the same way](https://pyodide.org/en/stable/usage/keyboard-interrupts.html). Interrupting running computations doesn't work in [Jupyterlite](https://jupyter.org/try-jupyter/lab/) yet though; you have to restart the kernel.

### control\+d \- end of file

You can start the REPL, then type `help()` to get interactive help, use it, hit control\+d and exit out one level, etc. In Pyodide you immediately get an alert, then when you exit that, see the help page but are exited out, so the whole help system is not accessible.

```
Python 3.11.0b3 (main, Jul 23 2022, 14:11:32) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 81f0e6c5b902ead84753490d on wasi
Type "help", "copyright", "credits" or "license" for more information.
>>> help()

Welcome to Python 3.11's help utility!

If this is your first time using Python, you should definitely check out
the tutorial on the internet at https://docs.python.org/3.11/tutorial/.

Enter the name of any module, keyword, or topic to get help on writing
Python programs and using Python modules.  To quit this help utility and
return to the interpreter, just type "quit".

To get a list of available modules, keywords, symbols, or topics, type
"modules", "keywords", "symbols", or "topics".  Each module also comes
with a one-line summary of what it does; to list the modules whose name
or summary contain a given string such as "spam", type "modules spam".

help> ^D  <-- I typed "control+d"
You are now leaving help and returning to the Python interpreter.
If you want to ask for help on a particular object directly from the
interpreter, you can type "help(object)".  Executing "help('string')"
has the same effect as typing a particular string at the help> prompt.
>>>
```

I think that help fully working is important, since typing "help" is literally the first thing you're told to do!

### synchronous `input()`

In python\-wasm, you can use `input()` and it works as expected:

```sh
>>> input('Name: ')*3
Name: William  <--- I typed "William"
'WilliamWilliamWilliam'
```

Such blocking IO isn't quit supported in Pyodide yet, exactly. There's a [nice talk here](https://youtu.be/-SggWFS15Do) about how to do synchronous input in Python \+ WebAssembly using Atomics and a SharedArrayBuffer, which I found after figuring this out myself, and also a [big discussion on the Pyodide issue tracker.](https://github.com/pyodide/pyodide/issues/1219)

For the python\-wasm REPL we have no choice but to support this "synchronous IO" functionality, since the REPL is _literally_ the Python repl with readline \(actually [editline](https://github.com/troglobit/editline) for license and size reasons\), and hence once the REPL starts, everything in the WebWorker is synchronous and under the control of the Python main loop. This is completely different than [the pyodide repl](https://pyodide.org/en/stable/console.html) which doesn't use readline, and calls a function after composing input in Javascript.

## Performance

### Micro Benchmarks

On some trivial microbenchmarks, python\-wasm and Pyodide are mostly comparable. Under the hood, they are both running CPython compiled using clang. That said, many things are twice as fast in python\-wasm, because it uses Python 3.11, whereas Pyodide is still using Python 3.10, and there are major performance leaps in Python 3.11. Also, in python\-wasm, we build using `--with-pymalloc` which seems to enhance performance.

### Stack size

For some reason the recursion limit I get in python\-wasm in nodejs and the browser is 99900 on the benchmark from [https://blog.pyodide.org/posts/function\-pointer\-cast\-handling/](https://blog.pyodide.org/posts/function-pointer-cast-handling/), whereas Pyodide seems to get only around 1000 still on the same browser. Strange. Maybe zig results in very different code. That said, the python\-wasm stack size is set to 700 by default, since when running the cpython test suite on node.js a couple of tests failed with a larger stack size.

## Packages

- python\-wasm has the lzma module, but Pyodide doesn't, as [mentioned here](https://github.com/pyodide/pyodide/issues/1735).
- python\-wasm has the readline module \(with our repl fully supporting it\), but Pyodide doesn't, though they are [working on adding it](https://github.com/pyodide/pyodide/pull/2887). Note that pyodide actually builds the GPL licensed GNU readline \(which is viral and hence questionable to use from a license point of view\), whereas we build libedit, which is BSD licensed. Also, libedit is smaller code, so maybe faster to build and takes less space.
- right now python\-wasm doesn't really have any interesting data science modules, whereas Pyodide has a ton! python\-wasm does have its own dynamic linker [dylink](https://www.npmjs.com/package/dylink), which is the key to supporting interesting extension modules.

