include ../build/Makefile-vars

all: wasm

# See https://github.com/fredrik-johansson/mpmath/releases
VERSION = 1.0.0

URL = https://github.com/fredrik-johansson/mpmath/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/mpmath-${VERSION}.tar.gz

include ../build/Makefile-rules

# We workaround a bug where the file permissions are incorrect below.
# We'll fix this. It's a bug somehow in the posix compat layer for python-wasm.
${DIST_WASM}/.built: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& python-wasm-debug setup.py build \
		&& python-wasm-debug setup.py install --prefix=${DIST_WASM}; chmod -R a+rw ${DIST_WASM}; python-wasm-debug setup.py install --prefix=${DIST_WASM}
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	cd ${BUILD_WASM}/build/lib \
		&& PYTHONPATH=`pwd` python-wasm mpmath/tests/runtests.py
