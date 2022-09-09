include ../build/Makefile-vars

# See https://github.com/numpy/numpy/releases
VERSION=1.23.2

URL = https://github.com/numpy/numpy/releases/download/v${VERSION}/numpy-${VERSION}.tar.gz

TARBALL = ${UPSTREAM}/numpy-${VERSION}.tar.gz

CYTHON = ${PACKAGES}/py-cython/dist/wasm

all: wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& export PYTHONPATH=${CYTHON} \
		&& python-wasm-debug tools/cythonize.py numpy/random/ \
		&& python-wasm-debug setup.py build_ext --inplace
	touch ${DIST_WASM}/.built