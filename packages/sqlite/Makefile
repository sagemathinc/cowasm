# See https://sqlite.org/src/doc/trunk/README.md
# https://www.sqlite.org/src/tarball/sqlite.tar.gz?r=release

CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
export PATH := ${CWD}/../../bin:${PATH}

BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
POSIX_WASM = ${CWD}/../posix-wasm/dist/wasm
ZLIB = ${CWD}/../zlib/dist
LIBEDIT = ${CWD}/../libedit/dist

all:  wasm

${BUILD}/source.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://www.sqlite.org/src/tarball/sqlite.tar.gz?r=release -o source.tar.gz

${BUILD}/wasm: ${BUILD}/source.tar.gz
	rm -rf ${BUILD}/wasm
	mkdir -p ${BUILD}/wasm
	cd ${BUILD} && tar xf source.tar.gz -C wasm --strip-components=1
	cp ${POSIX_WASM}/posix-wasm.h ${BUILD}/wasm/

# Notes on flags below.
#   - ?? MAYBE ?? Without -Oz (optimize for size rather than speed), we get 'Function addresses with offsets not supported' from LLVM during final link.
#     I put the -Oz flag into CFLAGS upon studying what the emscripten port uses.  This might not be true now
${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && \
		CC="zig-fPIC cc" \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CFLAGS="-Oz -I${ZLIB}/wasm/include -I${LIBEDIT}/wasm/include " \
		LDFLAGS="-lc -L${ZLIB}/wasm/lib  -L${LIBEDIT}/wasm/lib " \
		./configure --host=none  --prefix="${DIST_WASM}" \
			--disable-load-extension \
			--disable-threadsafe \
			--disable-largefile \
			--disable-libtool-lock \
			--disable-tcl \
			--disable-shared
	cd ${BUILD}/wasm && echo '#include "posix-wasm.h"' >> config.h
	cd ${BUILD}/wasm && make -j8
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

clean:
	rm -rf build dist
