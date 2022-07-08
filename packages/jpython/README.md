# JPython

## A Python implementation in Javascript for use by WAPython

**History:** This is **built from RapydScript-ng** that I'm playing around with modifying for use by the wapython project. See https://github.com/kovidgoyal/rapydscript-ng for some helpful documentation.

Some goals:

- **Very lightweight:** this should build from source in a few seconds, rather than **a few hours** like pypy.  The architecture of jpython is similar to pypy on some level \-\- there is a JIT \(coming from Javascript\), and JPython is an implementation of "the Python language" in Python.    I put that in quotes since we are definitely not going to implement something 100% compatible with Python.

- **Math friendly:** create something that feels [similar to Sage with its preparser](https://doc.sagemath.org/html/en/reference/repl/sage/repl/preparse.html), i.e., support ^ for exponent, \[a..b\] for making range\(a,b\+1\), and arbitrary precision integer and floating point numerical literals.  However, instead of an adhoc preparser, we built this extra functionality into the language parser/AST/generator itself, i.e., we do it properly.  Also, each sage\-like piece of functionality can be enabled via an explicit import from `__python__`, similar to how official Python enables new functionality via imports.

- The main **purpose** of JPython is as an interactive REPL, Jupyter kernel \(eventually\), and language for writing small scripts and projects.  Having a language other than Javascript is necessary because Javascript is an _not the best language_ for interactive mathematics computations, e.g., it doesn't have operator overloading, and only has single inheritance.  I love Javascript, but only for what Javascript is good for.

- Since JPython will be used for mathematical computations, **speed is important**.

## Benchmarks

The directory bench/ has a collection of microbenchmarks which all run in Python3, pypy3, and JPython, so they are useful for comparing the performance of different Python implementations.  These range from pystones to tests from mypy, computer language shootout, etc. and many others I found or made. Here's what the numbers are as of Nov 2021.  Nothing is run in parallel, and in each case this is result of running `[pypy3|python3|jpython] all.py`  in the bench directory.  The timings hardly change if you rerun the benchmarks.  We do not make any attempt to compensate for the JIT (e.g., by running a benchmark multiple times and taking the best result) -- we just run all the benchmarks one by one and add up the times.

### x86\_64 ([cocalc.com](http://cocalc.com)) Ubuntu 20.04 Linux

pypy3: 3474 ms

jpython: 6434 ms

python3.9: 11872 ms

wapython3.11: TODO

### Apple Silicon (M1 Max) MacOS native

pypy3: 2902 ms

jpython: 2960 ms

python3.10: 6200ms

wapython3.11: TODO

It's interesting that jpython and pypy3 are exactly the same speed on M1 overall for these benchmarks.  This suggests that pypy3 is less optimized for aarch64, since pypy3 is only about twice as fast as python3.10, but is usually advertised as 4x faster.  Anyway, who knows.

Please don't take the above numbers too seriously.  It's trivial with any collection of benchmarks to play around with parameters in such a way to skew them to tell a certain tail, which is why some people call this "benchmarketing".  That's NOT our goal here!  The only point is that we can use microbenchmarks to identify areas for improvement in our implementation.

### Apple Silicon (M1 Max) Ubuntu 20.04 Linux under Docker

pypy3: 1659ms

jpython: 4728 ms

python3.8: 6005 ms

Notice that pypy3 is _**much**_ faster under Linux than MacOS on the exact same hardware.  Strangely, Jpython is significantly slower under Linux than under MacOS.  The node.js versions that are being used are identical, so this is kind of surprising.

## How to try it out -- here's a little taste

### Install

Install into a temporary node.js directory:

```bash
$ mkdir wapython  # you can delete this later
$ cd wapython
$ npm init -y
$ npm install @wapython/jpython
```

### Math extensions \(like the Sage preparser\)

Use `jsage` and the compiler is modified with some more
mathematics friendly syntax.

```python
$ npx jsage
>>> 2^3
8
```

Right now only the notation [a..b] for ranges and caret for exponentiation (and
`^^` for xor) is implemented. I might implement more, though maybe that's enough.

You can get the same effect in a .py file as follows:

```python
# a.py
from __python__ import exponent
print(2^3)
```

```bash
$ npx jpython a.py
8
```

