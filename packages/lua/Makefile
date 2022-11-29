# This builds the lua interpreter

include ../build/Makefile-vars

# See https://github.com/lua/lua/releases

VERSION = 5.4.4

URL = https://github.com/lua/lua/archive/refs/tags/v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/lua-${VERSION}.tar.gz

all: wasm ${BIN}/lua-wasm

include ../build/Makefile-rules

###
# NATIVE
###


${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../zig && make
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
# It barely works when used interactively, e.g., "a=2;b=3;" crashes.
# Scripts work to some limited extent.
###

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	mkdir ${BUILD_WASM}/bits
	echo "typedef int __jmp_buf;" > ${BUILD_WASM}/bits/setjmp.h
	touch ${BUILD_WASM}/.patched

TERMCAP_WASM = $(shell cowasm-package-path @cowasm/termcap)
LIBEDIT_WASM = $(shell cowasm-package-path @cowasm/libedit)

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../zig && make
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} \
		&&	make \
			MYLIBS="-ldl -ledit -L${LIBEDIT_WASM}/lib -ltermcap -L${TERMCAP_WASM}/lib" \
			RANLIB="zig ranlib" \
			AR="zig ar rc" \
			CC="cowasm-cc" \
			CFLAGS="-fvisibility-main -Oz -DL_tmpnam=32 -DLUA_USE_READLINE -I. -I${LIBEDIT_WASM}/include" \
			-j8
	mkdir -p ${DIST_WASM}/bin ${DIST_WASM}/lib ${DIST_WASM}/include
	cp ${BUILD_WASM}/*.h ${DIST_WASM}/include
	cp ${BUILD_WASM}/*.a ${DIST_WASM}/lib
	cp ${BUILD_WASM}/lua ${DIST_WASM}/bin/lua
	touch ${DIST_WASM}/.built

${BIN}/lua-wasm: ${DIST_WASM}/.built ${CWD}/bin/lua-wasm
	ln -sf ${CWD}/bin/lua-wasm ${BIN}/lua-wasm

test: node_modules ${DIST_WASM}/.built
	# echo "389*5077" | ${CWD}/bin/lua-wasm | grep 1974953  # this broke when I got editline working.
	npx @cowasm/kernel ${DIST_WASM}/bin/lua ${SRC}/sum.lua | grep 50000005000000