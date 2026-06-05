include ../build/Makefile-vars

all: deps wasm

# See https://github.com/mpmath/mpmath/releases
VERSION = 1.0.0

URL = https://github.com/mpmath/mpmath/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/mpmath-${VERSION}.tar.gz
TARBALL_SHA256 = f4edfddb63c0f87d8ae637290d2fd1743d47aec5452453e50d8d9c3c3fdf57e0

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& cat ${SRC}/patches/01-qfunctions-pep479.patch | patch -p1
	touch ${BUILD_WASM}/.patched

${BUILD_WASM}/.built:  ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&& PYTHONPATH=${PIP} pnpm-exec cpython setup.py build
	touch ${BUILD_WASM}/.built

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	cd ${BUILD_WASM}/build/lib \
		&& pnpm-exec cpython -m cowasm_bundler mpmath
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/build/lib/mpmath.tar.xz
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	# Test that importing from the bundle works:
	PYTHONPATH=${DIST_WASM} pnpm-exec cpython -c 'import mpmath'
	# Run the full test suite
	cd ${BUILD_WASM}/build/lib \
		&& PYTHONPATH=${DIST_WASM}:`pwd` pnpm-exec cpython mpmath/tests/runtests.py 2>&1 | tee ${BUILD_WASM}/mpmath-tests.log
	! grep -q "TEST FAILED!" ${BUILD_WASM}/mpmath-tests.log




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
