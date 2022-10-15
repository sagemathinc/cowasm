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

NOTE: Often -fPIC is the *default* these days.  See the discussion here:
https://stackoverflow.com/questions/20637310/does-one-still-need-to-use-fpic-when-compiling-with-gcc#:~:text=You%20never%20needed%20to%20generate,or%20set%20it%20by%20default.


NOTE: Another change -- if -g isn't in the options or the optimization level isn't set (or is -O0),
then we do the equivalent of this (but directly in the wasm-ld call):

     -Xlinker --strip-all -Xlinker -compress-relocations

automatically when compiling code to save space, but make things less debugabble.
IMPORTANT: wasm-strip doesn't work with -fPIC libraries.  Thus you must build them
stripped in the first place.
"""

import os, shutil, subprocess, sys, tempfile

verbose = False  # default
# use -V for super verbose, so also zig/clang is verbose
if '-V' in sys.argv:
    print(' '.join(sys.argv))
    verbose = True
    sys.argv.remove('-V')
    sys.argv.append('-v')  # this then goes to clang/zig to make it very verbose
elif '-v' in sys.argv:
    # use -v for just us being verbose
    print(' '.join(sys.argv))
    verbose = True
    sys.argv.remove('-v')


if sys.argv[0].endswith('-cc'):
    sys.argv.insert(1, 'cc')
elif sys.argv[0].endswith('-c++'):
    sys.argv.insert(1, 'c++')
sys.argv.insert(2, '-target')
sys.argv.insert(3, 'wasm32-wasi')
sys.argv[0] = 'zig'

def run(cmd):
    if verbose:
        print(' '.join(cmd))
    ret = subprocess.run(cmd)
    if ret.returncode:
        sys.exit(ret.returncode)


# This is a horrendous hack to make the main function visible without having to
# change the source code of every program we build.  It can be randomly broken, so watch out.
# E.g., when building python there is a random header that has
#    something.main
# which breaks. At least we make it very explicit with a "-fvisibility-main".
# If we can figure out a way with 'zig wasm-ld' to do this directly that would
# be better.
if '-fvisibility-main' in sys.argv:
    use_main_hack = True
    sys.argv.remove('-fvisibility-main')
else:
    use_main_hack = False

if "-E" in sys.argv:
    # preprocessor only
    run(sys.argv)
    sys.exit(0)

if '--print-multiarch' in sys.argv:
    # checking architecture (do this before FLAGS below or it ends up with wasm32-emscripten)
    run(sys.argv)
    sys.exit(0)

# https://retrocomputing.stackexchange.com/questions/20281/why-didnt-c-specify-filename-extensions
SOURCE_EXTENSIONS = set(['.c', '.c++', '.cpp', '.cxx', '.cc', '.cp'])


def is_source(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in SOURCE_EXTENSIONS


# TODO: I should probably just change to "if doesn't have -fPIC then use normal compiler".
# This will be a lot of work, so wait until finish redoing cpython first!

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
    '-D_WASI_EMULATED_GETPID', '-D__cowasm__'
]

if use_main_hack:
    FLAGS.append('-Dmain=__attribute__((visibility("default")))main')


def is_debug():
    for flag in sys.argv:
        # any debug flag
        if flag.startswith('-g'):
            return True
    # opt flags in reverse order, since only last matters.
    for flag in reversed(sys.argv):
        if flag.startswith('-O'):
            return flag == '-O0'
    # No -O flag at all defaults to -O0.
    return True


def is_input(arg):
    for ext in ['.c', '.cc', 'cpp', '.cxx', '.o']:  # TODO: is that it?
        if arg.endswith(ext): return True
    return False


# no_input, e.g., when querying the compiler for info about the system, e.g.,
#   cowasm-cc --print-multiarch

no_input = len([arg for arg in sys.argv if is_input(arg)]) == 0

# COMPILE ONLY?
if '-c' in sys.argv or no_input:

    # building object files from source, so don't have to do the extra wasm-ld step
    # below, which is really complicated
    run(sys.argv + FLAGS)
    sys.exit(0)


# MAYBE COMPILE, and definitely ALSO LINK (explicitly calling "zig wasm-ld")

def is_unsupported_lib(arg):
    return arg in ['-lc', '-lm'] or arg.startswith('-lwasi-emulated')

def remove_unsupported_libs(argv):
    # -lc doesn't exist for target=wasm32-emscripten on zig!.
    # if we add more to our core, may similarly remove here!
    # Also none of the -lwasi-emulated stuff exists either.
    # These are all done in the core libc anyways.
    return [arg for arg in argv if not is_unsupported_lib(arg)]

def remove_linker_args(argv):
    i = 0
    link = []
    argv0 = []
    while i < len(argv):
        if argv[i] == '-Xlinker':
            # -Xlinker arg
            i += 1
            link.append(argv[i])
            i += 1
            continue
        if argv[i] == '-L':
            # -L path
            link.append(argv[i])
            i += 1
            link.append(argv[i])
            i += 1
            continue
        if argv[i].startswith('-L') or argv[i].startswith('-l'):
            # -Lpath or -llib
            link.append(argv[i])
            i += 1
            continue
        argv0.append(argv[i])
        i += 1
    return argv0, remove_unsupported_libs(link)


# We have to create an object file then run "zig wasm-ld" explicitly,
# since the way zig runs it is wrong for our purposes in many ways.
# TODO: but this could definitely be fixed and upstreamed, if I can
# ever get zig to build from source.  For now, at least, we can be sure
# of the right behavior.
with tempfile.NamedTemporaryFile(suffix='.o') as tmpfile:
    dot_o = tmpfile.name
    do_compile = False
    for opt in sys.argv:
        if is_source(opt):
            do_compile = True
            break

    sys.argv, linker_sys_argv = remove_linker_args(sys.argv)

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
        run(sys.argv + FLAGS)

    # Next link
    link = ['zig', 'wasm-ld', '--experimental-pic', '-shared'] + linker_sys_argv
    if not is_debug():
        link.append('--strip-all')
        # Note that we have to do this '--compress-relocations' here, since it is
        # ignored if put in Xliner args.
        link.append('--compress-relocations')

    if do_compile:
        link.append(dot_o)
        link += ['-o', original_output]
    else:
        link += list(
            set([x for x in sys.argv if x.endswith('.o') or x.endswith('.a')]))
        if '-o' in sys.argv:
            i = sys.argv.index('-o')
            link += [sys.argv[i], sys.argv[i + 1]]

    run(link)
    os.system("cp %s /tmp/a.o"%dot_o)
