
# See https://zlib.net/
ZLIB_VERSION = 1.2.11

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile
INIT_CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = build
PREFIX_NATIVE = dist.native
PREFIX_WASM = dist.wasm

${BUILD}/zlib-${ZLIB_VERSION}.tar.xz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://zlib.net/zlib-${ZLIB_VERSION}.tar.xz -o zlib-${ZLIB_VERSION}.tar.xz

# NATIVE

${BUILD}/zlib-${ZLIB_VERSION}.native: ${BUILD}/zlib-${ZLIB_VERSION}.tar.xz
	rm -rf "${PREFIX_NATIVE}" && mkdir -p "${PREFIX_NATIVE}"
	cd ${BUILD} && tar xvf zlib-${ZLIB_VERSION}.tar.xz
	cd ${BUILD} && mv zlib-${ZLIB_VERSION} zlib-${ZLIB_VERSION}.native

${PREFIX_NATIVE}/.built: ${BUILD}/zlib-${ZLIB_VERSION}.native
	cd ${BUILD}/zlib-${ZLIB_VERSION}.native && INIT_CWD=${INIT_CWD} PREFIX=${INIT_CWD}/${PREFIX_NATIVE} ${INIT_CWD}/src/build/build-native.sh
	touch ${PREFIX_NATIVE}/.built

native: ${PREFIX_NATIVE}/.built


# WASM

${BUILD}/zlib-${ZLIB_VERSION}.wasm: ${BUILD}/zlib-${ZLIB_VERSION}.tar.xz
	rm -rf "${PREFIX_WASM}" && mkdir -p "${PREFIX_WASM}"
	cd ${BUILD} && tar xvf zlib-${ZLIB_VERSION}.tar.xz
	cd ${BUILD} && mv zlib-${ZLIB_VERSION} zlib-${ZLIB_VERSION}.wasm

${PREFIX_WASM}/.built: ${BUILD}/zlib-${ZLIB_VERSION}.wasm
	cd ${BUILD}/zlib-${ZLIB_VERSION}.wasm && INIT_CWD=${INIT_CWD} PREFIX=${INIT_CWD}/${PREFIX_WASM} ${INIT_CWD}/src/build/build-wasm.sh
	touch ${PREFIX_WASM}/.built

wasm: ${PREFIX_WASM}/.built


all: native wasm

clean:
	rm -rf "${BUILD}"

clean-all: clean
	rm -rf "${PREFIX_NATIVE}" "${PREFIX_WASM}"
