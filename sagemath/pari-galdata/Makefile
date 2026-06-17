include ../build/Makefile-vars

all: wasm

# SageMath ships pari_galdata as PARI's Galois-group database package.
VERSION = 20080411
UPSTREAM_NAME = pari_galdata
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL_SHA256 = 3d3ce1cec77a523971f53c225b78ed8bdd23e2fbfce03742d93a65a8fe4021cf
DIST_WASI_SDK = ${DIST}/wasi-sdk

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/pari
	cp -R ${BUILD_WASM}/galdata ${DIST_WASM}/share/pari/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/pari
	cp -R ${BUILD_WASM}/galdata ${DIST_WASI_SDK}/share/pari/
	touch ${DIST_WASI_SDK}/.built

define TEST_GALDATA
	test -d $(1)/share/pari/galdata
	test -f $(1)/share/pari/galdata/COS8_10_2
	test -f $(1)/share/pari/galdata/COS11_7_6
	test "$$(find $(1)/share/pari/galdata -type f | wc -l)" -gt 100
endef

test: ${DIST_WASM}/.built
	$(call TEST_GALDATA,${DIST_WASM})

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	$(call TEST_GALDATA,${DIST_WASI_SDK})

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
