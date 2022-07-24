# See https://sqlite.org/src/doc/trunk/README.md
# https://www.sqlite.org/src/tarball/sqlite.tar.gz?r=release

CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
WASM_POSIX = ${CWD}/../wasm-posix/dist
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
	cp ${WASM_POSIX}/wasm-posix.h ${BUILD}/wasm/

# Notes on flags below.
#   - Without -Oz (optimize for size rather than speed), we get 'Function addresses with offsets not supported' from LLVM during final link.
#     I put the -Oz flag into CFLAGS upon studying what the emscripten port uses.
${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && \
		CC="zig cc" \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CFLAGS="-Oz -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID  -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_PROCESS_CLOCKS -I${ZLIB}/wasm/include -I${LIBEDIT}/wasm/include " \
		LDFLAGS="-lc -L${ZLIB}/wasm/lib  -L${LIBEDIT}/wasm/lib " \
		./configure --host=none  --prefix="${DIST_WASM}" \
			--disable-load-extension \
			--disable-threadsafe \
			--disable-largefile \
			--disable-libtool-lock \
			--disable-tcl
	cd ${BUILD}/wasm && echo '#include "wasm-posix.h"' >> config.h
	cd ${BUILD}/wasm && make -j8
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

clean:
	rm -rf build dist
