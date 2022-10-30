#!/usr/bin/env python3
"""
Use this script to run wasm-opt on all the wasm binaries in a directory tree.
This may take a while, but is useful to do before publication, in order to
reduce the size of wasm files and possibly make them faster.

USAGE:

   cowasm-opt [path] ...

It will walk the path's and identify all the wasm binaries, where a file is
considered a wasm executable if:

  - it is executable or ends with .so (python extension module), and
  - the file contents start with b'\x00asm'

In particular, we do not consider the filename extension.

OBSERVATIONS:

- For our static kernel, wasm-opt decreases the size by 11%.
- For most of our dynamic libraries (e.g., python extension modules),
  wasm-opt decreases the size by less than 3%.
  For numpy it actually makes it larger (?).
- For python.wasm the size decreases by 5% before compression, but
  after compression it is only 1.3%.
- There is no observable impact on raw compute speed, e.g., as
  measured by our benchmarks module.

Conclusion: for now let's just use this on the kernel and nothing else.
The tradeoff is slightly increased build times and the potential of subtle
bugs being introduced in published modules.  I don't know to what extent
I should trust binaryen's optimizer, but I don't blindly trust optimizers.

TODO: another thing to investigate is implementing setjmp/longjmp using
asyncify, which is part of cowasm-opt.  For that I think we would asyncify
the kernel and whatever dynamic library actually needs this, and having
this script around will be useful.
"""

import os, shutil, stat, subprocess, sys


def run(cmd):
    print(' '.join(cmd))
    ret = subprocess.run(cmd)
    if ret.returncode:
        sys.exit(ret.returncode)


def wasm_opt(file_wasm):
    # Run "wasm-opt --enable-mutable-globals -O ..." on the given wasm file, "in place"
    try:
        file_wasm_out = file_wasm + '.out'
        run([
            'wasm-opt', '--enable-mutable-globals', '-O', file_wasm, '-o',
            file_wasm_out
        ])
        st = os.stat(file_wasm)
        shutil.move(file_wasm_out, file_wasm)
        os.chmod(file_wasm, st.st_mode)  # set permissions back
    finally:
        # ensure output file is cleaned up no matter what.
        if os.path.exists(file_wasm_out):
            try:
                os.unlink(file_wasm_out)
            except:
                pass


def is_wasm_binary(target):
    if not target.endswith('.so'):
        st = os.stat(target)
        if not (st.st_mode & stat.S_IXUSR):
            return False
    return open(target, "rb").read(4) == b'\x00asm'


def find_wasm_files(path):
    # Find all wasm binaries in all subdirectories of path.
    v = []
    if not os.path.isdir(path):
        if is_wasm_binary(path):
            v.append(path)
        return v
    for (dirpath, dirnames, filenames) in os.walk(path):
        for filename in filenames:
            p = os.path.join(dirpath, filename)
            if is_wasm_binary(p):
                v.append(p)
    return v


# make it easier to do in parallel.


def wasm_opt_all(targets):
    for target in targets:
        wasm_opt(target)


def wasm_opt_all_parallel(targets):
    if len(targets) == 0:
        return
    import asyncio
    loop = asyncio.new_event_loop()

    def background(f):

        def wrapped(*args, **kwargs):
            return loop.run_in_executor(None, f, *args, **kwargs)

        return wrapped

    @background
    def f(target):
        return wasm_opt(target)

    looper = asyncio.gather(*[f(target) for target in targets])
    loop.run_until_complete(looper)


def main():
    if len(sys.argv) <= 1:
        print("Usage: %s [path] ..." % sys.argv[0])
        print("Run wasm-opt on all wasm files in the path(s).")
        sys.exit(1)

    targets = []
    for path in sys.argv[1:]:
        targets += find_wasm_files(path)
    print(' '.join(targets))
    wasm_opt_all_parallel(targets)


if __name__ == '__main__':
    main()
