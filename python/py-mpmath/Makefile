include ../build/Makefile-vars

all: deps wasm

# See https://github.com/mpmath/mpmath/releases
VERSION = 1.3.0

WHEEL = mpmath-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/py3/m/mpmath/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = a0b2b9fe80bbcd81a6647ff13108738cfb482d481d826cc0e02f5b35e5c88d2c

PYTHON_WASM = ${PACKAGES}/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-vars-wheel

define WHEEL_BUILD
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cp -r ${BUILD_WASM}/mpmath ${DIST_WASM}/
	cp -r ${BUILD_WASM}/mpmath-${VERSION}.dist-info ${DIST_WASM}/
endef

test: deps ${DIST_WASM}/.built
	# Test that importing from the bundle works:
	PYTHONPATH=${DIST_WASM} pnpm-exec cpython ${SRC}/test_sage_mpmath.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_sage_mpmath.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone




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
