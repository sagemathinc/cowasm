CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm

.PHONEY: all
all: ${DIST_NATIVE}/.built


${BUILD}/openssl:
	mkdir -p ${BUILD}
	cd ${BUILD} && git clone --depth 1 --branch openssl-3.0.0-beta2 https://github.com/openssl/openssl.git openssl

## Native library

${BUILD}/native: ${BUILD}/openssl
	rm -rf ${BUILD}/native
	cd ${BUILD} && git clone openssl native

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" AR="zig ar" ./Configure --prefix=${DIST_NATIVE}
	cd ${BUILD}/native && make -j8
	cd ${BUILD}/native && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

clean:
	rm -rf build

clean-all: clean
	rm -rf dist