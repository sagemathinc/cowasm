CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm

all: native wasm

# Last release was2008,so no need to worry about versions.
${BUILD}/lzma.tar.xz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://tukaani.org/lzma/lzma-4.32.7.tar.xz -o lzma.tar.xz

## Native library
${BUILD}/native: ${BUILD}/lzma.tar.xz
	rm -rf ${BUILD}/native
	cd ${BUILD} && rm -rf native && mkdir native && tar xf lzma.tar.xz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" CXX="zig c++" AR="zig ar" ./configure --prefix=${DIST_NATIVE}
	cd ${BUILD}/native && make -j8
	cd ${BUILD}/native && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built


# WASM

${BUILD}/wasm: ${BUILD}/lzma.tar.xz
	cd ${BUILD} && rm -rf wasm && mkdir wasm && tar xf lzma.tar.xz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && RANLIB="zig ranlib" AR="zig ar" CC="zig cc -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" CXX="zig c++ -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" ./configure  --build `./config.guess` --host=none --prefix=${DIST_WASM}
	cd ${BUILD}/wasm && echo '#include "../../../wasm-posix/dist/wasm-posix.h"' >> config.h
	cd ${BUILD}/wasm && make -j8
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built


clean:
	rm -rf build dist
