include ../build/Makefile-vars

all: wasm

# SageMath ships polytopes_db as the standard reflexive-polytope data package.
VERSION = 20170220
URL = https://mirrors.mit.edu/sage/spkg/upstream/polytopes_db/polytopes_db-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/polytopes_db-${VERSION}.tar.bz2
TARBALL_SHA256 = cb788bdfca6e00864ec0bfa67932a68ae68bfeb9c527a91be90ad218026a0ce0
DIST_WASI_SDK = ${DIST}/wasi-sdk

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/share/polytopes_db
	cp ${BUILD_WASM}/reflexive_polytopes_2d ${DIST_WASM}/share/polytopes_db/
	cp ${BUILD_WASM}/reflexive_polytopes_3d ${DIST_WASM}/share/polytopes_db/
	cp -R ${BUILD_WASM}/Full2d ${DIST_WASM}/share/polytopes_db/
	cp -R ${BUILD_WASM}/Full3d ${DIST_WASM}/share/polytopes_db/
	touch ${DIST_WASM}/.built

${DIST_WASI_SDK}/.built: ${BUILD_WASM}/.build
	rm -rf ${DIST_WASI_SDK}
	mkdir -p ${DIST_WASI_SDK}/share/polytopes_db
	cp ${BUILD_WASM}/reflexive_polytopes_2d ${DIST_WASI_SDK}/share/polytopes_db/
	cp ${BUILD_WASM}/reflexive_polytopes_3d ${DIST_WASI_SDK}/share/polytopes_db/
	cp -R ${BUILD_WASM}/Full2d ${DIST_WASI_SDK}/share/polytopes_db/
	cp -R ${BUILD_WASM}/Full3d ${DIST_WASI_SDK}/share/polytopes_db/
	touch ${DIST_WASI_SDK}/.built

test: deps ${DIST_WASM}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_POLYTOPES_DB_DATA=${DIST_WASM}/share/polytopes_db pnpm-exec cpython ${SRC}/test_polytopes_db.py

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: deps ${DIST_WASI_SDK}/.built
	PYTHONDONTWRITEBYTECODE=1 COWASM_POLYTOPES_DB_DATA=${DIST_WASI_SDK}/share/polytopes_db pnpm-exec cpython ${SRC}/test_polytopes_db.py

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${DIST_WASI_SDK}

clean:: clean-wasi-sdk
