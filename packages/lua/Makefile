# This builds the lua interpreter

include ../build/Makefile-vars

# See https://github.com/lua/lua/releases

VERSION = 5.4.4

URL = https://github.com/lua/lua/archive/refs/tags/v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/lua-${VERSION}.tar.gz

all: native wasm ${BIN}/lua-wasm

include ../build/Makefile-rules

###
# NATIVE
###


${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	rm -rf ${DIST_NATIVE}
	cd ${BUILD_NATIVE} \
		&&	make MYLIBS="-ldl" CC="zig cc" CFLAGS="-O2 -DLUA_USE_POSIX=1" -j8
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
		&&	make \
			MYLIBS="-ldl" \
			RANLIB="zig ranlib" \
			AR="zig ar rc" \
			CC="cowasm-cc" \
			CFLAGS="-fvisibility-main -Oz -DL_tmpnam=32 -I." \
			LDFLAGS="-L${PACKAGES}/ncurses/dist/wasm/lib -lncurses" \
			-j8
	mkdir -p ${DIST_WASM}/bin ${DIST_WASM}/lib ${DIST_WASM}/include
	cp ${BUILD_WASM}/*.h ${DIST_WASM}/include
	cp ${BUILD_WASM}/*.a ${DIST_WASM}/lib
	cp ${BUILD_WASM}/lua ${DIST_WASM}/bin/lua
	touch ${DIST_WASM}/.built

${BIN}/lua-wasm: ${DIST_WASM}/.built ${CWD}/bin/lua-wasm
	ln -sf ${CWD}/bin/lua-wasm ${BIN}/lua-wasm

test: ${BIN}/lua-wasm
	echo "389*5077" | ${CWD}/bin/lua-wasm | grep 1974953
