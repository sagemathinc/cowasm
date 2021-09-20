BUILD = build
CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${CWD}/dist
DIST_NATIVE = ${DIST}/native
DIST_WASM = ${DIST}/wasm

all: ${DIST_NATIVE}/.built ${DIST_WASM}/.built

${BUILD}/mpir:
	mkdir -p ${BUILD}
	cd ${BUILD} && git clone https://github.com/sagemathinc/mpir.git

.PHONY: source
source: ${BUILD}/mpir


## Native library

${BUILD}/native: ${BUILD}/mpir
	rm -rf ${BUILD}/native
	cd ${BUILD} && git clone mpir native

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
	cd ${BUILD} && git clone mpir wasm

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && CC="zig cc -target wasm32-wasi -D_WASI_EMULATED_SIGNAL" AR="zig ar" RANLIB="zig ranlib" ABI=long CC_FOR_BUILD="zig cc" CFLAGS="-O3" \
		./configure --build i686-pc-linux-gnu --host=none --prefix=${DIST_WASM}
	#  Edit config.h to change '#define HAVE_OBSTACK_VPRINTF 1' to '#define HAVE_OBSTACK_VPRINTF 0' because missing in zig...
	cd ${BUILD}/wasm && sed -i'.original' -e 's/HAVE_OBSTACK_VPRINTF 1/HAVE_OBSTACK_VPRINTF 0/' config.h
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

clean:
	rm -rf ${DIST} ${BUILD}