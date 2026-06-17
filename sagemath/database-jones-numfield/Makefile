include ../build/Makefile-vars

all: wasm

# SageMath ships database_jones_numfield as John Jones's number-field database.
VERSION = 4
UPSTREAM_NAME = database_jones_numfield
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/${UPSTREAM_NAME}-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.gz
TARBALL_SHA256 = 704d70101bc504bbdd2d7ac5847cb3bbc43e017c0ee163a9b4ab3ed2e572a001
DIST_WASI_SDK = ${DIST}/wasi-sdk

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/jones_numfield
	cp ${BUILD_WASM}/jones.sobj ${DIST_WASM}/share/jones_numfield/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/jones_numfield
	cp ${BUILD_WASM}/jones.sobj ${DIST_WASI_SDK}/share/jones_numfield/
	touch ${DIST_WASI_SDK}/.built

test: deps ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_JONES_NUMFIELD_DATA=${DIST_WASM}/share/jones_numfield pnpm-exec cpython ${SRC}/test_jones_numfield.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: deps ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_JONES_NUMFIELD_DATA=${DIST_WASI_SDK}/share/jones_numfield pnpm-exec cpython ${SRC}/test_jones_numfield.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
