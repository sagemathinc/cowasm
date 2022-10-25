#
# This is nowhere near porting, and I'm not particular interested
# in porting postgresql.   I did play around with fixes manually
# and it felt very much like Lua - similar problems, though of
# course postgres is HUGE -- nearly a million lines of code!
#

include ../build/Makefile-vars

VERSION = REL_15_0

URL = https://github.com/postgres/postgres/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/postgres-${VERSION}.tar.gz

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm

all: wasm

include ../build/Makefile-rules


###
# WASM
###

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} && \
		CC="cowasm-cc" \
		CXX="cowasm-c++" \
		AR="zig ar" \
		CFLAGS="-Oz -I${BUILD_WASM} -I${POSIX_WASM}/wasm" \
		./configure \
			--prefix=${DIST_WASM}  \
			--host=wasm32-unknown-wasi \
			--with-template=freebsd \
			--without-readline \
			--without-zlib \
			--disable-thread-safety \
	&&	make

test:
	echo "no tests yet"