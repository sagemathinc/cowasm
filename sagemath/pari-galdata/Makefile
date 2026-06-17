include ../build/Makefile-vars

all: wasm

# SageMath ships pari_galdata as PARI's Galois-group database package.
VERSION = 20080411
UPSTREAM_NAME = pari_galdata
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/${UPSTREAM_NAME}-${VERSION}.tar.bz2
TARBALL_SHA256 = 3d3ce1cec77a523971f53c225b78ed8bdd23e2fbfce03742d93a65a8fe4021cf

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/pari
	cp -R ${BUILD_WASM}/galdata ${DIST_WASM}/share/pari/
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	test -d ${DIST_WASM}/share/pari/galdata
	test -f ${DIST_WASM}/share/pari/galdata/COS8_10_2
	test -f ${DIST_WASM}/share/pari/galdata/COS11_7_6
	test "$$(find ${DIST_WASM}/share/pari/galdata -type f | wc -l)" -gt 100
