include ../build/Makefile-vars

all: wasm

# See https://github.com/sympy/sympy/releases

VERSION = 1.11.1
URL = https://github.com/sympy/sympy/releases/download/sympy-${VERSION}/sympy-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/sympy-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.built: ${BUILD_WASM}/.build
	cd ../cpython && make pip  # TODO
	cd ${BUILD_WASM} \
		&& ${BIN}/python-wasm setup.py build
	touch ${BUILD_WASM}/.built

${DIST_WASM}/.built: ${BUILD_WASM}/.built
	cd ../cpython && make native  # TODO: python-wasm doesn't work with cowasm_bundler *yet*.
	cd ${BUILD_WASM}/build/lib \
		&& python-native -m cowasm_bundler sympy \
		&& mkdir -p ${DIST_WASM} \
		&& cp sympy.tar.xz ${DIST_WASM}
	touch ${DIST_WASM}/.built

# This is a small test just that something works.  It's NOT the full very massive test suite,
# which might be hard to get to pass anywhere, let alone in WASM.
test: ${DIST_WASM}/.built node_modules
	cd ../cpython && make wasm  # TODO

	# Test that importing from the bundle works:
	PYTHONPATH=${DIST_WASM}:$(shell cowasm-package-path @cowasm/mpmath) python-wasm -c 'import sympy'

	# A little test of functionality
	PYTHONPATH=${DIST_WASM}:$(shell cowasm-package-path @cowasm/mpmath) ${BIN}/python-wasm ${SRC}/test_basic.py




# It's good to confirm *to what extent* the actual Python code tests pass when testing under native cpython,
# and to see how long this takes (it's a while!).
test-native: ${BUILD_WASM}/.built
	cd ${BUILD_WASM} \
		&& python-native setup.py test

