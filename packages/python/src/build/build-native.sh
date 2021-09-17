#!/usr/bin/env bash
set -ev

if [ -f .patched ]; then
    echo "Already patched"
else
    echo "Patching..."
    cat "$INIT_CWD"/src/build/python-patches/0008-setup.patch | patch -p1
    touch .patched
fi

export LD_LIBRARY_PATH=`pwd`/../../../openssl/dist/native/lib:`pwd`/../../../zlib/dist/native/lib
export CFLAGS="-I`pwd`/../../../zlib/dist/native/include"
export LDFLAGS="-L`pwd`/../../../zlib/dist/native/lib"
export AR="zig ar"
export CC="zig cc -target native-native-gnu.2.28"

./configure \
    --prefix="$PREFIX"   \
    --enable-big-digits=30 \
    --enable-optimizations \
    --enable-shared \
    --with-openssl=`pwd`/../../../openssl/dist.native/

make
make install
