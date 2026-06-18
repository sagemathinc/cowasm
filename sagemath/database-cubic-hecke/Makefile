include ../build/Makefile-vars

all: wasm

# SageMath uses database_cubic_hecke for cubic Hecke algebra representation data.
VERSION = 2022.4.4
UPSTREAM_NAME = database_cubic_hecke
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/${UPSTREAM_NAME}-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.gz
TARBALL_SHA256 = 553654a4ce987a277fe956a9a450d738bd1f58b96c45499075e28f2bca927ae9
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

define INSTALL_DATABASE_CUBIC_HECKE
	rm -rf $(1)
	mkdir -p $(1)
	cp -r ${BUILD_WASM}/database_cubic_hecke $(1)/
	cp -r ${BUILD_WASM}/database_cubic_hecke.egg-info $(1)/
	touch $(1)/.built
endef

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	$(call INSTALL_DATABASE_CUBIC_HECKE,${DIST_WASM})

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	$(call INSTALL_DATABASE_CUBIC_HECKE,${DIST_WASI_SDK})

test: deps ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=${DIST_WASM} pnpm-exec cpython ${SRC}/test_cubic_hecke.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=${DIST_WASI_SDK} ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_cubic_hecke.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
