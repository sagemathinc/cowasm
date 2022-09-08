include ../build/Makefile-vars

MPMATH = ${PACKAGES}/py-mpmath/dist/wasm/mpmath.zip

export PYTHONPATH := ${MPMATH}

all: wasm

# See https://github.com/sympy/sympy/releases

VERSION = 1.11.1
URL = https://github.com/sympy/sympy/releases/download/sympy-${VERSION}/sympy-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/sympy-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.built: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& python-native setup.py build
	touch ${BUILD_WASM}/.built

# It's good to confirm that the actual Python code tests pass when testing under native cpython,
# and to see how long this takes (it's a while!).
test-native: ${BUILD_WASM}/.built
	cd ${BUILD_WASM} \
		&& python-native setup.py test

test: ${BUILD_WASM}/.built
	cd ${BUILD_WASM}/build/lib \
 		&& PYTHONPATH=`pwd`:${PYTHONPATH} python-wasm sympy/testing/runtests.py

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	cd ${BUILD_WASM}/build/lib \
		&& python-native ${CWD}/src/bundle.py sympy \
		&& mkdir -p ${DIST_WASM} \
		&& cp sympy.zip ${DIST_WASM}
	touch ${DIST_WASM}/.built
