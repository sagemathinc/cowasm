include ../build/Makefile-vars

all: wasm

# SageMath ships pari_seadata_small as PARI's small SEA database package.
VERSION = 20090618
UPSTREAM_NAME = pari_seadata_small
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL_SHA256 = 1992496212a965958ac36bb14c8e59d87086261c18d70aa4bc45ae4da464dcda

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/pari
	cp -R ${BUILD_WASM}/seadata ${DIST_WASM}/share/pari/
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	test -d ${DIST_WASM}/share/pari/seadata
	test -f ${DIST_WASM}/share/pari/seadata/README
	test -f ${DIST_WASM}/share/pari/seadata/sea0
	test -f ${DIST_WASM}/share/pari/seadata/sea2
