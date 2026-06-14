
include ../build/Makefile-vars

# https://pari.math.u-bordeaux.fr/download.html
VERSION = 2.17.3
URL = https://pari.math.u-bordeaux.fr/pub/pari/unix/pari-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/pari-${VERSION}.tar.gz
TARBALL_SHA256 = 8d9c4fcd584c468d27e0f23c36836587284452094c4b1c404c20c4b810462dcb

all: deps wasm

include ../build/Makefile-rules

GMP_WASM = ${PACKAGES}/gmp/dist/wasm
#POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)

${GMP_WASM}/.built:
	make -C ${PACKAGES}/gmp

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && \
		cat ${SRC}/patches/01-pipes.patch | patch -p1
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: node_modules ${GMP_WASM}/.built ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} && \
	CC="zcc" \
	AR="zig ar" \
	RANLIB="zig ranlib" \
		./Configure  \
			--static \
			--host=wasm-wasi \
			--prefix=${DIST_WASM} \
			--graphic=none \
			--with-gmp=${GMP_WASM}
	# Missing bits/ headers with zig:
	cd ${BUILD_WASM}/O* && \
		mkdir -p bits && cd bits && echo "#define __jmp_buf int"> setjmp.h && echo "" > wordsize.h
	cd ${BUILD_WASM}/O* && \
		make -j8 AR="zig ar" RANLIB="zig ranlib" gp
	cd ${BUILD_WASM}/O* && \
		make AR="zig ar" RANLIB="zig ranlib" install
	cp ${BUILD_WASM}/O*/gp-sta.wasm ${DIST_WASM}/bin
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	./dist/wasm/bin/gp </dev/null | grep "portable C/GMP"
	echo "7*17*17" | ./dist/wasm/bin/gp |grep 2023
