include ../build/Makefile-vars

all: wasm

# SageMath ships database_stein_watkins_mini as the small Stein-Watkins
# elliptic-curve database.
VERSION = 20070827
UPSTREAM_NAME = database_stein_watkins_mini
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL_SHA256 = adacd565277629238a14fd7d52f35a7516dfcd1d8875cb0c480cb56bd2cbb875
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/stein_watkins
	cp ${BUILD_WASM}/swdb/*.bz2 ${DIST_WASM}/share/stein_watkins/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/stein_watkins
	cp ${BUILD_WASM}/swdb/*.bz2 ${DIST_WASI_SDK}/share/stein_watkins/
	touch ${DIST_WASI_SDK}/.built

test: deps ${DIST_WASM}/.built
	node -e 'const data = require("./"); if (!data.stein_watkins.endsWith("dist/wasm/share/stein_watkins")) process.exit(1)'
	PYTHONDONTWRITEBYTECODE=1 COWASM_STEIN_WATKINS_DATA=${DIST_WASM}/share/stein_watkins pnpm-exec cpython ${SRC}/test_stein_watkins_mini.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	node -e 'const data = require("./"); if (!data.stein_watkins.endsWith("dist/wasm/share/stein_watkins")) process.exit(1)'
	PYTHONDONTWRITEBYTECODE=1 COWASM_STEIN_WATKINS_DATA=${DIST_WASI_SDK}/share/stein_watkins ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_stein_watkins_mini.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
