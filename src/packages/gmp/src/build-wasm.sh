#!/usr/bin/env bash
set -ev

cd $BUILD

### Download and build GMP
curl https://gmplib.org/download/gmp/gmp-$GMP_VERSION.tar.bz2 -o gmp-$GMP_VERSION.tar.bz2
tar xf gmp-$GMP_VERSION.tar.bz2
rm gmp-$GMP_VERSION.tar.bz2

cd gmp-$GMP_VERSION

CC=cc ABI=standard CC_FOR_BUILD="/usr/bin/gcc"  ./configure --build=i686-pc-linux-gnu --host=none --disable-assembly --prefix="$PREFIX" CFLAGS="-O3"

# Edit config.h to change '#define HAVE_OBSTACK_VPRINTF 1' to '#define HAVE_OBSTACK_VPRINTF 0'
# since zig doesn't have it.
sed -i 's/HAVE_OBSTACK_VPRINTF 1/HAVE_OBSTACK_VPRINTF 0/' config.h

# NOTE: would need to link with -lwasi_emulated_signal

make -j8

make install
