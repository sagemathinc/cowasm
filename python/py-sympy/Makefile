include ../build/Makefile-vars

all: deps wasm

# See https://github.com/sympy/sympy/releases

VERSION = 1.11.1
URL = https://github.com/sympy/sympy/releases/download/sympy-${VERSION}/sympy-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/sympy-${VERSION}.tar.gz

include ../build/Makefile-rules

${BUILD_WASM}/.built:  ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&& PYTHONPATH=$(shell cowasm-package-path @cowasm/py-setuptools):$(shell cowasm-package-path @cowasm/py-mpmath) pnpm-exec cpython setup.py build
	touch ${BUILD_WASM}/.built

${DIST_WASM}/.built:  ${BUILD_WASM}/.built
	cd ${BUILD_WASM}/build/lib \
		&& pnpm-exec cpython -m cowasm_bundler sympy
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	cd ${DIST_WASM} && tar xf ${BUILD_WASM}/build/lib/sympy.tar.xz
	touch ${DIST_WASM}/.built

# This is a small test just that something works.  It's NOT the full very massive test suite,
# which might be hard to get to pass anywhere, let alone in WASM.
test: deps ${DIST_WASM}/.built
	# Test that importing from the bundle works:
	PYTHONPATH=${DIST_WASM}:$(shell cowasm-package-path @cowasm/py-mpmath) pnpm-exec cpython -c 'import sympy'

	# A little test of functionality
	PYTHONPATH=${DIST_WASM}:$(shell cowasm-package-path @cowasm/py-mpmath) pnpm-exec cpython ${SRC}/test_basic.py




# It's good to confirm *to what extent* the actual Python code tests pass when testing under native cpython,
# and to see how long this takes (it's a while!).
test-native: ${BUILD_WASM}/.built
	cd ${BUILD_WASM} \
		&& python-native setup.py test

