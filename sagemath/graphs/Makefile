include ../build/Makefile-vars

all: wasm

# SageMath ships graphs as a standard combinatorial graph database package.
VERSION = 20210214
URL = https://github.com/sagemath/sage-package/releases/download/tars/graphs-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/graphs-${VERSION}.tar.bz2
TARBALL_SHA256 = 07237c0d9853611505c389fd7bb92500c8743f5631babb4d0f45dfd8332f3741

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/graphs
	cp ${BUILD_WASM}/graphs.db ${DIST_WASM}/share/graphs/
	cp ${BUILD_WASM}/brouwer_srg_database.json ${DIST_WASM}/share/graphs/
	cp ${BUILD_WASM}/smallgraphs.txt ${DIST_WASM}/share/graphs/
	cp ${BUILD_WASM}/isgci_sage.xml ${DIST_WASM}/share/graphs/
	touch ${DIST_WASM}/.built

test: deps ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_GRAPHS_DATA=${DIST_WASM}/share/graphs pnpm-exec cpython ${SRC}/test_graphs.py
