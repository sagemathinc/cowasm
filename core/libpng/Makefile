# This builds the libpng image manipulation library, which is needed for luatex.

include ../build/Makefile-vars

# See https://github.com/glennrp/libpng/releases


VERSION = 1.6.35
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang

URL = https://github.com/glennrp/libpng/archive/refs/tags/v${VERSION}.tar.gz

TARBALL = ${UPSTREAM}/libpng-${VERSION}.tar.gz
TARBALL_SHA256 = 6d59d6a154ccbb772ec11772cb8f8beb0d382b61e7ccc62435bf7311c9f4b210


all: deps wasm

include ../build/Makefile-rules

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.build
	$(MAKE) -C ../zlib test-clang-standalone
	@status=0; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} ${CWD}/../zlib/dist/clang || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: clean-clang
clean-clang:
	rm -rf ${BUILD_CLANG} ${DIST_CLANG}

clean:: clean-clang

###
# NATIVE
###

ZLIB_NATIVE = ${PACKAGES}/zlib/dist/native

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../zlib && make native
	cd ../build && make zig
	rm -rf ${DIST_NATIVE}
	cd ${BUILD_NATIVE} \
		&&	CC="zig cc -I${ZLIB_NATIVE}/include -L${ZLIB_NATIVE}/lib" \
			./configure --prefix=${DIST_NATIVE} \
		&&	make -j8 \
		&&	make install
	touch ${DIST_NATIVE}/.built

###
# WASM
###

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	mkdir ${BUILD_WASM}/bits
	echo "typedef int __jmp_buf;" > ${BUILD_WASM}/bits/setjmp.h
	touch ${BUILD_WASM}/.patched



# the __COVERITY__ below makes it not use tmpfile, which we haven't implemented yet.

ZLIB_WASM = $(shell cowasm-package-path @cowasm/zlib)

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	rm -rf ${DIST_WASM}
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&&	CC="cowasm-cc -fvisibility-main -I${ZLIB_WASM}/include -L${ZLIB_WASM}/lib -D__COVERITY__" \
			AR="zig ar" \
			RANLIB="zig ranlib" \
			./configure \
				--prefix=${DIST_WASM} \
				--host=none \
				--disable-shared \
		&& make -j8 libpng16.la timepng
	mkdir -p ${DIST_WASM}/lib && cp ${BUILD_WASM}/.libs/libpng16.a ${DIST_WASM}/lib/libpng.a
	mkdir -p ${DIST_WASM}/include && cp ${BUILD_WASM}/png.h ${BUILD_WASM}/pngconf.h  ${BUILD_WASM}/pnglibconf.h ${DIST_WASM}/include/
	touch ${DIST_WASM}/.built

test: node_modules ${DIST_WASM}/.built
	cowasm ${BUILD_WASM}/timepng  ${BUILD_WASM}/pngnow.png
