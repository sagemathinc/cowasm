# See https://gmplib.org for versions.
VERSION = 6.2.1

INIT_CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = build
DIST_NATIVE = ${INIT_CWD}/dist/native
DIST_WASM = ${INIT_CWD}/dist/wasm
EXPORT = ${INIT_CWD}/dist/export
SOURCE = ${BUILD}/gmp-${VERSION}.tar.bz2

all: native wasm integer

${BUILD}/gmp-${VERSION}.tar.bz2:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://gmplib.org/download/gmp/gmp-${VERSION}.tar.bz2 -o gmp-${VERSION}.tar.bz2

.PHONY: source
source: ${BUILD}/gmp-${VERSION}.tar.bz2

${BUILD}/native: ${BUILD}/gmp-${VERSION}.tar.bz2
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xvf gmp-${VERSION}.tar.bz2 -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" AR="zig ar" ./configure --prefix=${DIST_NATIVE} CFLAGS="-O3" && make install
	touch ${DIST_NATIVE}/.built

.PHONE: native
native: ${DIST_NATIVE}/.built

check-native: native
	cd ${BUILD}/native && make check

${BUILD}/wasm: ${BUILD}/gmp-${VERSION}.tar.bz2
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xvf gmp-${VERSION}.tar.bz2 -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && CC="zig cc -target wasm32-wasi -D_WASI_EMULATED_SIGNAL" AR="zig ar" RANLIB="zig ranlib" ABI=standard CC_FOR_BUILD="zig cc" \
		./configure --build i686-pc-linux-gnu --host=none --prefix=${DIST_WASM} CFLAGS="-O3"
	#  Edit config.h to change '#define HAVE_OBSTACK_VPRINTF 1' to '#define HAVE_OBSTACK_VPRINTF 0' because missing in zig...
	cd ${BUILD}/wasm && sed -i 's/HAVE_OBSTACK_VPRINTF 1/HAVE_OBSTACK_VPRINTF 0/' config.h
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONE: wasm
wasm: ${DIST_WASM}/.built

tsc:
	npx tsc

test-integer: native
	cd src && zig test integer.zig -lgmp -lc -I${DIST_NATIVE}/include -L${DIST_NATIVE}/lib

${EXPORT}/integer-export.wasm: wasm
	cd src/ && zig build-lib -target wasm32-wasi -dynamic -lc -I${DIST_WASM}/include -L${DIST_WASM}/lib ${DIST_WASM}/lib/libgmp.a -O ReleaseSmall integer-export.zig
	mkdir -p ${EXPORT}
	mv src/integer-export.wasm ${EXPORT}/

.PHONE: integer
integer: ${EXPORT}/integer-export.wasm

clean:
	rm -rf ${DIST_NATIVE} ${DIST_WASM} dist/tsconfig.tsbuildinfo ${BUILD}/native ${BUILD}/wasm ${EXPORT}