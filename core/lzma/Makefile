include ../build/Makefile-vars

BUILD_CLANG = ${BUILD}/clang
DIST_CLANG = ${DIST}/clang
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: deps wasm

# LZMA doesn't change, but I didn't want to force git clone, so I made
# a fork and a release myself.

VERSION = 1.1
URL = https://github.com/sagemathinc/lzma/archive/refs/tags/v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/lzma-v${VERSION}.tar.gz
TARBALL_SHA256 = c6e54740d375646d0fdd4b560b1cc0feec6c3aca498004d171900e0043f35eba

include ../build/Makefile-rules

${BUILD_CLANG}/.build: ${TARBALL}
	rm -rf ${BUILD_CLANG}
	mkdir -p ${BUILD_CLANG}
	tar xf ${TARBALL} -C ${BUILD_CLANG} --strip-components=1
	touch ${BUILD_CLANG}/.build

.PHONY: test-clang-standalone
test-clang-standalone: ${BUILD_CLANG}/.build
	$(MAKE) -C ../posix-wasm wasm
	@status=0; \
	${SRC}/test-clang-standalone.sh ${BUILD_CLANG} ${DIST_CLANG} ${BIN} ${CWD}/../posix-wasm/dist/wasm || status=$$?; \
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
	cd ../build && make wasi-sdk-next
	$(MAKE) -C ../posix-wasm wasm
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CWD}/../posix-wasm/dist/wasm

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../build && make zig
	cd ${BUILD_NATIVE} && \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="zig cc ${ZIG_NATIVE_CFLAGS}" \
		CXX="zig c++ ${ZIG_NATIVE_CFLAGS}" \
		./configure \
			--build=`./build-aux/config.guess` \
			--host=none --prefix="${DIST_NATIVE}"
	cd ${BUILD_NATIVE} && make -j4 && make install
	touch ${DIST_NATIVE}/.built

POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)

DEBUG = ""
# DEBUG = "-g"

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.build
	cd ../build && make zig
	cd ${BUILD_WASM} && \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="cowasm-cc" \
		CXX="cowasm-c++" \
		CFLAGS="${DEBUG} -Oz -fvisibility-main -I${POSIX_WASM}" \
		./configure \
			--build=`./build-aux/config.guess` \
			--host=none \
			--prefix="${DIST_WASM}" \
			--without-libiconv-prefix  \
			--without-libintl-prefix \
			--disable-threads \
			--disable-assembler
	echo '#include "posix-wasm.h"' >> ${BUILD_WASM}/config.h
	cd ${BUILD_WASM} && make -j8 && make install
	zig ranlib ${DIST_WASM}/lib/liblzma.a  # needed on linux
	touch ${DIST_WASM}/.built

TEST = ${BUILD_WASM}/TEST
test: node_modules ${DIST_WASM}/.built
	rm -rf ${TEST}
	mkdir -p ${TEST}
	# Compress and decompress the Makefile using xz
	cp Makefile ${TEST}/Makefile
	cowasm ${DIST_WASM}/bin/xz -z ${TEST}/Makefile
	cowasm ${DIST_WASM}/bin/xz -d ${TEST}/Makefile.xz
	cmp Makefile ${TEST}/Makefile
	rm ${TEST}/Makefile
