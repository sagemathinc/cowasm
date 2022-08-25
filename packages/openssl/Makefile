include ../build/Makefile-vars

VERSION = 3.0.5
URL = https://github.com/openssl/openssl/archive/refs/tags/openssl-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/openssl-${VERSION}.tar.gz
POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm

all: wasm

include ../build/Makefile-rules

## Native

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.patched
	cd ${BUILD_NATIVE} \
		&& 	CC="zig cc" \
			AR="zig ar" \
			./Configure --prefix=${DIST_NATIVE} \
		&&	make -j8 \
		&&	make install
	touch ${DIST_NATIVE}/.built

## WASM

# Somebody else built openssl for webassembly once here
#   https://github.com/DigitalArsenal/openssl.js/tree/master/packages/openssl

${BUILD_WASM}/.patched:: ${BUILD_WASM}/.build
	cp ${POSIX_WASM}/posix-wasm.h ${BUILD_WASM}/


${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&& 	CC="zig-fPIC cc" \
			AR="zig ar" \
			RANLIB="zig ranlib" \
			./Configure --prefix=${DIST_WASM} gcc -no-tests -no-asm -static -no-sock -no-afalgeng \
		&&	echo '#include "posix-wasm.h"' >> e_os.h \
		&&	make -j8 \
		&&	make install
	touch ${DIST_WASM}/.built
