#!/usr/bin/env bash
set -ev

# Build native version
cd $BUILD/Python-$PYTHON_VERSION.native

cat $SRC/build/python-patches/0008-setup.patch | patch -p1

export LD_LIBRARY_PATH=`pwd`/../../../openssl/dist.native/lib
mkdir -p "$PREFIX"

CC="zig cc -target native-native-gnu.2.28" AR="zig ar" CXX="zig c++ -target native-native-gnu.2.28"  ./configure --prefix="$PREFIX" --with-openssl=`pwd`/../../../openssl/dist.native/


make CC="zig cc -target native-native-gnu.2.28" AR="zig ar" CXX="zig c++ -target native-native-gnu.2.28" install

cd "$PREFIX"
