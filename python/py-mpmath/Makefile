include ../build/Makefile-vars

all: wasm

# See https://github.com/mpmath/mpmath/releases
VERSION = 1.0.0

URL = https://github.com/mpmath/mpmath/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/mpmath-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.built: node_modules ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& PYTHONPATH=${PIP} npx @cowasm/cpython setup.py build
	touch ${BUILD_WASM}/.built

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	cd ${BUILD_WASM}/build/lib \
		&& npx @cowasm/cpython -m cowasm_bundler mpmath
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/build/lib/mpmath.tar.xz
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	# Test that importing from the bundle works:
	PYTHONPATH=${DIST_WASM} npx @cowasm/cpython -c 'import mpmath'
	# Run the full test suite
	cd ${BUILD_WASM}/build/lib \
		&& PYTHONPATH=${DIST_WASM}:`pwd` npx @cowasm/cpython mpmath/tests/runtests.py




# Interesting to build and test native for speed comparison:

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../cpython && make native
	cd ${BUILD_NATIVE} \
		&& python-native setup.py build \
		&& python-native setup.py install --prefix=${DIST_NATIVE}
	touch ${DIST_NATIVE}/.built

test-native: ${DIST_NATIVE}/.built
	cd ${BUILD_NATIVE}/\
		&& PYTHONPATH=`pwd` python-native mpmath/tests/runtests.py
