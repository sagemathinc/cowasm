include ../build/Makefile-vars

all: wasm

# SageMath offers pari_nftables as PARI's number-field table data package.
UPSTREAM_NAME = pari_nftables
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/nftables.tgz
TARBALL = ${UPSTREAM}/pari_nftables-nftables.tgz
TARBALL_SHA256 = 8dd3393ce6b3cfcf599f094f7b22bdffe17c3ba25deb912513d54676bd7cfe92
DIST_WASI_SDK = ${DIST}/wasi-sdk
PYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm/bin/python3.wasm

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/pari/nftables
	cp -R ${BUILD_WASM}/* ${DIST_WASM}/share/pari/nftables/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/pari/nftables
	cp -R ${BUILD_WASM}/* ${DIST_WASI_SDK}/share/pari/nftables/
	touch ${DIST_WASI_SDK}/.built

test: ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_PARI_NFTABLES=${DIST_WASM}/share/pari/nftables python3 ${SRC}/test_pari_nftables.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_PARI_NFTABLES=${DIST_WASI_SDK}/share/pari/nftables ${BIN}/cowasm ${PYTHON_WASM} ${SRC}/test_pari_nftables.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
