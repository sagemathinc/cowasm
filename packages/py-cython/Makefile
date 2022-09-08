include ../build/Makefile-vars

MPMATH = ${PACKAGES}/py-mpmath/dist/wasm/mpmath.zip

export PYTHONPATH := ${MPMATH}

all: wasm

# See https://github.com/cython/cython/releases

VERSION = 0.29.32
URL = https://github.com/cython/cython/releases/download/${VERSION}/Cython-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/cython-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.built: ${BUILD_WASM}/.build
	echo ${PYTHONPATH}
	cd ${BUILD_WASM} \
		&& python-native setup.py build
	touch ${BUILD_WASM}/.built

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	cd ${BUILD_WASM}/build/lib \
		&& python-native ${CWD}/src/bundle.py cython \
		&& mkdir -p ${DIST_WASM} \
		&& cp cython.zip ${DIST_WASM}
	touch ${DIST_WASM}/.built
