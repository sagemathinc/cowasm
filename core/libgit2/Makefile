# This builds libgit2.

include ../build/Makefile-vars

# See https://github.com/libgit2/libgit2/releases
VERSION = 1.5.0

URL = https://github.com/libgit2/libgit2/archive/refs/tags/v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/libgit2-${VERSION}.tar.gz

# Debug is HUGE
# BUILD_TYPE = Debug
# Release is pretty small
BUILD_TYPE = Release

ZLIB_WASM = $(shell cowasm-package-path @cowasm/zlib)

all: deps wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && cat ${SRC}/patches/00-fix_missing_max_align.patch | patch -p1
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-realpath-cast.patch | patch -p1
	cd ${BUILD_WASM} && cat ${SRC}/patches/02-validate_ownership.patch | patch -p1
	cp ${SRC}/ar ${BUILD_WASM}
	cp ${SRC}/ranlib ${BUILD_WASM}
	touch ${BUILD_WASM}/.patched

# Notes on options:
#   - -DBUILD_SHARED_LIBS=OFF is the only way to get a static library, which is what we want for our use.
${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&&	CC="cowasm-cc" \
			CFLAGS="-Oz -I${ZLIB_WASM}/include" \
			cmake -DCMAKE_AR="${BUILD_WASM}/ar" \
				-DCMAKE_RANLIB="${BUILD_WASM}/ranlib" \
				-DCMAKE_SIZEOF_VOID_P=4 \
				-DCMAKE_BUILD_TYPE=${BUILD_TYPE} \
				-DREGEX_BACKEND=regcomp \
				-DSONAME=OFF \
				-DUSE_HTTPS=OFF \
				-DBUILD_TESTS=OFF  \
				-DBUILD_CLI=OFF \
				-DTHREADSAFE=OFF \
				-DUSE_THREADS:BOOL=OFF \
				-DUSE_SSH=OFF \
				-DBUILD_CLAR=OFF \
				-DBUILD_EXAMPLES=OFF \
				-DBUILD_SHARED_LIBS=OFF \
				-DGIT_QSORT_S:INTERNAL= \
		&&	make -j8
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/lib
	cp ${BUILD_WASM}/liblibgit2package.a ${DIST_WASM}/lib/libgit2.a
	cp -r ${BUILD_WASM}/include ${DIST_WASM}/include
	ln -s ${SRC}/rebuild ${BUILD_WASM}
	touch ${DIST_WASM}/.built

TESTS = ${BUILD_WASM}/tests
test-init: node_modules ${DIST_WASM}/.built
	cd ../build && make zig
	${BIN}/cowasm-cc \
		-v -fvisibility-main -Oz -I${DIST_WASM}/include \
		-L${DIST_WASM}/lib -L${ZLIB_WASM}/lib -lgit2 -lz \
		${SRC}/test-init.c -o ${TESTS}/test-init
	rm -rf ${TESTS}/testrepo
	cowasm ${TESTS}/test-init ${TESTS}/testrepo
	cd ${TESTS}/testrepo && git status |grep "No commits yet"

test: test-init

