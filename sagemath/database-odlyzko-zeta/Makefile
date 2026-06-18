include ../build/Makefile-vars

all: wasm

# SageMath ships database_odlyzko_zeta as Andrew Odlyzko's zeta-zero table.
VERSION = 20061209
URL = https://mirrors.mit.edu/sage/spkg/upstream/database_odlyzko_zeta/database_odlyzko_zeta-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/database_odlyzko_zeta-${VERSION}.tar.bz2
TARBALL_SHA256 = 8919f01992718b9bf5c0602dbf16dd9d6f58b141b25f67f5cfd59f6cd0f9a0d4
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/odlyzko_zeta
	cp ${BUILD_WASM}/zeros6 ${DIST_WASM}/share/odlyzko_zeta/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/odlyzko_zeta
	cp ${BUILD_WASM}/zeros6 ${DIST_WASI_SDK}/share/odlyzko_zeta/
	touch ${DIST_WASI_SDK}/.built

test: deps ${DIST_WASM}/.built
	node -e 'const data = require("./"); if (!data.odlyzko_zeta.endsWith("dist/wasm/share/odlyzko_zeta")) process.exit(1)'
	PYTHONDONTWRITEBYTECODE=1 COWASM_ODLYZKO_ZETA_DATA=${DIST_WASM}/share/odlyzko_zeta pnpm-exec cpython ${SRC}/test_odlyzko_zeta.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	node -e 'const data = require("./"); if (!data.odlyzko_zeta.endsWith("dist/wasm/share/odlyzko_zeta")) process.exit(1)'
	PYTHONDONTWRITEBYTECODE=1 COWASM_ODLYZKO_ZETA_DATA=${DIST_WASI_SDK}/share/odlyzko_zeta ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_odlyzko_zeta.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
