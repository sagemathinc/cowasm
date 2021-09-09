# See http://www.flintlib.org/downloads.html
VERSION = 2.8.0

BUILD = build
CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
DIST_JS = ${CWD}/dist/js

GMP = ${CWD}/../gmp/dist
MPFR = ${CWD}/../mpfr/dist
MPIR = ${CWD}/../mpir/dist
NTL = ${CWD}/../ntl/dist

all: ${DIST_NATIVE}/.built ${DIST_WASM}/.built

${BUILD}/flint-${VERSION}.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl http://www.flintlib.org/flint-${VERSION}.tar.gz -o flint-${VERSION}.tar.gz

.PHONY: source
source: ${BUILD}/flint


## Native library

${BUILD}/native: ${BUILD}/flint-${VERSION}.tar.gz
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xf flint-${VERSION}.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" CXX="zig c++" AR="zig ar" RANLIB="zig ranlib" \
		./configure \
			--disable-shared  \
			--with-mpir=${MPIR}/native  \
			--with-mpfr=${MPFR}/native  \
			--with-gmp=${GMP}/native    \
			--with-ntl=${NTL}/native    \
			--prefix=${DIST_NATIVE}
	cd ${BUILD}/native && make -j12 install   # *enormous* number of tiny files!
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built


## WebAssembly library

${BUILD}/wasm: ${BUILD}/flint-${VERSION}.tar.gz
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xf flint-${VERSION}.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && CC="zig cc -target wasm32-wasi" CXX="zig c++ -target wasm32-wasi" AR="zig ar" RANLIB="zig ranlib" \
		CFLAGS="-D_WASI_EMULATED_PROCESS_CLOCKS" \
		./configure \
			--disable-shared  \
			--disable-pthread \
			--with-mpir=${MPIR}/wasm  \
			--with-mpfr=${MPFR}/wasm  \
			--with-gmp=${GMP}/wasm    \
			--with-ntl=${NTL}/wasm    \
			--prefix=${DIST_WASM}
	cd ${BUILD}/wasm && make -j12 install  # *enormous* number of tiny files!
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

clean:
	rm -rf ${DIST_NATIVE} ${DIST_WASM} ${DIST_JS} ${CWD}/dist/tsconfig.tsbuildinfo ${BUILD}/native ${BUILD}/wasm  node_modules