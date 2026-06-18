include ../build/Makefile-vars

all: wasm

# SageMath ships database_symbolic_data as polynomial-system benchmark data.
VERSION = 20070206
UPSTREAM_NAME = database_symbolic_data
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL_SHA256 = 97eb42d007296c9a41bce65ada5ebf84c9341eaeda0b35a060e2d327042eb7fe
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/symbolic_data
	cp -r ${BUILD_WASM}/Data/XMLResources ${DIST_WASM}/share/symbolic_data/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/symbolic_data
	cp -r ${BUILD_WASM}/Data/XMLResources ${DIST_WASI_SDK}/share/symbolic_data/
	touch ${DIST_WASI_SDK}/.built

test: deps ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_SYMBOLIC_DATA=${DIST_WASM}/share/symbolic_data pnpm-exec cpython ${SRC}/test_symbolic_data.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_SYMBOLIC_DATA=${DIST_WASI_SDK}/share/symbolic_data ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_symbolic_data.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
