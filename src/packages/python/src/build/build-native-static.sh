#!/usr/bin/env bash
set -ev

if [ -f .patched ]; then
    echo "Already patched"
else
    echo "Patching..."
    cat "$INIT_CWD"/src/build/python-patches/0008-setup.patch | patch -p1
    touch .patched
fi

export LDFLAGS="-static -static-libgcc"
export CPPFLAGS="-static"

export AR="zig ar"

export CC="zig cc"
export CXX="zig c++"

if [ -f Makefile ]; then
    echo "Already ran configure".
else
    ./configure --prefix="$PREFIX" --disable-shared
fi

make LDFLAGS="-static" CPPFLAGS="-static" LINKFORSHARED=" " # -j8

cd "$PREFIX"
