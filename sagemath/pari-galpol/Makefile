include ../build/Makefile-vars

all: wasm

# SageMath offers pari_galpol as PARI's Galois-polynomial data package.
UPSTREAM_NAME = pari_galpol
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/galpol.tgz
TARBALL = ${UPSTREAM}/pari_galpol-galpol.tgz
TARBALL_SHA256 = 562af28316ee335ee38c1172c2d5ecccb79f55c368fb9f2c6f40fc0f416bb01b
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/pari
	cp -R ${BUILD_WASM}/galpol ${DIST_WASM}/share/pari/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/pari
	cp -R ${BUILD_WASM}/galpol ${DIST_WASI_SDK}/share/pari/
	touch ${DIST_WASI_SDK}/.built

test: ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_PARI_GALPOL=${DIST_WASM}/share/pari/galpol python3 ${SRC}/test_pari_galpol.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_PARI_GALPOL=${DIST_WASI_SDK}/share/pari/galpol ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_pari_galpol.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
