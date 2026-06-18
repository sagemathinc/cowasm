include ../build/Makefile-vars

all: deps wasm

# See https://github.com/sympy/sympy/releases

VERSION = 1.14.0
WHEEL = sympy-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/py3/s/sympy/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = e091cc3e99d2141a0ba2847328f5479b05d94a6635cb96148ccb3f34671bd8f5

PYTHON_WASM = ${PACKAGES}/cpython/dist/wasm/bin/python3.wasm
MPMATH_WASM = ${PACKAGES}/py-mpmath/dist/wasm

include ../build/Makefile-vars-wheel

define WHEEL_BUILD
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	cp -r ${BUILD_WASM}/sympy ${DIST_WASM}/
	cp -r ${BUILD_WASM}/sympy-${VERSION}.dist-info ${DIST_WASM}/
endef

# This is a small test just that something works.  It's NOT the full very massive test suite,
# which might be hard to get to pass anywhere, let alone in WASM.
test: deps ${DIST_WASM}/.built
	# Test that importing from the bundle works:
	PYTHONPATH=${DIST_WASM}:$(shell cowasm-package-path @cowasm/py-mpmath) pnpm-exec cpython -c 'import sympy'

	# A little test of functionality
	PYTHONPATH=${DIST_WASM}:$(shell cowasm-package-path @cowasm/py-mpmath) pnpm-exec cpython ${SRC}/test_basic.py
	PYTHONPATH=${DIST_WASM}:$(shell cowasm-package-path @cowasm/py-mpmath) pnpm-exec cpython ${SRC}/test_sage_symbolics.py

${MPMATH_WASM}/mpmath/__init__.py:
	$(MAKE) -C ${PACKAGES}/py-mpmath test-wasi-sdk-standalone

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: deps ${DIST_WASM}/.built ${MPMATH_WASM}/mpmath/__init__.py
	PYTHONPATH=${DIST_WASM}:${MPMATH_WASM} ${BIN}/cowasm ${PYTHON_WASM} -c 'import sympy'
	PYTHONPATH=${DIST_WASM}:${MPMATH_WASM} ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_basic.py
	PYTHONPATH=${DIST_WASM}:${MPMATH_WASM} ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_sage_symbolics.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone




# It's good to confirm *to what extent* the actual Python code tests pass when testing under native cpython,
# and to see how long this takes (it's a while!).
test-native: ${BUILD_WASM}/.built
	cd ${BUILD_WASM} \
		&& python-native setup.py test
