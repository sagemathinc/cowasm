include ../build/Makefile-vars

all: wasm

# SageMath ships database_cremona_ellcurve as John Cremona's optional
# elliptic-curve database.
VERSION = 20190911
UPSTREAM_NAME = database_cremona_ellcurve
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL_SHA256 = 5d1d6aa35a95f9df123c87c1894791580d067444e1145bbd6ec20b4840f22053
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/cremona
	cp ${BUILD_WASM}/cremona.db ${DIST_WASM}/share/cremona/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/cremona
	cp ${BUILD_WASM}/cremona.db ${DIST_WASI_SDK}/share/cremona/
	touch ${DIST_WASI_SDK}/.built

test: deps ${DIST_WASM}/.built
	node -e 'const data = require("./"); if (!data.cremona.endsWith("dist/wasm/share/cremona")) process.exit(1)'
	PYTHONDONTWRITEBYTECODE=1 COWASM_CREMONA_DATA=${DIST_WASM}/share/cremona pnpm-exec cpython ${SRC}/test_cremona_ellcurve.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	node -e 'const data = require("./"); if (!data.cremona.endsWith("dist/wasm/share/cremona")) process.exit(1)'
	PYTHONDONTWRITEBYTECODE=1 COWASM_CREMONA_DATA=${DIST_WASI_SDK}/share/cremona ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_cremona_ellcurve.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
