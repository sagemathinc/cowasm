# See https://ftp.gnu.org/pub/gnu/ncurses/?C=M;O=D


VERSION = 6.3

CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm

all:  wasm


${BUILD}/source.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://ftp.gnu.org/gnu/ncurses/ncurses-${VERSION}.tar.gz -o source.tar.gz

# NATIVE -- we do not need this or care about it.

${BUILD}/native: ${BUILD}/source.tar.gz
	rm -rf ${BUILD}/native
	mkdir -p ${BUILD}/native
	cd ${BUILD} && tar xf source.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" AR="zig ar" ./configure --prefix=${DIST_NATIVE}
	cd ${BUILD}/native && make -j8
	cd ${BUILD}/native && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built


# WASM -- this is very important.

${BUILD}/wasm: ${BUILD}/source.tar.gz
	rm -rf ${BUILD}/wasm
	mkdir -p ${BUILD}/wasm
	cd ${BUILD} && tar xf source.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && RANLIB="zig ranlib" AR="zig ar" CC="zig cc -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" CXX="zig c++ -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" ./configure --host=none --prefix="${DIST_WASM}"
	cd ${BUILD}/wasm && make -j8
	cd ${BUILD}/wasm && make -j8 install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built


clean:
	rm -rf build dist
