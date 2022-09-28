# This builds the lua interpreter

include ../build/Makefile-vars

# See https://github.com/glennrp/libpng/releases


VERSION = 1.6.35

URL = https://github.com/glennrp/libpng/archive/refs/tags/v${VERSION}.tar.gz

TARBALL = ${UPSTREAM}/libpng-${VERSION}.tar.gz

ZLIB = ${PACKAGES}/zlib/dist

all: wasm

include ../build/Makefile-rules

###
# NATIVE
###


${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	rm -rf ${DIST_NATIVE}
	cd ${BUILD_NATIVE} \
		&&	CC="zig cc -I${ZLIB}/native/include -L${ZLIB}/native/lib" \
			./configure --prefix=${DIST_NATIVE} \
		&&	make \
		&&	make install
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
		&&	CC="zig cc -target wasm32-wasi -I${ZLIB}/wasm/include -L${ZLIB}/wasm/lib -D_WASI_EMULATED_SIGNAL " \
			./configure \
				--prefix=${DIST_WASM} \
				--host=none \
				--disable-shared \
		&&	make -j8 libpng16.la
	mkdir -p ${DIST_WASM}/lib && cp ${BUILD_WASM}/.libs/libpng16.a ${DIST_WASM}/lib/libpng.a
	mkdir -p ${DIST_WASM}/include && cp ${BUILD_WASM}/*.h ${DIST_WASM}/include/
	touch ${DIST_WASM}/.built

