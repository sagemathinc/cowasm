# See https://ftp.gnu.org/gnu/termcap/

# Not likely to change -- it hasn't in over 20 years!
VERSION = 1.3.1

CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
DIST_WASM_SHARED = ${CWD}/dist/wasm-shared

all: wasm native


${BUILD}/termcap.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://ftp.gnu.org/gnu/termcap/termcap-${VERSION}.tar.gz -o termcap.tar.gz

##################
# NATIVE
##################

${BUILD}/native: ${BUILD}/termcap.tar.gz
	rm -rf ${BUILD}/native
	mkdir -p ${BUILD}/native
	cd ${BUILD} && tar xf termcap.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" AR="zig ar" ./configure --prefix=${DIST_NATIVE}
	cd ${BUILD}/native && make -j8
	cd ${BUILD}/native && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

##################
# WASM - STATIC
##################
${BUILD}/wasm: ${BUILD}/termcap.tar.gz
	rm -rf ${BUILD}/wasm
	mkdir -p ${BUILD}/wasm
	cd ${BUILD} && tar xf termcap.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && RANLIB="zig ranlib" AR="zig ar" CC="zig cc -Oz -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" CXX="zig c++ -Oz -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" ./configure  --build=`./build-aux/config.guess` --host=none --prefix="${DIST_WASM}"
	cd ${BUILD}/wasm && make -j8
	cd ${BUILD}/wasm && make -j8 install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

##################
# WASM - SHARED
##################
${BUILD}/wasm-shared: ${BUILD}/termcap.tar.gz
	rm -rf ${BUILD}/wasm-shared
	mkdir -p ${BUILD}/wasm-shared
	cd ${BUILD} && tar xf termcap.tar.gz -C wasm-shared --strip-components=1

${DIST_WASM_SHARED}/.built: ${BUILD}/wasm-shared
	cd ${BUILD}/wasm-shared && RANLIB="zig ranlib" AR="zig ar" CC="zig-fPIC cc -Oz" CXX="zig-fPIC c++" ./configure  --build=`./build-aux/config.guess` --host=none --prefix="${DIST_WASM_SHARED}"
	cd ${BUILD}/wasm-shared && make -j8
	cd ${BUILD}/wasm-shared && make -j8 install
	touch ${DIST_WASM_SHARED}/.built

.PHONY: wasm-shared
wasm-shared: ${DIST_WASM_SHARED}/.built

clean:
	rm -rf build dist
