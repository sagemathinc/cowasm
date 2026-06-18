include ../build/Makefile-vars

all: wasm

# SageMath offers database_kohel as modular and Hilbert polynomial data.
VERSION = 20160724
UPSTREAM_NAME = database_kohel
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/${UPSTREAM_NAME}-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.gz
TARBALL_SHA256 = 0e05b6ee5306862cffddd61b5b8635841307b8fee8787b69c29a0d55b0650860
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/database_kohel
	cp -r ${BUILD_WASM}/PolHeeg ${BUILD_WASM}/PolMod ${DIST_WASM}/share/database_kohel/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/database_kohel
	cp -r ${BUILD_WASM}/PolHeeg ${BUILD_WASM}/PolMod ${DIST_WASI_SDK}/share/database_kohel/
	touch ${DIST_WASI_SDK}/.built

test: deps ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_DATABASE_KOHEL_DATA=${DIST_WASM}/share/database_kohel pnpm-exec cpython ${SRC}/test_database_kohel.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_DATABASE_KOHEL_DATA=${DIST_WASI_SDK}/share/database_kohel ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_database_kohel.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
