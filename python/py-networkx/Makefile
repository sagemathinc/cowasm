include ../build/Makefile-vars

all: deps wasm

VERSION = 3.6.1
WHEEL = networkx-${VERSION}-py3-none-any.whl
URL = https://files.pythonhosted.org/packages/9e/c9/b2622292ea83fbb4ec318f5b9ab867d0a28ab43c5717bb85b0a5f6b3b0a4/${WHEEL}
TARBALL = ${UPSTREAM}/${WHEEL}
TARBALL_SHA256 = d47fbf302e7d9cbbb9e2555a0d267983d2aa476bac30e90dfbe5669bd57f3762

include ../build/Makefile-vars-wheel

TOP_LEVEL = networkx
PYTHON_WASM = ${PACKAGES}/cpython/dist/wasm/bin/python3.wasm

test: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} pnpm-exec cpython ${SRC}/test_sage_graphs.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: deps ${DIST_WASM}/.built
	PYTHONPATH=${DIST_WASM} ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_sage_graphs.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone
