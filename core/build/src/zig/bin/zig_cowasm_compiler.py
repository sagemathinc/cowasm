#!/usr/bin/env -S python3 -E

# Note -- we use -E to ignore env variables, since this is often being run
# as part of building other things involving python, and env variables could
# potentially cause trouble. The -S is because there are now more than one
# arguments to /usr/bin/env, and on some systems the -S is needed.

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

BACKEND SELECTION:

   COWASM_TOOLCHAIN=zig   = use the current pinned Zig backend. This is the
                            default when COWASM_TOOLCHAIN is unset.
   COWASM_TOOLCHAIN=clang = use an experimental direct clang/lld backend for
                            tiny non-PIC C programs. Set COWASM_CLANG,
                            COWASM_WASM_LD, and COWASM_WASI_SYSROOT when the
                            tools are not discoverable on PATH.

EXTRA OPTIONS:

   -fvisibility-main = makes the main function visible
   -cowasm-verbose = prints any zig/linker commands before running them
"""

import os, shutil, subprocess, sys, tempfile, pathlib

verbose = False  # default
SUPPORTED_TOOLCHAINS = {"zig", "clang"}
ORIGINAL_ARGV0 = sys.argv[0]


def fail(message, exit_code=2):
    print(message, file=sys.stderr)
    sys.exit(exit_code)


def selected_toolchain():
    toolchain = os.environ.get("COWASM_TOOLCHAIN", "zig").strip().lower()
    if toolchain == "":
        return "zig"
    return toolchain


TOOLCHAIN = selected_toolchain()

if TOOLCHAIN not in SUPPORTED_TOOLCHAINS:
    print(
        f"cowasm: unsupported COWASM_TOOLCHAIN={TOOLCHAIN!r}; "
        "supported values are 'zig' and 'clang'.",
        file=sys.stderr,
    )
    sys.exit(2)

if '-cowasm-verbose' in sys.argv:
    # use -cowasm-verbose for just us being verbose
    print(' '.join(sys.argv))
    print(f"COWASM_TOOLCHAIN={TOOLCHAIN}")
    verbose = True
    sys.argv.remove('-cowasm-verbose')

    # https://retrocomputing.stackexchange.com/questions/20281/why-didnt-c-specify-filename-extensions
SOURCE_EXTENSIONS_CPP = set(['.c++', '.cpp', '.cxx', '.cc', '.cp'])
SOURCE_EXTENSIONS_C = set(['.c'])
SOURCE_EXTENSIONS_ZIG = set(['.zig'])
SOURCE_EXTENSIONS = SOURCE_EXTENSIONS_CPP.union(SOURCE_EXTENSIONS_C).union(
    SOURCE_EXTENSIONS_ZIG)


def strip_isys():
    # Some build systems, e.g., cmake will sometimes try to be too clever and add -isystem and -isysroot,
    # which messed up building using WebAssembly.  We strip them.
    i = len(sys.argv) - 1
    while i >= 0:
        if sys.argv[i] == '-isystem' or sys.argv[i] == '-isysroot':
            del sys.argv[i+1]
            del sys.argv[i]
        i -= 1

strip_isys()

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
else:
    fail(f"cowasm: cannot infer compiler mode from {sys.argv[0]!r}")


def find_zig():
    zig = shutil.which("zig")
    if zig:
        return os.path.realpath(zig)

    # Direct invocations such as ./bin/cowasm-cc should work even when the
    # caller has not put this repository's bin directory on PATH.
    invocation_dir = pathlib.Path(ORIGINAL_ARGV0).parent
    sibling = invocation_dir / "zig"
    if sibling.is_file() and os.access(sibling, os.X_OK):
        return os.path.realpath(sibling)

    fail(
        "cowasm: could not find 'zig'; run make -C core/build zig or add "
        "the CoWasm bin directory to PATH"
    )


ZIG_EXE = None
ZIG_HOME = None


def ensure_zig():
    global ZIG_EXE, ZIG_HOME
    if ZIG_EXE is None:
        ZIG_EXE = find_zig()
        ZIG_HOME = os.path.dirname(ZIG_EXE)
        sys.argv[0] = ZIG_EXE

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


def find_required_program(env_name, program):
    override = os.environ.get(env_name)
    if override:
        path = pathlib.Path(override)
        if path.is_file() and os.access(path, os.X_OK):
            return str(path)
        fail(f"cowasm: {env_name}={override!r} is not an executable file")

    found = shutil.which(program)
    if found:
        return os.path.realpath(found)

    fail(
        f"cowasm: COWASM_TOOLCHAIN=clang requires '{program}'; "
        f"install it or set {env_name}=/path/to/{program}"
    )


def find_wasi_sysroot():
    for env_name in ["COWASM_WASI_SYSROOT", "WASI_SYSROOT"]:
        value = os.environ.get(env_name)
        if value:
            path = pathlib.Path(value)
            if path.is_dir():
                return str(path)
            fail(f"cowasm: {env_name}={value!r} is not a directory")

    for candidate in [
            "/opt/wasi-sdk/share/wasi-sysroot",
            "/usr/local/share/wasi-sysroot",
            "/usr/share/wasi-sysroot",
    ]:
        if pathlib.Path(candidate).is_dir():
            return candidate

    fail(
        "cowasm: COWASM_TOOLCHAIN=clang requires a WASI sysroot; "
        "set COWASM_WASI_SYSROOT=/path/to/wasi-sysroot"
    )


def clang_output_name(args):
    try:
        return args[args.index('-o') + 1]
    except:
        return 'a.out'


def clang_is_object_or_archive(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in {'.o', '.a', '.so'}


def clang_has_input(args):
    return any(is_source(arg) or clang_is_object_or_archive(arg) for arg in args)


def clang_is_debug(args):
    for flag in args:
        if flag.startswith('-g') or flag == '-O0':
            return True
    return False


def clang_base_flags(sysroot):
    flags = [
        '--target=wasm32-wasi', '--sysroot', sysroot, '-D__wasi__',
        '-D__cowasm__', '-D_WASI_EMULATED_SIGNAL',
        '-D_WASI_EMULATED_PROCESS_CLOCKS'
    ]
    if use_main_hack:
        flags.append('-Dmain=__attribute__((visibility("default")))main')
    return flags


def reject_unsupported_clang_args(args):
    unsupported = {
        '-shared', '-fPIC', '-fpic', '--experimental-pic', '-dynamic'
    }
    for arg in args:
        if arg in unsupported:
            fail(
                "cowasm: COWASM_TOOLCHAIN=clang currently supports only "
                f"non-PIC standalone C programs; unsupported flag {arg!r}"
            )


def split_wl_arg(arg):
    return arg[len('-Wl,'):].split(',')


def clang_parse_link_args(args):
    i = 0
    source_files = []
    object_args = []
    compiler_args = []
    linker_args = []
    while i < len(args):
        arg = args[i]
        if arg == '-o':
            i += 2
            continue
        if arg == '-Xlinker':
            i += 1
            linker_args.append(args[i])
            i += 1
            continue
        if arg == '-L':
            linker_args += [arg, args[i + 1]]
            i += 2
            continue
        if arg.startswith('-L') or arg.startswith('-l'):
            linker_args.append(arg)
        elif arg.startswith('-Wl,'):
            linker_args += split_wl_arg(arg)
        elif is_source(arg):
            source_files.append(arg)
        elif clang_is_object_or_archive(arg):
            object_args.append(arg)
        else:
            compiler_args.append(arg)
        i += 1
    return source_files, compiler_args, linker_args, object_args


def clang_builtin_runtime(clang, base_flags):
    override = os.environ.get("COWASM_COMPILER_RT")
    if override:
        path = pathlib.Path(override)
        if path.is_file():
            return str(path)
        fail(f"cowasm: COWASM_COMPILER_RT={override!r} is not a file")

    ret = subprocess.run(
        [clang] + base_flags + ['-print-libgcc-file-name'],
        capture_output=True,
        text=True,
    )
    if ret.returncode:
        sys.stderr.write(ret.stderr)
        sys.exit(ret.returncode)
    path = ret.stdout.strip()
    if not path or not pathlib.Path(path).is_file():
        fail(
            "cowasm: clang did not report a usable compiler runtime; "
            "set COWASM_COMPILER_RT=/path/to/libclang_rt.builtins-wasm32.a"
        )
    return path


def clang_backend():
    if LANG == 'zig':
        fail("cowasm: COWASM_TOOLCHAIN=clang does not support cowasm-zig")
    if LANG == 'c++':
        fail("cowasm: COWASM_TOOLCHAIN=clang does not support C++ yet")

    args = sys.argv[2:]
    if '--print-multiarch' in args:
        print('wasm32-wasi')
        return

    reject_unsupported_clang_args(args)
    clang = find_required_program("COWASM_CLANG", "clang")
    sysroot = find_wasi_sysroot()
    base_flags = clang_base_flags(sysroot)

    if "-E" in args or not clang_has_input(args):
        run([clang] + base_flags + args)
        return

    if '-c' in args or clang_output_name(args).endswith('.o'):
        run([clang] + base_flags + args)
        return

    wasm_ld = find_required_program("COWASM_WASM_LD", "wasm-ld")
    source_files, compiler_args, linker_args, object_args = clang_parse_link_args(
        args)

    objects = []
    for source_file in source_files:
        tmpfile = tempfile.NamedTemporaryFile(suffix='.o')
        run([clang] + base_flags + compiler_args +
            ['-c', source_file, '-o', tmpfile.name])
        objects.append(tmpfile)

    output_name = clang_output_name(args)
    sysroot_lib = os.path.join(sysroot, "lib", "wasm32-wasi")
    crt1 = os.path.join(sysroot_lib, "crt1.o")
    if not pathlib.Path(crt1).is_file():
        fail(f"cowasm: WASI startup object not found: {crt1}")

    link = [wasm_ld, '-o', output_name]
    if not clang_is_debug(args):
        link.append('--strip-all')
    link += [crt1] + object_args + [obj.name for obj in objects]
    link += linker_args + ['-L', sysroot_lib, '-lc',
                           clang_builtin_runtime(clang, base_flags)]
    run(link)


if TOOLCHAIN == 'clang':
    clang_backend()
    sys.exit(0)


ensure_zig()

if "-E" in sys.argv or '--print-multiarch' in sys.argv:
    # preprocessor only or checking architecture
    sys.argv.insert(2, '-target')
    sys.argv.insert(3, 'wasm32-wasi')
    run(sys.argv)
    sys.exit(0)

OBJECT_OR_ARCHIVE_EXTENSIONS = set(['.o', '.a', '.so'])


def is_object_or_archive(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in OBJECT_OR_ARCHIVE_EXTENSIONS


# TODO: I should probably just change to "if doesn't have -fPIC then use normal compiler".
# This will be a lot of work, so wait until finish redoing cpython first!

INCLUDE = os.path.join(ZIG_HOME, "lib", "zig", "libc", "include")
EMSCRIPTEN_SYSROOT = os.environ.get(
    "EMSCRIPTEN_SYSROOT", "/usr/share/emscripten/cache/sysroot")
CXX_INCLUDE = os.path.join(EMSCRIPTEN_SYSROOT, "include", "c++", "v1")

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
    '-fPIC'
]

if LANG == 'c++':
    FLAGS += ['-nostdinc++', '-I', CXX_INCLUDE]

FLAGS += [
    '-isystem', os.path.join(INCLUDE, 'wasm-wasi-musl'), '-isystem',
    os.path.join(INCLUDE, 'generic-musl'), '-D__wasi__',
    '-D__EMSCRIPTEN_major__=3', '-D__EMSCRIPTEN_minor__=1',
    '-D__EMSCRIPTEN_tiny__=16', '-D_WASI_EMULATED_MMAN',
    '-D_WASI_EMULATED_SIGNAL', '-D_WASI_EMULATED_PROCESS_CLOCKS',
    '-D_WASI_EMULATED_GETPID', '-D__cowasm__'
]

if LANG == 'c++':
    FLAGS += [
        '-U_LIBCPP_ABI_VERSION', '-U_LIBCPP_ABI_NAMESPACE',
        '-D_LIBCPP_ABI_VERSION=2', '-D_LIBCPP_ABI_NAMESPACE=__2'
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
    if no_input:
        run(sys.argv)
    else:
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
        if argv[i].startswith('-Wl,'):
            link += split_wl_arg(argv[i])
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
        ZIG_EXE, 'wasm-ld', \
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
