# See https://mpmath.org/

# https://mpmath.org/files/mpmath-1.2.0.tar.gz

INIT_CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${INIT_CWD}/dist
BUILD = ${INIT_CWD}/build
DIST_WASM = ${DIST}/wasm

VERSION=1.2.0

all: wasm

${BUILD}/mpmath.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl -L https://mpmath.org/files/mpmath-${VERSION}.tar.gz -o mpmath.tar.gz

${BUILD}/wasm: ${BUILD}/mpmath.tar.gz
	rm -rf ${DIST_WASM} ${BUILD}/wasm && mkdir -p ${DIST_WASM} ${BUILD}/wasm
	cd ${BUILD} && tar xf mpmath.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	echo "hi"
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

.PHONY: clean
clean:
	rm -rf ${BUILD} ${DIST}

