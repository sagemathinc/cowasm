# See https://libntl.org/download.html
VERSION = 11.5.1

BUILD = build
CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
DIST_JS = ${CWD}/dist/js
ZXX = ${CWD}/../../bin/z++

all: ${DIST_NATIVE}/.built ${DIST_WASM}/.built

${BUILD}/ntl-${VERSION}.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://libntl.org/ntl-${VERSION}.tar.gz -o ntl-${VERSION}.tar.gz

.PHONY: source
source: ${BUILD}/ntl-${VERSION}.tar.gz


## Native library

${BUILD}/native: ${BUILD}/ntl-${VERSION}.tar.gz
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xvf ntl-${VERSION}.tar.gz -C native --strip-components=1

#${DIST_NATIVE}/.built: export DYLD_LIBRARY_PATH = ${CWD}/../gmp/dist/native/lib

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native/src && ./configure \
		CXX="zig c++" RANLIB="zig ranlib" AR="zig ar" \
		GMP_PREFIX=${CWD}/../gmp/dist/native \
		GF2X_PREFIX=${CWD}/../gf2x/dist/native \
		NTL_GMP_LIP=off \
		PREFIX=${DIST_NATIVE}
	cd ${BUILD}/native/src && make && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

test-native: native
	cd ${BUILD}/native && make check


## WebAssembly library

${BUILD}/wasm: ${BUILD}/ntl-${VERSION}.tar.gz
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xvf ntl-${VERSION}.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm/src && ./configure \
		CXX=${ZXX} RANLIB="zig ranlib" AR="zig ar" \
		NATIVE=off TUNE=generic \
		NTL_THREADS=off NTL_EXCEPTIONS=off NTL_GMP_LIP=off\
		PREFIX=${DIST_WASM} \
		GMP_PREFIX=${CWD}/../gmp/dist/wasm  GF2X_PREFIX=${CWD}/../gf2x/dist/wasm \
		&& make && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

clean:
	rm -rf ${DIST_NATIVE} ${DIST_WASM} ${DIST_JS} ${CWD}/dist/tsconfig.tsbuildinfo ${BUILD}/native ${BUILD}/wasm  node_modules