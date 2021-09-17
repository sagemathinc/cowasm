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
#export LDFLAGS="-lc"

# It's really helpful to link in zlib...
export LDFLAGS="-lc -L`pwd`/../../../zlib/dist/wasm/lib"
export CFLAGS="-I`pwd`/../../../zlib/dist/wasm/include"

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
    CONFIG_SITE=./config.site READELF=true \
    ./configure \
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

make
make install
