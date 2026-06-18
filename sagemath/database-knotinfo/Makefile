include ../build/Makefile-vars

all: wasm

# SageMath ships database_knotinfo for knot and link invariant tables.
UPSTREAM_NAME = database_knotinfo
VERSION = 2026.6.1
URL = https://files.pythonhosted.org/packages/bb/ad/d57c4d56c23df66431c525dfaad9f5a600b3e0f367a6e9172be03615ad09/${UPSTREAM_NAME}-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.gz
TARBALL_SHA256 = 989ba9c3d59c946c863192e421ee5adf39d8505ca1769dcd76817a165e5e7edf
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cp -R ${BUILD_WASM}/${UPSTREAM_NAME} ${DIST_WASM}/
	cp -R ${BUILD_WASM}/${UPSTREAM_NAME}.egg-info ${DIST_WASM}/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}
	cp -R ${BUILD_WASM}/${UPSTREAM_NAME} ${DIST_WASI_SDK}/
	cp -R ${BUILD_WASM}/${UPSTREAM_NAME}.egg-info ${DIST_WASI_SDK}/
	touch ${DIST_WASI_SDK}/.built

test: ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=${DIST_WASM} python3 ${SRC}/test_database_knotinfo.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=${DIST_WASI_SDK} ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_database_knotinfo.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
