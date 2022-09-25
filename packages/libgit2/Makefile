# This builds libgit2.  The build itself does NOT actually work yet...

include ../build/Makefile-vars

# See https://github.com/libgit2/libgit2/releases
VERSION = 1.5.0

URL = https://github.com/libgit2/libgit2/archive/refs/tags/v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/libgit2-${VERSION}.tar.gz

# Debug is HUGE
# BUILD_TYPE = Debug
# Release is pretty small
BUILD_TYPE = Release

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm

all: wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && cat ${SRC}/patches/00-fix_missing_max_align.patch | patch -p1
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-realpath-cast.patch | patch -p1
	cd ${BUILD_WASM} && cat ${SRC}/patches/02-validate_ownership.patch | patch -p1
	touch ${BUILD_WASM}/.patched

# Notes on options:
#   - -DBUILD_SHARED_LIBS=OFF is the only way to get a static library, which is what we want for our use.
${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&&	CC="zig cc -Oz -target wasm32-wasi -D_WASI_EMULATED_MMAN" cmake -DCMAKE_SIZEOF_VOID_P=4 -DCMAKE_BUILD_TYPE=${BUILD_TYPE} -DREGEX_BACKEND=regcomp -DSONAME=OFF -DUSE_HTTPS=OFF -DBUILD_TESTS=OFF  -DBUILD_CLI=OFF -DTHREADSAFE=OFF -DUSE_THREADS:BOOL=OFF -DUSE_SSH=OFF -DBUILD_CLAR=OFF -DBUILD_EXAMPLES=OFF -DBUILD_SHARED_LIBS=OFF -DGIT_QSORT_S:INTERNAL= \
		&&	make -j8 \
		&& zig ranlib liblibgit2package.a
	rm -rf ${DIST_WASM}
	mkdir -p ${DIST_WASM}/lib
	cp ${BUILD_WASM}/liblibgit2package.a ${DIST_WASM}/lib/libgit2.a
	cp -r ${BUILD_WASM}/include ${DIST_WASM}/include
	ln -s ${SRC}/rebuild ${BUILD_WASM}
	touch ${DIST_WASM}/.built
