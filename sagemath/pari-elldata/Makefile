include ../build/Makefile-vars

all: wasm

# SageMath ships pari_elldata as PARI's elliptic-curve database package.
UPSTREAM_NAME = pari_elldata
URL = https://mirrors.mit.edu/sage/spkg/upstream/${UPSTREAM_NAME}/elldata.tgz
TARBALL = ${UPSTREAM}/pari_elldata-elldata.tgz
TARBALL_SHA256 = 6c909f09bb19c8a8125145b1aac3758915daa7fd03530bc909dcb460d4eecb38

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/pari
	cp -R ${BUILD_WASM}/elldata ${DIST_WASM}/share/pari/
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	test -d ${DIST_WASM}/share/pari/elldata
	test -f ${DIST_WASM}/share/pari/elldata/ell0
	test -f ${DIST_WASM}/share/pari/elldata/ell399
	test "$$(find ${DIST_WASM}/share/pari/elldata -type f | wc -l)" -ge 400
