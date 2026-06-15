include ../build/Makefile-vars

# See https://github.com/freetype/freetype/releases
VERSION = 2.13.3
BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

URL = https://download.savannah.gnu.org/releases/freetype/freetype-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/freetype-${VERSION}.tar.gz
TARBALL_SHA256 = 5c3a8e78f7b24c20b25b54ee575d6daa40007a5f4eea2845861c3409b3021747

all: deps wasm

include ../build/Makefile-rules

ZLIB_WASM = $(shell cowasm-package-path @cowasm/zlib)

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

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${BUILD_WASI_SDK}/.build
	$(MAKE) -C ../zlib test-wasi-sdk-standalone
	cd ../build && make wasi-sdk-next
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CWD}/../zlib/dist/wasi-sdk

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	mkdir ${BUILD_WASM}/bits
	echo "typedef int __jmp_buf;" > ${BUILD_WASM}/bits/setjmp.h
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} \
		&& CC="cowasm-cc -I${BUILD_WASM} -I${ZLIB_WASM}/include -L${ZLIB_WASM}/lib" \
			AR="zig ar" \
			RANLIB="zig ranlib" \
			./configure \
				--prefix=${DIST_WASM} \
				--host=none \
				--disable-shared \
				--enable-static \
				--with-zlib=yes \
				--with-bzip2=no \
				--with-png=no \
				--with-harfbuzz=no \
				--with-brotli=no \
		&& make -j8 \
		&& make install
	mkdir -p ${DIST_WASM}/include/bits
	cp ${BUILD_WASM}/bits/setjmp.h ${DIST_WASM}/include/bits/setjmp.h
	touch ${DIST_WASM}/.built

test: node_modules ${DIST_WASM}/.built
	printf '%s\n' \
		'#include <ft2build.h>' \
		'#include FT_FREETYPE_H' \
		'int main(void) {' \
		'  FT_Library library;' \
		'  if (FT_Init_FreeType(&library)) return 1;' \
		'  FT_Done_FreeType(library);' \
		'  return 0;' \
		'}' > ${BUILD_WASM}/cowasm-freetype-test.c
	cowasm-cc \
		-fvisibility-main \
		-I${DIST_WASM}/include \
		-I${DIST_WASM}/include/freetype2 \
		-I${ZLIB_WASM}/include \
		-L${DIST_WASM}/lib \
		-L${ZLIB_WASM}/lib \
		${BUILD_WASM}/cowasm-freetype-test.c \
		-lfreetype -lz \
		-o ${BUILD_WASM}/cowasm-freetype-test
	cowasm ${BUILD_WASM}/cowasm-freetype-test
