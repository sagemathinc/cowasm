include ../build/Makefile-vars

all: wasm

# SageMath ships cunningham_tables as a standard number-theory data package.
VERSION = 1.0
URL = https://github.com/sagemath/sage-package/releases/download/tars/cunningham_tables-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/cunningham_tables-${VERSION}.tar.gz
TARBALL_SHA256 = ef39ab25bef5b1813071c9bd96abe3a9e683d5595c9654a3ffde5b07b7fe52b0
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/cunningham_tables
	cp -R ${BUILD_WASM}/src/cunningham_tables/* ${DIST_WASM}/share/cunningham_tables/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/cunningham_tables
	cp -R ${BUILD_WASM}/src/cunningham_tables/* ${DIST_WASI_SDK}/share/cunningham_tables/
	touch ${DIST_WASI_SDK}/.built

test: ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_CUNNINGHAM_TABLES_DATA=${DIST_WASM}/share/cunningham_tables ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_cunningham_tables.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_CUNNINGHAM_TABLES_DATA=${DIST_WASI_SDK}/share/cunningham_tables ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_cunningham_tables.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
