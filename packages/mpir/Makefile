BUILD = build
CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
DIST_JS = ${CWD}/dist/js


all: ${DIST_NATIVE}/.built ${DIST_WASM}/.built ${DIST_JS}/.built

${BUILD}/mpir:
	mkdir -p ${BUILD}
	cd ${BUILD} && git clone https://github.com/sagemathinc/mpir.git

.PHONY: source
source: ${BUILD}/mpir


## Native library

${BUILD}/native: ${BUILD}/mpir
	rm -rf ${BUILD}/native
	cd ${BUILD} && git clone --depth=1 mpir native

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" AR="zig ar"  CFLAGS="-O3" ./configure --prefix=${DIST_NATIVE} && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

test-native: native
	cd ${BUILD}/native && make check


## WebAssembly library

${BUILD}/wasm: ${BUILD}/mpir
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && git clone --depth=1 mpir wasm

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && CC="zig cc -target wasm32-wasi -D_WASI_EMULATED_SIGNAL" AR="zig ar" RANLIB="zig ranlib" ABI=long CC_FOR_BUILD="zig cc" CFLAGS="-O3" \
		./configure --build i686-pc-linux-gnu --host=none --prefix=${DIST_WASM}
	#  Edit config.h to change '#define HAVE_OBSTACK_VPRINTF 1' to '#define HAVE_OBSTACK_VPRINTF 0' because missing in zig...
	cd ${BUILD}/wasm && sed -i'.original' -e 's/HAVE_OBSTACK_VPRINTF 1/HAVE_OBSTACK_VPRINTF 0/' config.h
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

# Javascript interface library

node_modules:
	npm ci

${DIST_JS}/integer.js: src/integer.ts node_modules
	npx tsc

test-integer: native
	cd src && zig test integer.zig -lgmp -lc -I${DIST_NATIVE}/include -L${DIST_NATIVE}/lib

${DIST_JS}/integer.wasm: ${DIST_WASM}/.built
	cd src/ && zig build-lib -target wasm32-wasi -dynamic -lc -I${DIST_WASM}/include -L${DIST_WASM}/lib ${DIST_WASM}/lib/libmpir.a -O ReleaseSmall integer-export.zig
	mkdir -p ${DIST_JS}
	mv src/integer-export.wasm ${DIST_JS}/integer.wasm

${DIST_JS}/.built: ${DIST_JS}/integer.wasm ${DIST_JS}/integer.js
	touch ${DIST_JS}/.built

.PHONY: interface
interface: ${DIST_JS}/.built

clean:
	rm -rf ${DIST_NATIVE} ${DIST_WASM} ${DIST_JS} dist/tsconfig.tsbuildinfo ${BUILD}/native ${BUILD}/wasm node_modules