include ../build/Makefile-vars

all: wasm

# SageMath ships pari_elldata as PARI's elliptic-curve database package.
UPSTREAM_NAME = pari_elldata
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/elldata.tgz
TARBALL = ${UPSTREAM}/pari_elldata-elldata.tgz
TARBALL_SHA256 = 6c909f09bb19c8a8125145b1aac3758915daa7fd03530bc909dcb460d4eecb38
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/pari
	cp -R ${BUILD_WASM}/elldata ${DIST_WASM}/share/pari/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/pari
	cp -R ${BUILD_WASM}/elldata ${DIST_WASI_SDK}/share/pari/
	touch ${DIST_WASI_SDK}/.built

test: ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_PARI_ELLDATA=${DIST_WASM}/share/pari/elldata python3 ${SRC}/test_pari_elldata.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_PARI_ELLDATA=${DIST_WASI_SDK}/share/pari/elldata ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_pari_elldata.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
