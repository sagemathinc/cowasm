# See https://zlib.net/
ZLIB_VERSION = 1.2.11

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile
INIT_CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${INIT_CWD}/dist
BUILD = ${INIT_CWD}/build
DIST_NATIVE = ${DIST}/native
DIST_WASM = ${DIST}/wasm

all: native wasm

${BUILD}/zlib-${ZLIB_VERSION}.tar.xz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://zlib.net/zlib-${ZLIB_VERSION}.tar.xz -o zlib-${ZLIB_VERSION}.tar.xz

# NATIVE

${BUILD}/native: ${BUILD}/zlib-${ZLIB_VERSION}.tar.xz
	rm -rf ${DIST_NATIVE} && mkdir -p ${DIST_NATIVE}
	cd ${BUILD} && mkdir native && tar xf zlib-${ZLIB_VERSION}.tar.xz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && AR="zig ar" CC="zig cc" CXX="zig c++" ./configure --prefix=${DIST_NATIVE}
	cd ${BUILD}/native && make install -j8
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built


# WASM

${BUILD}/wasm: ${BUILD}/zlib-${ZLIB_VERSION}.tar.xz
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	cd ${BUILD} && mkdir wasm && tar xf zlib-${ZLIB_VERSION}.tar.xz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && AR="zig ar" CC="zig cc -target wasm32-wasi-musl" CXX="zig c++ -target wasm32-wasi-musl" ./configure --prefix=${DIST_WASM}
	cd ${BUILD}/native && make install -j8
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

.PHONY: clean
clean:
	rm -rf ${BUILD} ${DIST}
