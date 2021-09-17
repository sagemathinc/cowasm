#!/usr/bin/env bash
set -ev

export SRC="$INIT_CWD"/src

# Also copy the config.site, which answers some questions needed for
# cross compiling, without which ./configure won't work.
cp $SRC/build/config.site .

if [ -f .patched ]; then
    echo "Already patched"
else
    echo "Patching..."
    touch .patched
    # Apply all the patches to the code to make it WASM friendly.
    # These patches initially come from pyodide.  They add a WASM cross compilation target
    # to the config scripts (shouldn't that get upstreamed to Python?).
    cat $SRC/build/python-patches/*.patch | patch -p1
    # Some legacy code assumes this header exists.  Not actually
    # used at all in Python, fortunately!
    mkdir -p bits
    echo "#define __jmp_buf int" > bits/setjmp.h
fi


export CC="zig cc -target wasm32-wasi-musl -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS"
export CXX="zig c++ -target wasm32-wasi-musl -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS"
export AR="zig ar"

# A message says to use these, but they don't seem to exist...
# -lwasi-emulated-mman -lwasi-emulated-signal -lwasi-emulated-process-clocks

export LDFLAGS="-lc" # ../wasm-posix/libwasmposix.a"

# TODO -- for later
#export LDFLAGS="-lc -L`pwd`/../../../zlib/dist.wasm/lib"
#export CFLAGS="-I`pwd`/../../../zlib/dist.wasm/include"

# Do the cross-compile ./configure.  Here's an explanation of each
# of the options we use:
#     --prefix=$PREFIX: we install the build locally, then copy from there.
#     --enable-big-digits=30: see pyodide notes.
#     --enable-optimizations: we want speed (e.g. ,compile with -O3)
#     --disable-shared: do not need shared library, since WASM doesn't use it
#     --disable-ipv6: no need, given the WASM sandbox.
#     --with-ensurepip=no: because otherwise "make install" below fails
#       trying to do something with pip; obviously, I don't understand this well yet.
#     --host=wasm32-unknown-emscripten: target we are cross compiling for; matches paches above.
#     --build=`./config.guess`: the host machine for cross compiling is easily computed via
#       this config.guess autoconf script.

if [ -f Makefile ]; then
    echo "Already ran configure".
else
    CONFIG_SITE=./config.site READELF=true ./configure \
        --with-pydebug \
        --prefix=$PREFIX \
        --enable-big-digits=30 \
        --enable-optimizations \
        --disable-shared \
        --disable-ipv6 \
        --without-pymalloc \
        --with-ensurepip=no \
        --host=wasm32-unknown-emscripten \
        --build=`./config.guess`
fi

# Make it so our WASM posix header file is included everywhere,
# since otherwise we can't even compile.
echo '#include "../wasm-posix/wasm-posix.h"' >> pyconfig.h

make install

# Rebuild python interpreter with the entire Python library as a filesystem:
## TODO -- see sagejs.
# # TODO: This is *brittle* and needs to be done better!
# # In particular the "3.9" will break for sure.
# # Options:
# #    --preload-file $PREFIX/lib/python3.9: the Python standard lib, which is needed
# #       for Python to do anything.  This is BIG, unfortunately.
# #    -s ALLOW_MEMORY_GROWTH=1: so Python can use more than a tiny amount of memory
# #    -s ASSERTIONS=0: otherwise *much* use of stubs (related to signals/posix) gets
# #       displayed to stderr.
# cc -o python.js Programs/python.o libpython3.9.a -ldl  -lm --lz4 \
#      --preload-file $PREFIX/lib/python3.9 \
#      -s ALLOW_MEMORY_GROWTH=1 \
#      -s ASSERTIONS=0

# mkdir -p $DIST
# cp python.js python.data python.wasm $DIST
# Now you can do
#  cd dist; node ./python.js -c 'print("hello world", 2+3)'
# and get
#  hello world 5
# However, just "node ./python" doesn't work, since it terminates instead of waiting for input.
# But we *don't* want the Python repl.  We want a function that evaluates a block of code, so
# we can build a Jupyter kernel, node.js library interface, etc.
