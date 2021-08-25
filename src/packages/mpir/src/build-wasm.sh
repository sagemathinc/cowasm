#!/usr/bin/env bash
set -ev

cd $BUILD

git clone https://github.com/sagemathinc/mpir.git
cd mpir

CC=cc ABI=long CC_FOR_BUILD=gcc ./configure --build=i686-pc-linux-gnu --host=none --prefix="$PREFIX" CFLAGS="-O3"

make -j8

make install
