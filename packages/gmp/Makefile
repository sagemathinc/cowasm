# See https://gmplib.org for versions.
VERSION = 6.2.1

SOURCE = ${BUILD}/gmp-${VERSION}.tar.bz2
BUILD = build
INIT_CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST_NATIVE = ${INIT_CWD}/dist/native
DIST_WASM = ${INIT_CWD}/dist/wasm
DIST_JS = ${INIT_CWD}/dist/js

.PHONY: all
all: dist/.built

dist/.built: ${DIST_NATIVE}/.built ${DIST_WASM}/.built ${DIST_JS}/.built
	touch dist/.built

${BUILD}/gmp-${VERSION}.tar.bz2:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://gmplib.org/download/gmp/gmp-${VERSION}.tar.bz2 -o gmp-${VERSION}.tar.bz2

.PHONY: source
source: ${BUILD}/gmp-${VERSION}.tar.bz2


## Native library

${BUILD}/native/Makefile: ${BUILD}/gmp-${VERSION}.tar.bz2
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xvf gmp-${VERSION}.tar.bz2 -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native/Makefile
	cd ${BUILD}/native && CC="zig cc" AR="zig ar" ./configure --prefix=${DIST_NATIVE} CFLAGS="-O3" && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

test-native: native
	cd ${BUILD}/native && make check


## WebAssembly library

${BUILD}/wasm/Makefile: ${BUILD}/gmp-${VERSION}.tar.bz2
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xvf gmp-${VERSION}.tar.bz2 -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm/Makefile
	cd ${BUILD}/wasm && CC="zig cc -target wasm32-wasi -D_WASI_EMULATED_SIGNAL" AR="zig ar" RANLIB="zig ranlib" ABI=standard CC_FOR_BUILD="zig cc" \
		./configure --build i686-pc-linux-gnu --host=none --prefix=${DIST_WASM} CFLAGS="-O3"
	#  Edit config.h to change '#define HAVE_OBSTACK_VPRINTF 1' to '#define HAVE_OBSTACK_VPRINTF 0' because missing in zig...
	cd ${BUILD}/wasm && sed -i 's/HAVE_OBSTACK_VPRINTF 1/HAVE_OBSTACK_VPRINTF 0/' config.h
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

# Javascript interface library

${DIST_JS}/integer.js: src/integer.ts
	npx tsc

test-integer: native
	cd src && zig test integer.zig -lgmp -lc -I${DIST_NATIVE}/include -L${DIST_NATIVE}/lib

${DIST_JS}/integer.wasm: ${DIST_WASM}/.built
	cd src/ && zig build-lib -target wasm32-wasi -dynamic -lc -I${DIST_WASM}/include -L${DIST_WASM}/lib ${DIST_WASM}/lib/libgmp.a -O ReleaseSmall integer-export.zig
	mkdir -p ${DIST_JS}
	mv src/integer-export.wasm ${DIST_JS}/integer.wasm

${DIST_JS}/.built: ${DIST_JS}/integer.wasm ${DIST_JS}/integer.js
	touch ${DIST_JS}/.built

.PHONY: interface
interface: ${DIST_JS}/.built

clean:
	rm -rf ${DIST_NATIVE} ${DIST_WASM} ${DIST_JS} dist/tsconfig.tsbuildinfo ${BUILD}/native ${BUILD}/wasm