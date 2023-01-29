# libffi

include ../build/Makefile-vars

all: wasm

# See https://github.com/sagemathinc/libffi/releases
# where we have a fork of libffi with autogen.sh run.

VERSION = 3.4.4
URL = https://github.com/sagemathinc/libffi/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/libffi-${VERSION}.tar.gz

include ../build/Makefile-rules

DEBUG = ""
# DEBUG = "-g"

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-configure.patch | patch -p1
	cp -rv ${SRC}/libffi-emscripten/* ${BUILD_WASM}
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	cd ${BUILD_WASM} && \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="cowasm-cc" \
		CXX="cowasm-c++" \
		CFLAGS="${DEBUG} -Oz" \
		./configure \
			--disable-docs \
			--host=wasm32-unknown-wasi \
			--prefix="${DIST_WASM}"
	mkdir -p ${BUILD_WASM}/wasm32-unknown-wasi/src/wasm32/.deps
	cd ${BUILD_WASM} && make
	cd ${BUILD_WASM} && make install
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	echo "it built successfully"