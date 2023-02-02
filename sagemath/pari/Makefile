
include ../build/Makefile-vars

# https://pari.math.u-bordeaux.fr/download.html
VERSION = 2.15.2
URL = https://pari.math.u-bordeaux.fr/pub/pari/unix/pari-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/pari-${VERSION}.tar.gz

all: deps wasm

include ../build/Makefile-rules

#GMP_WASM = $(shell cowasm-package-path @cowasm/gmp)
#POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.build
	cd ${BUILD_WASM} && \
		CC="zcc" \
		AR="zig ar" \
		RANLIB="zig ranlib" \
		./Configure  \
			--static \
			--host=wasm-wasi \
			--prefix=${DIST_WASM} \
			--graphic=none #--with-gmp=${GMP_WASM}
	# Missing bits/ headers with zig:
	cd ${BUILD_WASM}/O* && \
		mkdir -p bits && cd bits && echo "#define __jmp_buf int"> setjmp.h && echo "" > wordsize.h
	cd ${BUILD_WASM}/O* && \
		make -j8 AR="zig ar" RANLIB="zig ranlib" gp
	cd ${BUILD_WASM}/O* && \
		make AR="zig ar" RANLIB="zig ranlib" install

