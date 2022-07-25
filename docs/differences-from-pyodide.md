# Differences Between python\-wasm and Pyodide

We will collect differences between python\-wasm and [Pyodide](https://pyodide.org/) here.

NOTE: There is [another python\-wasm](https://github.com/ethanhs/python-wasm/issues/68) that is also a sort of reboot of Python\+emscripten.

## Build Tooling

python\-wasm is built mainly using [Zig](https://ziglang.org/)'s [Web Assembly support](https://ziglang.org/documentation/master/#WebAssembly), whereas Pyodide is built using [emscripten.](https://emscripten.org/)   Emscripten has been around for decades, and is over 1.2million lines of code, and emulates a huge amount of POSIX functionality that goes beyond the core wasm spec.   We reuse as much as we can from zig, wasi libraries, standard npm modules, etc., instead of the code in emscripten.

I chose Zig over emscripten after spending a lot of time learning emscripten and realizing the codebase is very bloated and dated, and zig has made [major innovations in compiler and build tooling](https://andrewkelley.me/post/zig-cc-powerful-drop-in-replacement-gcc-clang.html).  Moreover, the zig language itself is fantastic, and we're using it some for writing new compiled WASM code \(I wrote a lot of low level pure mathematics research code for [another project](https://github.com/sagemathinc/JSage/tree/main/lib/src)\).

Pyodide does not fully support building on MacOS: "[there are known issues that you must work around](https://github.com/pyodide/pyodide/blob/main/docs/development/building-from-sources.md)."

## Browser Security Model

Much of the different functionality below depends on using **cross\-site isolation**, which is recently became fully supported in Chrome, Safari, and Firefox, but which puts significant limitations on the kind of webpages that you can put python\-wasm in.  E.g., you can't combine python\-wasm with a page that also does stripe payments or uses [the Sage cell server.](https://sagecell.sagemath.org/)  They thus reflect differing design choices and priorities.

In particular, we **only** support using python\-wasm in a WebWorker with cross\-site isolation, whereas in Pyodide, using a webwork is considered ["rather error prone and confusing"](https://github.com/pyodide/pyodide/issues/1504).

## Functionality

### sleeping

\- `import time; time.sleep(10)` works in python\-wasm, without being fake or burning 100% cpu. Pyodide treats this as a no\-op.  This is thus [broken in pyodide.](https://github.com/pyodide/pyodide/issues/2354) 

We implement this using webworkers, SharedArrayBuffers and an Atomic lock.

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

This doesn't work with Pyodide, which instead just blocks.  There's a discussion [here about how this is coming to Pyodide](https://github.com/pyodide/pyodide/issues/1504#issuecomment-827556939).   Interrupting running computations doesn't work in [Jupyterlite](https://jupyter.org/try-jupyter/lab/) either; you have to restart the kernel.

### synchronous `input()`

In python\-wasm, you can use `input()` and it works as expected:

```sh
>>> input('Name: ')*3
Name: William  <--- I typed "William"
'WilliamWilliamWilliam'
```

Such blocking IO isn't quit supported in Pyodide yet, exactly.  There's a [nice talk here](https://youtu.be/-SggWFS15Do) about how to do synchronous input in Python \+ WebAssembly using Atomics and a SharedArrayBuffer, which I found after figuring this out myself, and also a [big discussion on the Pyodide issue tracker.](https://github.com/pyodide/pyodide/issues/1219) 

## Performance

### Micro Benchmarks

On trivial microbenchmarks, the two are basically the same.  Under the hood, they are both running CPython compiled using clang.

### Stack size

For some reason the recursion limit I get in python\-wasm in nodejs and the browser is 99900 on the benchmark from [https://blog.pyodide.org/posts/function\-pointer\-cast\-handling/](https://blog.pyodide.org/posts/function-pointer-cast-handling/), whereas Pyodide seems to get only around 1000 still on the same browser.  Strange.  Maybe zig results in very different code.

## Packages

- python\-wasm has the lzma module, but Pyodide doesn't, as [mentioned here](https://github.com/pyodide/pyodide/issues/1735).
- python\-wasm has the readline module \(with our repl fully supporting it\), but Pyodide doesn't, though they are [working on adding it](https://github.com/pyodide/pyodide/pull/2887).  Note that pyodide actually builds the  GPL licensed GNU readline \(which is viral and hence questionable to use from a license point of view\), whereas we build libedit, which is BSD licensed.  Also, libedit is smaller code, so maybe faster to build and takes less space \(?\).
- right now python\-wasm doesn't really have any modules, whereas Pyodide has a ton! That will change soon.

