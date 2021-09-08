#!/usr/bin/env bash
set -ev

cd $BUILD


git clone https://github.com/sagemathinc/mpir.git
cd mpir

CC=cc ./configure --prefix="$PREFIX" CFLAGS="-O3"

make -j 8
make install
