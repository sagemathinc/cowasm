include ../build/Makefile-vars

all: wasm

# See https://github.com/mpmath/mpmath/releases
VERSION = 1.0.0

URL = https://github.com/mpmath/mpmath/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/mpmath-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.built: ${BUILD_WASM}/.build
	cd ../cpython && make pip # TODO: would be much nicer if npm package of python-wasm supported pip/distutils
	cd ${BUILD_WASM} \
		&& python-wasm setup.py build
	touch ${BUILD_WASM}/.built

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	cd ../cpython && make native  # TODO: python-wasm doesn't work with cowasm_bundler *yet*.
	cd ${BUILD_WASM}/build/lib \
		&& python-native -m cowasm_bundler mpmath \
		&& mkdir -p ${DIST_WASM} \
		&& cp mpmath.* ${DIST_WASM}
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	cd ../cpython && make pip  # TODO
	# Test that importing from the bundle works:
	PYTHONPATH=${DIST_WASM} python-wasm -c 'import mpmath'
	# Run actual test suite
	cd ${BUILD_WASM}/build/lib \
		&& PYTHONPATH=`pwd` python-wasm mpmath/tests/runtests.py




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
