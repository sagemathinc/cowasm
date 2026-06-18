include ../build/Makefile-vars

all: wasm

# SageMath ships pari_seadata as PARI's full SEA database package.
URL = https://mirrors.mit.edu/sage/spkg/upstream/pari_seadata/seadata.tgz
TARBALL = ${UPSTREAM}/seadata.tgz
TARBALL_SHA256 = c9282a525ea3f92c1f9c6c69e37ac5a87b48fb9ccd943cfd7c881a3851195833
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/pari
	cp -R ${BUILD_WASM}/seadata ${DIST_WASM}/share/pari/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/pari
	cp -R ${BUILD_WASM}/seadata ${DIST_WASI_SDK}/share/pari/
	touch ${DIST_WASI_SDK}/.built

test: ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_PARI_SEADATA=${DIST_WASM}/share/pari/seadata python3 ${SRC}/test_pari_seadata.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_PARI_SEADATA=${DIST_WASI_SDK}/share/pari/seadata ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_pari_seadata.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
