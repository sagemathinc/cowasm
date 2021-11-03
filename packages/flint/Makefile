# See https://github.com/wbhart/flint2/tags
VERSION = 2.8.3

BUILD = build
CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
DIST_JS = ${CWD}/dist/js

GMP = ${CWD}/../gmp/dist
MPFR = ${CWD}/../mpfr/dist
NTL = ${CWD}/../ntl/dist

all: ${DIST_NATIVE}/.built ${DIST_WASM}/.built

${BUILD}/flint-${VERSION}.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://codeload.github.com/wbhart/flint2/tar.gz/refs/tags/v${VERSION} -o flint-${VERSION}.tar.gz

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
	cd ${BUILD}/wasm && patch -p1 < ${CWD}/patches/ulong.patch   # https://github.com/wbhart/flint2/pull/1020

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && CC="zig cc -target wasm32-wasi" CXX="zig c++ -target wasm32-wasi" AR="zig ar" RANLIB="zig ranlib" \
		CFLAGS="-D_WASI_EMULATED_PROCESS_CLOCKS" \
		./configure \
			--disable-shared  \
			--disable-pthread \
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