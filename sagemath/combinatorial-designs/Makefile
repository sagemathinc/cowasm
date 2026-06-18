include ../build/Makefile-vars

all: wasm

# SageMath ships combinatorial_designs as a standard design-theory data package.
VERSION = 20140630
UPSTREAM_NAME = combinatorial_designs
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL_SHA256 = c9486c6d7ec71da338589a6e301723be4e55e02dcfc41f8dba11a682e3b3482e
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/combinatorial_designs
	cp ${BUILD_WASM}/MOLS_table.txt ${DIST_WASM}/share/combinatorial_designs/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/combinatorial_designs
	cp ${BUILD_WASM}/MOLS_table.txt ${DIST_WASI_SDK}/share/combinatorial_designs/
	touch ${DIST_WASI_SDK}/.built

test: deps ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_COMBINATORIAL_DESIGNS_DATA=${DIST_WASM}/share/combinatorial_designs pnpm-exec cpython ${SRC}/test_combinatorial_designs.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_COMBINATORIAL_DESIGNS_DATA=${DIST_WASI_SDK}/share/combinatorial_designs ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_combinatorial_designs.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
