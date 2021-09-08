# See http://www.multiprecision.org/mpc/download.html for versions:
VERSION = 1.2.1

BUILD = build
CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
DIST_JS = ${CWD}/dist/js

all: ${DIST_NATIVE}/.built ${DIST_WASM}/.built

${BUILD}/mpc-${VERSION}.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://ftp.gnu.org/gnu/mpc/mpc-${VERSION}.tar.gz -o mpc-${VERSION}.tar.gz

.PHONY: source
source: ${BUILD}/mpc-${VERSION}.tar.gz


## Native library

${BUILD}/native: ${BUILD}/mpc-${VERSION}.tar.gz
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xvf mpc-${VERSION}.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" AR="zig ar" CFLAGS="-O3" ./configure --prefix=${DIST_NATIVE} --with-gmp=${CWD}/../gmp/dist/native --with-mpfr=${CWD}/../mpfr/dist/native && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

test-native: native
	cd ${BUILD}/native && make check


## WebAssembly library

${BUILD}/wasm: ${BUILD}/mpc-${VERSION}.tar.gz
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xvf mpc-${VERSION}.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && CC="zig cc -target wasm32-wasi -D_WASI_EMULATED_SIGNAL" AR="zig ar" RANLIB="zig ranlib" ABI=long CC_FOR_BUILD="zig cc" CFLAGS="-O3" \
		./configure --build i686-pc-linux-gnu --host=none --prefix=${DIST_WASM} --with-gmp=${CWD}/../gmp/dist/wasm --with-mpfr=${CWD}/../mpfr/dist/wasm
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

clean:
	rm -rf ${DIST_NATIVE} ${DIST_WASM} ${DIST_JS} ${CWD}/dist/tsconfig.tsbuildinfo ${BUILD}/native ${BUILD}/wasm  node_modules