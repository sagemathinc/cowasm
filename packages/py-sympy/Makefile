include ../build/Makefile-vars

all: wasm

# See https://github.com/sympy/sympy/releases

VERSION = 1.11.1
URL = https://github.com/sympy/sympy/releases/download/sympy-${VERSION}/sympy-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/sympy-${VERSION}.tar.gz

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& python-wasm-debug setup.py build \
		&& python-wasm-debug setup.py install --prefix=${DIST_WASM}; chmod -R a+rw ${DIST_WASM}; python-wasm-debug setup.py install --prefix=${DIST_WASM}
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	cd ${BUILD_WASM}/build/lib \
		&& PYTHONPATH=`pwd` python-wasm-debug mpmath/tests/runtests.py
