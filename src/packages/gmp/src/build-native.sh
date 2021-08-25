#!/usr/bin/env bash
set -ev

cd $BUILD

### Download and build GMP
curl https://gmplib.org/download/gmp/gmp-$GMP_VERSION.tar.bz2 -o gmp-$GMP_VERSION.tar.bz2
tar xf gmp-$GMP_VERSION.tar.bz2
rm gmp-$GMP_VERSION.tar.bz2

cd gmp-$GMP_VERSION

CC=cc ./configure  --disable-assembly --prefix="$PREFIX" CFLAGS="-O3"

make -j 8
make install
