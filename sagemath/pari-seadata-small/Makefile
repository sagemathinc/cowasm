include ../build/Makefile-vars

all: wasm

# SageMath ships pari_seadata_small as PARI's small SEA database package.
VERSION = 20090618
UPSTREAM_NAME = pari_seadata_small
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL_SHA256 = 1992496212a965958ac36bb14c8e59d87086261c18d70aa4bc45ae4da464dcda
DIST_WASI_SDK = ${DIST}/wasi-sdk

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

define TEST_SEADATA
	test -d $(1)/share/pari/seadata
	test -f $(1)/share/pari/seadata/README
	test -f $(1)/share/pari/seadata/sea0
	test -f $(1)/share/pari/seadata/sea2
endef

test: ${DIST_WASM}/.built
	$(call TEST_SEADATA,${DIST_WASM})

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${DIST_WASI_SDK}/.built
	$(call TEST_SEADATA,${DIST_WASI_SDK})

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
