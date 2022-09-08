# This is a work in progress.

include ../build/Makefile-vars

all: wasm

# See https://github.com/cython/cython/releases

VERSION = 0.29.32
URL = https://github.com/cython/cython/releases/download/${VERSION}/Cython-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/cython-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.built: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& python-wasm-debug setup.py build_ext --inplace
	touch ${BUILD_WASM}/.built

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cp -rv ${BUILD_WASM}/Cython ${BUILD_WASM}/cython.py ${DIST_WASM}/
	touch ${DIST_WASM}/.built
