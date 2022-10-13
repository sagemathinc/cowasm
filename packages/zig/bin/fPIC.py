#!/usr/bin/env python3
"""
Use this to build position independent C/C++ code (-fPIC) using zig.  Someday
this will be a lightweight wrapper around

zig cc -target wasm32-wasi -fPIC

but right now fPIC for wasi is not supported at all in zig.  It happens that
wasm32-emscripten does have some support though, inherited from it being
upstreamed in clang. It's the only way to make dynamic WASM modules, and those
are critical to the WaCalc project.

NOTE: there is about 0.05s - 0.1s overhead just due to using Python for
this script, and that's a lot LONGER than the zig call itself typically
takes, e.g., when things are cached.  This time adds up!  Thus we certainly
plan to rewrite this script itself in zig for speed purposes.
"""

import os, shutil, subprocess, sys, tempfile

if sys.argv[0].endswith('-cc'):
    sys.argv.insert(1, 'cc')
elif sys.argv[0].endswith('-c++'):
    sys.argv.insert(1, 'c++')

verbose = '-v' in sys.argv


def run(cmd):
    if verbose:
        print(' '.join(cmd))
    ret = subprocess.run(cmd)
    if ret.returncode:
        sys.exit(ret.returncode)


if "-E" in sys.argv:
    # preprocessor only
    run(['zig'] + sys.argv[1:])
    sys.exit(0)

ZIG_EXE = os.path.realpath(shutil.which("zig"))
ZIG_HOME = os.path.dirname(ZIG_EXE)
INCLUDE = os.path.join(ZIG_HOME, "lib", "zig", "libc", "include")

if not os.path.exists(INCLUDE):
    # On MacOS the includes are in $ZIG_HOME/lib/zig/libc (etc), for some reason
    # on Linux it is just $ZIG_HOME/lib/libc, i.e., sometimes there's an extra zig in the path.
    INCLUDE = os.path.join(ZIG_HOME, "lib", "libc", "include")

# These are the flags we need to make the -target=wasm32-emscripten actually work
# with what's provided in the zig distribution.   Note that we always set -shared,
# the target wasm32-emscripten and -fPIC, since I can't think
# of any reason to be using this script when you wouldn't have those set.
#
# The main define below makes it so the main function is always visible.

FLAGS = [
    '-shared', '-target', 'wasm32-emscripten', '-fPIC', '-isystem',
    os.path.join(INCLUDE, 'wasm-wasi-musl'), '-isystem',
    os.path.join(INCLUDE, 'generic-musl'), '-D__wasi__',
    '-D__EMSCRIPTEN_major__=3', '-D__EMSCRIPTEN_minor__=1',
    '-D__EMSCRIPTEN_tiny__=16', '-D_WASI_EMULATED_MMAN',
    '-D_WASI_EMULATED_SIGNAL', '-D_WASI_EMULATED_PROCESS_CLOCKS',
    '-D_WASI_EMULATED_GETPID', '-D__wacalc__'
]

# this is a horrendous hack.  It can be randomly broken, so watch out.
# E.g., when building python there is a random header that has
#    something.main
# which breaks. At least we make it very explicit with a "-fvisibility-main".
# If we can figure out a way with 'zig wasm-ld' to do this directly that would
# be better.
if '-fvisibility-main' in sys.argv:
    FLAGS.append('-Dmain=__attribute__((visibility("default")))main')
    sys.argv.remove('-fvisibility-main')


def is_input(arg):
    for ext in ['.c', '.cc', 'cpp', '.cxx', '.o']:  # TODO: is that it?
        if arg.endswith(ext): return True
    return False


# no_input, e.g., when querying the compiler for info about the system, e.g.,
#   wacalc-cc --print-multiarch

no_input = len([arg for arg in sys.argv if is_input(arg)]) == 0

if '-c' in sys.argv or no_input:

    # building object files; not linking, so don't have to do the extra wasm-ld step
    run(['zig'] + sys.argv[1:] + FLAGS)

else:
    # We have to create an object file then run "zig wasm-ld" explicitly,
    # since the way zig runs it is wrong for our purposes in many ways.
    # TODO: but this could definitely be fixed and upstreamed, if I can
    # ever get zig to build from source.  For now, at least, we can be sure
    # of the right behavior.
    with tempfile.NamedTemporaryFile(suffix='.o') as tmpfile:
        dot_o = tmpfile.name
        do_compile = False
        for opt in sys.argv:
            if opt.endswith('.c') or opt.endswith('.c++') or opt.endswith(
                    '.cpp') or opt.endswith('.cxx'):  # TODO: is that it?
                do_compile = True
                break

        if do_compile:
            try:
                output_index = sys.argv.index('-o') + 1
                original_output = sys.argv[output_index]
                sys.argv[output_index] = dot_o
            except:
                original_output = 'a.out'
                sys.argv.append('-o')
                sys.argv.append(dot_o)
                output_index = len(sys.argv) - 1

            sys.argv.append('-c')
            run(['zig'] + sys.argv[1:] + FLAGS)

        # Next link
        # this -s below strips debug symbols; what's the right way to do this?  Maybe -Xlinker -s?
        link = ['zig', 'wasm-ld', '--experimental-pic', '-shared']
        if do_compile:
            link.append(dot_o)
            link += ['-o', original_output]
        else:
            link += list(set([x for x in sys.argv if x.endswith('.o')]))
            if '-o' in sys.argv:
                i = sys.argv.index('-o')
                link += [sys.argv[i], sys.argv[i + 1]]

        # Pass all the Xlinker args too, e.g., "-Xlinker -s" is the only way to strip
        # since wasm-strip doesn't support fPIC yet.
        i = 0
        while i < len(sys.argv):
            if sys.argv[i] == '-Xlinker':
                i += 1
                link.append(sys.argv[i])
            i += 1
        run(link)
