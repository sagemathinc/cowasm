include ../build/Makefile-vars

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

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	cd ${BUILD_WASM}/build/lib \
		&& python-native -m cowasm_bundler sympy \
		&& mkdir -p ${DIST_WASM} \
		&& cp sympy.tar.xz ${DIST_WASM}
	touch ${DIST_WASM}/.built

# This is a small test just that something works.  It's NOT the full very massive test suite,
# which might be hard to get to pass anywhere, let alone in WASM.
test: ${DIST_WASM}/.built
	${BIN}/python-wasm ${SRC}/test_basic.py
