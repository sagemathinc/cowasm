# See https://gmplib.org for versions.
VERSION = 6.2.1

BUILD = build
CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST_NATIVE = ${CWD}/dist/native

# One of the following two should be dist/wasm:
DIST_WASM32 = ${CWD}/dist/wasm32
DIST_WASM64 = ${CWD}/dist/wasm

# Assembly + clang do NOT work on aarch64 for some reason involving alignment,
# which I'm stumped fixing.
# I've also disabled shared, because with zig-0.9.0 it started breaking building
# on MacOS, and we don't need shared libraries for our purposes (WASM and
# native zig testing).
ifeq ($(shell uname -m),aarch64)
NATIVE_CONF = --disable-shared --disable-assembly
else
NATIVE_CONF = --disable-shared
endif

# one of WASM64 or WASM32... (also fix above)
all: ${DIST_NATIVE}/.built ${DIST_WASM64}/.built

${BUILD}/gmp-${VERSION}.tar.bz2:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://gmplib.org/download/gmp/gmp-${VERSION}.tar.bz2 -o gmp-${VERSION}.tar.bz2

.PHONY: source
source: ${BUILD}/gmp-${VERSION}.tar.bz2


## Native library

${BUILD}/native: ${BUILD}/gmp-${VERSION}.tar.bz2
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xvf gmp-${VERSION}.tar.bz2 -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" AR="zig ar" CFLAGS="-O3"  ./configure ${NATIVE_CONF} --prefix=${DIST_NATIVE} && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

test-native: native
	cd ${BUILD}/native && make check


## WebAssembly library: 32-bit ABI

${BUILD}/wasm32: ${BUILD}/gmp-${VERSION}.tar.bz2
	rm -rf ${BUILD}/wasm32
	cd ${BUILD} && mkdir wasm32 && tar xvf gmp-${VERSION}.tar.bz2 -C wasm32 --strip-components=1

${DIST_WASM32}/.built: ${BUILD}/wasm32
	cd ${BUILD}/wasm32 && CC="zig cc -target wasm32-wasi -D_WASI_EMULATED_SIGNAL" AR="zig ar" RANLIB="zig ranlib" ABI=standard CC_FOR_BUILD="zig cc" CFLAGS="-O3" \
		./configure --build i686-pc-linux-gnu --host=none --prefix=${DIST_WASM32}
	#  Edit config.h to change '#define HAVE_OBSTACK_VPRINTF 1' to '#define HAVE_OBSTACK_VPRINTF 0' because missing in zig...
	cd ${BUILD}/wasm32 && sed -i'.original' -e 's/HAVE_OBSTACK_VPRINTF 1/HAVE_OBSTACK_VPRINTF 0/' config.h
	cd ${BUILD}/wasm32 && make install
	touch ${DIST_WASM32}/.built

.PHONY: wasm
wasm32: ${DIST_WASM32}/.built




## WebAssembly 64-bit ABI library
# This is often twice as fast or more for big numbers, but might subtly break
# everything (though I have no evidence it does).  In particular, it might mess up building FLINT
# and NTL in various ways.

${BUILD}/wasm64: ${BUILD}/gmp-${VERSION}.tar.bz2
	rm -rf ${BUILD}/wasm64
	cd ${BUILD} && mkdir wasm64 && tar xvf gmp-${VERSION}.tar.bz2 -C wasm64 --strip-components=1
	cd ${BUILD}/wasm64 && patch -p1 < ${CWD}/patches/long-long-abi.patch

${DIST_WASM64}/.built: ${BUILD}/wasm64
	cd ${BUILD}/wasm64 && CC="zig cc -target wasm32-wasi -D_WASI_EMULATED_SIGNAL" AR="zig ar" RANLIB="zig ranlib" ABI=longlong CC_FOR_BUILD="zig cc" CFLAGS="-O3" \
		./configure --build i686-pc-linux-gnu --host=none --prefix=${DIST_WASM64}
	#  Edit config.h to change '#define HAVE_OBSTACK_VPRINTF 1' to '#define HAVE_OBSTACK_VPRINTF 0' because missing in zig...
	cd ${BUILD}/wasm64 && sed -i'.original' -e 's/HAVE_OBSTACK_VPRINTF 1/HAVE_OBSTACK_VPRINTF 0/' config.h
	cd ${BUILD}/wasm64 && make install
	touch ${DIST_WASM64}/.built

.PHONY: wasm64
wasm64: ${DIST_WASM64}/.built

clean:
	rm -rf ${DIST_NATIVE} ${DIST_WASM32} ${DIST_WASM64} ${BUILD}/native ${BUILD}/wasm ${BUILD}/wasm64
