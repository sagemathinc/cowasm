# See https://ftp.gnu.org/pub/gnu/ncurses/?C=M;O=D


VERSION = 6.3

CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
WASM_POSIX = ${CWD}/../wasm-posix/dist
TERMCAP = ${CWD}/../termcap/dist/wasm

all:  wasm


${BUILD}/source.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://ftp.gnu.org/gnu/ncurses/ncurses-${VERSION}.tar.gz -o source.tar.gz

# NATIVE -- we do not need this or care about it.

${BUILD}/native: ${BUILD}/source.tar.gz
	rm -rf ${BUILD}/native
	mkdir -p ${BUILD}/native
	cd ${BUILD} && tar xf source.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" AR="zig ar" ./configure --prefix=${DIST_NATIVE}
	cd ${BUILD}/native && make -j8
	cd ${BUILD}/native && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built


# WASM -- this is very important.

${BUILD}/wasm: ${BUILD}/source.tar.gz
	rm -rf ${BUILD}/wasm
	mkdir -p ${BUILD}/wasm
	cd ${BUILD} && tar xf source.tar.gz -C wasm --strip-components=1
	cp ${WASM_POSIX}/wasm-posix.h ${BUILD}/wasm/include/
	# Patch terminfo.src, since there are two obscure entries (of the thousands) that prevent "make install" from working.
	cd ${BUILD}/wasm/misc && patch -p0 < ${CWD}/src/00-terminfo.patch

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && RANLIB="zig ranlib" AR="zig ar" CC="zig cc -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" CXX="zig c++ -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" CFLAGS="-I${TERMCAP}/include -L${TERMCAP}/lib" CXXFLAGS="-I${TERMCAP}/include -L${TERMCAP}/lib" ./configure --enable-termcap --build=`./config.guess` --host=none --prefix="${DIST_WASM}" --with-build-cc="zig cc"
	cd ${BUILD}/wasm/ncurses/tty && echo '#include "wasm-posix.h"' | cat - lib_tstp.c > tmp && mv tmp lib_tstp.c
	cd ${BUILD}/wasm/progs && echo '#include "wasm-posix.h"' | cat - tset.c > tmp && mv tmp tset.c
	cd ${BUILD}/wasm && make -j8
	cd ${BUILD}/wasm && make -j8 install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built


clean:
	rm -rf build dist
