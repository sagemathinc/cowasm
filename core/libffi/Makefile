# libffi

include ../build/Makefile-vars

all: deps wasm

# See https://github.com/sagemathinc/libffi/releases
# where we have a fork of libffi with autogen.sh run.

VERSION = 3.4.4
URL = https://github.com/sagemathinc/libffi/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/libffi-${VERSION}.tar.gz
TARBALL_SHA256 = 2bdbf3fce7e9c05f3e3384b10146b0be6ad08df89af95c8b0b3c7f30f6562a40
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang

include ../build/Makefile-rules

DEBUG = ""
# DEBUG = "-g"

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-configure.patch | patch -p1
	cp -rv ${SRC}/libffi-emscripten/* ${BUILD_WASM}
	touch ${BUILD_WASM}/.patched

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

${BUILD_CLANG}/.patched: ${BUILD_CLANG}/.build
	cd ${BUILD_CLANG} && cat ${SRC}/patches/01-configure.patch | patch -p1
	cp -rv ${SRC}/libffi-emscripten/* ${BUILD_CLANG}
	touch ${BUILD_CLANG}/.patched

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

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.patched
	@status=0; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} || status=$$?; \
		if [ "$${status}" = 77 ]; then \
			exit 0; \
		fi; \
		exit $${status}

.PHONY: clean-clang
clean-clang:
	rm -rf ${BUILD_CLANG} ${DIST_CLANG}

clean:: clean-clang
