include ../build/Makefile-vars

# https://github.com/pandas-dev/pandas/releases
VERSION=1.5.1

URL = https://github.com/pandas-dev/pandas/releases/download/v${VERSION}/pandas-${VERSION}.tar.gz

TARBALL = ${UPSTREAM}/pandas-${VERSION}.tar.gz

CYTHON = ${PACKAGES}/py-cython/dist/wasm

all: wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& cat ${SRC}/patches/00-no-ctypes.patch | patch -p1
	touch ${BUILD_WASM}/.patched

# TODO...
${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	mkdir -p ${DIST_WASM}
	cd ${PACKAGES}/cpython && make pip
	cd ${BUILD_WASM} \
		&& python-wasm setup.py install
	touch ${DIST_WASM}/.built

# Just a trivial test for now.
test: ${DIST_WASM}/.built
	rm -rf ${BUILD_WASM}/cowasm-test
	mkdir -p ${BUILD_WASM}/cowasm-test
	@cd ${BUILD_WASM}/cowasm-test \
		&& python-wasm -c "import pandas" \
		&& echo "NUMPY TEST PASSED!"

