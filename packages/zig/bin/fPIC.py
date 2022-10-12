#!/usr/bin/env python3
"""
Use this to build position independent C/C++ code (-fPIC) using zig.  Someday
this will be a lightweight wrapper around

zig cc -target wasm32-wasi -fPIC

but right now fPIC for wasi is not supported at all in zig.  It happens that
wasm32-emscripten does have some support though, inherited from it being
upstreamed in clang. It's the only way to make dynamic WASM modules, and those
are critical to the WasZee project.

NOTE: there is about 0.05s - 0.1s overhead just due to using Python for
this script, and that's a lot LONGER than the zig call itself typically
takes, e.g., when things are cached.  This time adds up!  Thus we certainly
plan to rewrite this script itself in zig for speed purposes.
"""

import os, shutil, subprocess, sys

if sys.argv[0].endswith('-cc'):
    sys.argv.insert(1,'cc')
elif sys.argv[0].endswith('-c++'):
    sys.argv.insert(1,'c++')

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
    os.path.join(INCLUDE,
                 'generic-musl'), '-D__wasi__', '-D__EMSCRIPTEN_major__=3',
    '-D__EMSCRIPTEN_minor__=1', '-D__EMSCRIPTEN_tiny__=16',
    '-D_WASI_EMULATED_MMAN', '-D_WASI_EMULATED_SIGNAL',
    '-D_WASI_EMULATED_PROCESS_CLOCKS', '-D_WASI_EMULATED_GETPID',

]

# this is a horrendous hack.  It can be randomly broken, so watch out.
# E.g., when building python there is a random header that has
#    something.main
# which breaks.  Fortunately, none of that code needs to expose main,
# and all the compile lines explicitly have -fvisibility=hidden.
if '-fvisibility=hidden' not in sys.argv:
    FLAGS.append('-Dmain=__attribute__((visibility("default")))main')

cmd = ['zig'] + sys.argv[1:] + FLAGS

if '-v' in cmd:
    print(' '.join(cmd))

subprocess.run(cmd)
