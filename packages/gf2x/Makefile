# See https://gitlab.inria.fr/gf2x/gf2x/-/releases and copy the link under "other"
# for "gf2x-xxxx.tar.gz (source tarball, ready to `./configure ; make`)"
# It has a sha1 so we can't just set the env var to a version.
GF2X = https://gitlab.inria.fr/gf2x/gf2x/uploads/c46b1047ba841c20d1225ae73ad6e4cd/gf2x-1.3.0.tar.gz

BUILD = build
CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
DIST_JS = ${CWD}/dist/js
ZCC = ${CWD}/../../bin/zcc

all: ${DIST_NATIVE}/.built ${DIST_WASM}/.built

${BUILD}/gf2x.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl ${GF2X} -o gf2x.tar.gz

.PHONY: source
source: ${BUILD}/gf2x.tar.gz

## Native library

${BUILD}/native: ${BUILD}/gf2x.tar.gz
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xvf gf2x.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" AR="zig ar" CFLAGS="-O3" ./configure --prefix=${DIST_NATIVE} && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

test-native: native
	cd ${BUILD}/native && make check


## WebAssembly library

${BUILD}/wasm: ${BUILD}/gf2x.tar.gz
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xvf gf2x.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && CC=${ZCC} AR="zig ar" RANLIB="zig ranlib" CFLAGS="-O3" \
		./configure --build i686-pc-linux-gnu --host=none --prefix=${DIST_WASM}
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

clean:
	rm -rf ${DIST_NATIVE} ${DIST_WASM} ${DIST_JS} ${CWD}/dist/tsconfig.tsbuildinfo ${BUILD}/native ${BUILD}/wasm  node_modules