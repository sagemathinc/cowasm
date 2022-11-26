include ../build/Makefile-vars

all: native wasm

# LZMA doesn't change, but I didn't want to force git clone, so I made
# a fork and a release myself.

VERSION = 1.1
URL = https://github.com/sagemathinc/lzma/archive/refs/tags/v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/lzma-v${VERSION}.tar.gz

include ../build/Makefile-rules

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
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

node_modules:
	npm install

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.build
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
test: ${DIST_WASM}/.built
	rm -rf ${TEST}
	mkdir -p ${TEST}
	# Compress and decompress the Makefile using xz
	cp Makefile ${TEST}/Makefile
	${BIN}/cowasm ${DIST_WASM}/bin/xz -z ${TEST}/Makefile
	${BIN}/cowasm ${DIST_WASM}/bin/xz -d ${TEST}/Makefile.xz
	cmp Makefile ${TEST}/Makefile
	rm ${TEST}/Makefile
