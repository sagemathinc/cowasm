#!/usr/bin/env python3
"""
Use this wrapper to build position independent Zig/C/C++ code (-fPIC) using zig.
Someday I might be able to somehow upstream things and this might then just
be a lightweight wrapper around

    zig cc -target wasm32-wasi -fPIC

Right now -fPIC for wasi is not supported at all in zig, yet Position Indendent Code
is absolutely central to the design of CoWasm.   Fortunatley, there is one
implementation of PIC in the WebAssembly world, and that's part of
wasm32-emscripten, which is part of clang.   This seems to be the only way
today to make dynamic WASM modules.

NOTE: there is about 0.05s - 0.1s overhead just due to using Python for
this script, and that's a lot LONGER than the zig call sometimes
takes, e.g., when things are cached.  This time can add up!  We will likely
rewrite this script in Zig for speed purposes, but only once it completely
stabilizes, as Python is very easy to iterate on.

NOTE: Often -fPIC is the *default* these days.  See the discussion here:
https://stackoverflow.com/questions/20637310/does-one-still-need-to-use-fpic-when-compiling-with-gcc#:~:text=You%20never%20needed%20to%20generate,or%20set%20it%20by%20default.

NOTE: Another change -- if -g isn't in the options or the optimization level isn't set (or is -O0),
then we do the equivalent of this (but directly in the wasm-ld call):

     -Xlinker --strip-all -Xlinker -compress-relocations

automatically when compiling code to save space, but make things less debugabble.

NOTE: It is now possible to strip just debug symbols later, since https://reviews.llvm.org/D73820
did get merged into LLVM.   There's an option "--strip-debug".  Anyway, I'm not sure about
--strip-all versus --strip-debug above.  --strip-all seems to work right now.

TODO/NOTE: This program won't work:

    int main() { ... }

Instead you MUST do

    int main(int argc, char* argv[]) { ... }

and build with

    cowasm-cc -fvisibility-main

or do
    __attribute__((visibility("default")))
    int main(int argc, char* argv[]) { ... }

EXTRA OPTIONS:

   -fvisibility-main = makes the main function visible
   -cowasm-verbose = prints any zig/linker commands before running them
"""

import os, shutil, subprocess, sys, tempfile, pathlib

verbose = False  # default

if '-cowasm-verbose' in sys.argv:
    # use -cowasm-verbose for just us being verbose
    print(' '.join(sys.argv))
    verbose = True
    sys.argv.remove('-cowasm-verbose')

    # https://retrocomputing.stackexchange.com/questions/20281/why-didnt-c-specify-filename-extensions
SOURCE_EXTENSIONS_CPP = set(['.c++', '.cpp', '.cxx', '.cc', '.cp'])
SOURCE_EXTENSIONS_C = set(['.c'])
SOURCE_EXTENSIONS_ZIG = set(['.zig'])
SOURCE_EXTENSIONS = SOURCE_EXTENSIONS_CPP.union(SOURCE_EXTENSIONS_C).union(
    SOURCE_EXTENSIONS_ZIG)


def is_source(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in SOURCE_EXTENSIONS


def is_cpp_source(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in SOURCE_EXTENSIONS_CPP


def have_any_cpp_sources():
    for path in sys.argv:
        if is_cpp_source(path):
            return True
    return False


if sys.argv[0].endswith('-cc'):
    if have_any_cpp_sources():
        # A lot of build script will get this wrong, so we adjust here.
        sys.argv.insert(1, 'c++')
        LANG = "c++"
    else:
        sys.argv.insert(1, 'cc')
        LANG = 'cc'
elif sys.argv[0].endswith('-c++'):
    sys.argv.insert(1, 'c++')
    LANG = 'c++'
elif sys.argv[0].endswith('-zig'):
    sys.argv.insert(1, 'build-obj')
    LANG = 'zig'

sys.argv[0] = 'zig'

# This is a horrendous hack to make the main function visible without having to
# change the source code of every program we build.  It can be randomly broken, so watch out.
# E.g., when building python there is a random header that has
#    something.main
# which breaks. At least we make it very explicit with a "-fvisibility-main".
# If we can figure out a way with 'zig wasm-ld' to do this directly that would
# be better.
# NOTE: this check MUST be done before any use of run, since -fvisibility-main doesn't exist for clang.
# It is just a flag I made up.
if '-fvisibility-main' in sys.argv:
    use_main_hack = LANG in ['cc', 'c++']  # zig doesn't need it but cc/c++ do.
    sys.argv.remove('-fvisibility-main')
else:
    use_main_hack = False


def run(cmd):
    if verbose:
        print(' '.join(cmd))
    ret = subprocess.run(cmd)
    if ret.returncode:
        sys.exit(ret.returncode)


if "-E" in sys.argv or '--print-multiarch' in sys.argv:
    # preprocessor only or checking architecture
    sys.argv.insert(2, '-target')
    sys.argv.insert(3, 'wasm32-wasi')
    run(sys.argv)
    sys.exit(0)

OBJECT_OR_ARCHIVE_EXTENSIONS = set(['.o', '.a'])


def is_object_or_archive(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in OBJECT_OR_ARCHIVE_EXTENSIONS


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
    '-dynamic' if LANG == 'zig' else '-shared', '-target', 'wasm32-emscripten',
    '-fPIC', '-isystem',
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

    # opt flags in reverse order, since only last matters and the command can
    # have numerous conflicting flags in a row with no error message.
    last = sys.argv[-1]
    for flag in reversed(sys.argv):
        if flag.startswith('-O'):
            # Note that "-O 0" is NOT allowed in C/C++
            if flag == '-O0':
                return True
            if len(flag) == 3:
                # Not -O0, so it's something like -O1, -Oz, or -O2 or -O3.
                return False
            # In Zig we have "-ODebug" and "-O Debug" and "-ORelease*"
            # and "-O Release*", so it's more complicated...
            if flag == '-O':
                if last == 'Debug':
                    return True
                elif last.startswith('Release'):
                    return False
            if flag.startswith('-ODebug'):
                return True
            elif flag.startswith('-ORelease'):
                return False
        last = flag

    # We strip by default if there are no relevant flags.  For WASM we
    # usually want to strip, unless we're explicitly debugging.  A subtle
    # aspect of autodetecting is that the stripping actually happens
    # during linking, but these optimization flags are used for compilation.
    return False


def is_input(filename):
    ext = os.path.splitext(filename)[1].lower()
    if ext in SOURCE_EXTENSIONS or ext == '.o' or ext == '.a':
        return True
    return False


def get_output_name():
    if LANG == 'zig':
        # There should be exactly one .zig file foo.zig and the final output is then foo.wasm
        # as we are modeling this after "zig build-exe -target wasm32-wasi a.zig", which
        # automatically produces "a.wasm", for better or worse.
        for arg in sys.argv:
            if arg.endswith('.zig'):
                return os.path.splitext(arg)[0] + '.wasm'
        raise Error("must specify exactly one zig file")

    # C/C++ is arg to -o or default of a.out
    try:
        return sys.argv[sys.argv.index('-o') + 1]
    except:
        return 'a.out'


# no_input, e.g., when querying the compiler for info about the system, e.g.,
#   cowasm-cc --print-multiarch

no_input = len([arg for arg in sys.argv if is_input(arg)]) == 0

# COMPILE ONLY? NOT LINKING
if '-c' in sys.argv or no_input or get_output_name().endswith('.o'):

    # building object files from source, so don't have to do the extra wasm-ld step
    # below, which is really complicated
    run(sys.argv + FLAGS)
    sys.exit(0)

# COMPILE any sources, and definitely ALSO LINK (explicitly calling "zig wasm-ld")


def is_unsupported_lib(arg):
    return arg in ['-lc', '-lm', '-ldl'] or arg.startswith('-lwasi-emulated')


def remove_unsupported_libs(argv):
    # -lc doesn't exist for target=wasm32-emscripten on zig!.
    # if we add more to our core, may similarly remove here!
    # Also none of the -lwasi-emulated stuff exists either.
    # These are all done in the core libc anyways.
    return [arg for arg in argv if not is_unsupported_lib(arg)]


def extract_linker_args(argv):
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


def extract_source_files(argv):
    i = 0
    source_files = []
    object_files = []
    compiler_args = []
    while i < len(argv):
        if argv[i] == '-o':
            # discard "-o foo" option entirely from here; we still get it from sys.argv later,
            # but do NOT include in compiler args, since we will use our own -o there.
            i += 2
            continue
        if is_source(argv[i]):  # .c, .cxx, .zig, etc.
            source_files.append(argv[i])
        elif is_object_or_archive(argv[i]):  # .a or .o
            object_files.append(argv[i])
        else:
            compiler_args.append(argv[i])
        i += 1
    return compiler_args, source_files, object_files


def parse_args(argv):
    argv, linker_args = extract_linker_args(argv)
    compiler_args, source_files, object_args = extract_source_files(argv)
    return source_files, compiler_args, linker_args, object_args


class ZigTempFile:

    def __init__(self, path):
        self.path = path
        self.name = os.path.splitext(path)[0] + '.o'

    def __del__(self):
        #pathlib.Path(self.name).unlink(True)
        # zig weirdly makes foo.o and foo.o.o from foo.zig?!
        pathlib.Path(self.name + '.o').unlink(True)


def compile_source(compiler_args, source_file):
    if LANG == 'zig':
        run(compiler_args + [source_file] + FLAGS)
        return ZigTempFile(os.path.splitext(source_file)[0] + '.o')

    # returns NamedTemporaryFile object representing the object file
    tmpfile = tempfile.NamedTemporaryFile(suffix='.o')
    dot_o = tmpfile.name
    run(compiler_args + ['-c', source_file, '-o', tmpfile.name] + FLAGS)
    return tmpfile


def compile_serial(compiler_args, source_files):
    # NON-parallel version
    return [
        compile_source(compiler_args, source_file)
        for source_file in source_files
    ]


def compile_parallel(compiler_args, source_files):
    if len(source_files) == 0: return []
    # See https://stackoverflow.com/questions/9786102/how-do-i-parallelize-a-simple-python-loop
    # We can't use multiprocessing because we need the tmpfile objects to be in
    # the same process, and asyncio is ideal for this application... except
    # this also mysteriously hangs, so it's disabled.
    import asyncio

    def background(f):

        def wrapped(*args, **kwargs):
            return asyncio.get_event_loop().run_in_executor(
                None, f, *args, **kwargs)

        return wrapped

    @background
    def f(source_file):
        return compile_source(compiler_args, source_file)

    loop = asyncio.get_event_loop()
    looper = asyncio.gather(*[f(source_file) for source_file in source_files])
    return loop.run_until_complete(looper)


def main():
    source_files, compiler_args, linker_args, object_args = parse_args(
        sys.argv)

    # compile all the source files individually to temporary object files
    # NOTE: keep objects in scope until done, since when it goes out of
    # scope the temporary object files are deleted.
    objects = compile_serial(compiler_args, source_files)
    ##objects = compile_parallel(compiler_args, source_files)  # hangs...

    for obj in objects:
        object_args.append(obj.name)

    # link
    output_name = get_output_name()
    link = [
        'zig', 'wasm-ld', \
        '--experimental-pic', '-shared', \
        '-o', output_name
    ] + linker_args

    if not is_debug():
        link.append('--strip-all')
        # Note that we have to do this '--compress-relocations' here, since it is
        # ignored if put in Xlinker args.
        link.append('--compress-relocations')

    link += object_args
    run(link)


# TODO/WARNING! there are two cases above where main isn't called and
# we do not even get this far in the file.

if __name__ == "__main__":
    main()
