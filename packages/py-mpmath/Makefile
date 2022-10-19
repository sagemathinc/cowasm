include ../build/Makefile-vars

all: wasm

# See https://github.com/fredrik-johansson/mpmath/releases
VERSION = 1.0.0

URL = https://github.com/fredrik-johansson/mpmath/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/mpmath-${VERSION}.tar.gz

include ../build/Makefile-rules

# We workaround a bug where the file permissions are incorrect below.
# We'll fix this. It's a bug somehow in the posix compat layer for zython.
${BUILD_WASM}/.built: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& python-wasm setup.py build
	touch ${BUILD_WASM}/.built

test: ${BUILD_WASM}/.built
	cd ${BUILD_WASM}/build/lib \
		&& PYTHONPATH=`pwd` zython mpmath/tests/runtests.py

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	cd ${BUILD_WASM}/build/lib \
		&& python-native -m zython_bundler mpmath \
		&& mkdir -p ${DIST_WASM} \
		&& cp mpmath.* ${DIST_WASM}
	touch ${DIST_WASM}/.built

# Interesting to build and test native for speed comparison:

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} \
		&& python-native setup.py build \
		&& python-native setup.py install --prefix=${DIST_NATIVE}
	touch ${DIST_NATIVE}/.built

test-native: ${DIST_NATIVE}/.built
	cd ${BUILD_NATIVE}/\
		&& PYTHONPATH=`pwd` python-native mpmath/tests/runtests.py
