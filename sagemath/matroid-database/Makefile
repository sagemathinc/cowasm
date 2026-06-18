include ../build/Makefile-vars

all: wasm

# SageMath ships matroid_database as an optional combinatorics data package.
VERSION = 0.3
UPSTREAM_NAME = matroid-database
URL = https://files.pythonhosted.org/packages/24/86/18917645b7c512756205f987bd07b2c0c3409e41002e1dadf3ccf1a1bdf6/${UPSTREAM_NAME}-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.gz
TARBALL_SHA256 = 446057ae38700432efc3a2fca2b9ee21f6a3987f4c3589804cae39000c051b66
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}
	cp -R ${BUILD_WASM}/src/matroid_database ${DIST_WASM}/
	cp -R ${BUILD_WASM}/src/matroid_database.egg-info ${DIST_WASM}/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}
	cp -R ${BUILD_WASM}/src/matroid_database ${DIST_WASI_SDK}/
	cp -R ${BUILD_WASM}/src/matroid_database.egg-info ${DIST_WASI_SDK}/
	touch ${DIST_WASI_SDK}/.built

test: ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=${DIST_WASM} python3 ${SRC}/test_matroid_database.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=${DIST_WASI_SDK} ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_matroid_database.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
