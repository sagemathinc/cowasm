# https://github.com/sympy/sympy/releases/download/sympy-1.10.1/sympy-1.10.1.tar.gz

INIT_CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${INIT_CWD}/dist
BUILD = ${INIT_CWD}/build
DIST_WASM = ${DIST}/wasm

VERSION=1.10.1

all: wasm

${BUILD}/sympy.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl -L https://github.com/sympy/sympy/releases/download/sympy-${VERSION}/sympy-${VERSION}.tar.gz -o sympy.tar.gz

${BUILD}/wasm: ${BUILD}/sympy.tar.gz
	rm -rf ${DIST_WASM} ${BUILD}/wasm && mkdir -p ${DIST_WASM} ${BUILD}/wasm
	cd ${BUILD} && tar xf sympy.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	echo "hi"
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

.PHONY: clean
clean:
	rm -rf ${BUILD} ${DIST}

