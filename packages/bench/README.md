# Python Microbenchmarks

After building everything in the entire python\-wasm install, you can do each of the following to see how the speed of the wasm\-compiled python compares to the exact same native python on your platform:

```sh
make wasm
make wasm-debug
make native
```

You can also try two JIT compiled variants of Python, which are much faster, but have their own limitations:

```sh
make pylang
make pypy3
```

For pypy3, you have to [install pypy yourself](https://www.pypy.org/download.html).  On the other hand, pylang gets [downloaded automatically from npm](https://www.npmjs.com/package/pylang).

## What is this?

This is a collection of microbenchmarks of the core Python language. 
You can run any particular benchmark foo.py by typing:

```sh
$ your-python-interpreter src/foo.py
```

Many of these benchmarks are silly microbenchmarks that can be optimized
out with an optimizing compiler, but others are kind of interesting, like
the xgcd's with numbers.

You can run all of the benchmarks via

```sh
$ your-python-interpreter src/all.py
```

---

NOTE: I wonder if we can also use https://github.com/python/pyperformance, and/or contribute to that?