#!/usr/bin/env bash
set -ev

cd $BUILD

git clone https://github.com/sagemathinc/mpir.git
cd mpir

CC=cc ABI=long CC_FOR_BUILD=gcc ./configure --build=i686-pc-linux-gnu --host=none --prefix="$PREFIX" CFLAGS="-O3"

# Edit config.h to change '#define HAVE_OBSTACK_VPRINTF 1' to '#define HAVE_OBSTACK_VPRINTF 0'
# since zig doesn't have it.
sed -i 's/HAVE_OBSTACK_VPRINTF 1/HAVE_OBSTACK_VPRINTF 0/' config.h

make -j8

make install
