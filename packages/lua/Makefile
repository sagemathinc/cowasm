# This builds the lua interpreter

include ../build/Makefile-vars

# See https://github.com/lua/lua/releases

VERSION = 5.4.4

URL = https://github.com/lua/lua/archive/refs/tags/v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/lua-${VERSION}.tar.gz

all: native wasm

include ../build/Makefile-rules

###
# NATIVE
###


${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	rm -rf ${DIST_NATIVE}
	cd ${BUILD_NATIVE} \
		&&	make CC="zig cc" CFLAGS="-O2" -j8
	mkdir -p ${DIST_NATIVE}/bin ${DIST_NATIVE}/lib ${DIST_NATIVE}/include
	cp ${BUILD_NATIVE}/*.h ${DIST_NATIVE}/include
	cp ${BUILD_NATIVE}/*.a ${DIST_NATIVE}/lib
	cp ${BUILD_NATIVE}/lua ${DIST_NATIVE}/bin/lua
	ln -sf ${DIST_NATIVE}/bin/lua ${BIN}/lua-native
	touch ${DIST_NATIVE}/.built

###
# WASM
###

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	mkdir ${BUILD_WASM}/bits
	echo "typedef int __jmp_buf;" > ${BUILD_WASM}/bits/setjmp.h
	touch ${BUILD_WASM}/.patched


${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} \
		&&	make RANLIB="zig ranlib" AR="zig ar rc" CC="zig cc -target wasm32-wasi" CFLAGS="-DL_tmpnam=32 -Oz -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_MMAN -I. -L${PACKAGES}/ncurses/dist/wasm/lib" -j8
	mkdir -p ${DIST_WASM}/bin ${DIST_WASM}/lib ${DIST_WASM}/include
	cp ${BUILD_WASM}/*.h ${DIST_WASM}/include
	cp ${BUILD_WASM}/*.a ${DIST_WASM}/lib
	cp ${BUILD_WASM}/lua ${DIST_WASM}/bin/lua
	touch ${DIST_WASM}/.built
