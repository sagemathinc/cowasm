include ../build/Makefile-vars

# See https://github.com/openssl/openssl/tags
VERSION = 3.0.7
URL = https://github.com/openssl/openssl/archive/refs/tags/openssl-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/openssl-${VERSION}.tar.gz
POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm

all: wasm

include ../build/Makefile-rules

## Native

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} \
		&& 	CC="zig cc ${ZIG_NATIVE_CFLAGS} " \
			AR="zig ar" \
			LDFLAGS="-shared" \
			./Configure --prefix=${DIST_NATIVE} -no-tests  -no-asm -static -no-afalgeng \
		&&	make -j8 build_sw\
		&&	make -j8 install_sw
	touch ${DIST_NATIVE}/.built

## WASM

# Somebody else built openssl for webassembly once here
#   https://github.com/DigitalArsenal/openssl.js/tree/master/packages/openssl

${BUILD_WASM}/.patched:: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&&  patch --strip 1 < ${SRC}/patches/00-af-unix.patch \
		&&  patch --strip 1 < ${SRC}/patches/01-cleanup-hack.patch \
		&&	echo '#include "posix-wasm.h"' >> e_os.h \
		&&	echo '#include "posix-wasm.h"' >> include/openssl/crypto.h \
		&&	echo "#undef AF_UNIX" >> e_os.h \
		&&	echo "#undef AF_UNIX" >> include/internal/thread_once.h
	touch ${BUILD_WASM}/.patched


DEBUG = ""
# Uncomment for debugging symbols:
# DEBUG="-g"


# make -j12, since openssl is structured as huge number of tiny files.
${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&& 	CC="cowasm-cc" \
			CFLAGS="-Oz ${DEBUG} -fvisibility-main -I${POSIX_WASM}" \
			AR="zig ar" \
			RANLIB="zig ranlib" \
			./Configure --prefix=${DIST_WASM} gcc no-async no-threads no-shared no-tests no-asm no-afalgeng \
		&&	make -j12 build_sw \
		&&	make -j12 install_sw
	touch ${DIST_WASM}/.built

# maybe doesn't even build yet...
test:
	echo "no tests yet"