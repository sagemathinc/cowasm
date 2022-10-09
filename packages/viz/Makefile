# This builds the vis editor.

include ../build/Makefile-vars

# See https://github.com/sagemathinc/viz/releases

VERSION = 0.8.3

URL = https://github.com/sagemathinc/viz/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/viz-${VERSION}.tar.gz

NCURSES=${PACKAGES}/ncurses/dist/
TERMCAP=${PACKAGES}/termcap/dist/
LUA=${PACKAGES}/lua/dist/
POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm

all: native wasm

include ../build/Makefile-rules

###
# NATIVE
###


${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	rm -rf ${DIST_NATIVE}
	cd ${BUILD_NATIVE} \
		&&	CC="zig cc" \
			CFLAGS="-O2 -I${LUA}/native/include " \
			LDFLAGS="${LUA}/native/lib/liblua.a " \
			./configure --prefix=${DIST_NATIVE} \
		&&	make -j8 \
		&&	make install
	ln -sf ${DIST_NATIVE}/bin/viz  ${BIN}/viz-native
	touch ${DIST_NATIVE}/.built

###
# WASM
###

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	mkdir -p ${BUILD_WASM}/bits/
	echo '#include "posix-wasm.h"' | cat - ${BUILD_WASM}/vis.c > ${BUILD_WASM}/tmp && mv ${BUILD_WASM}/tmp ${BUILD_WASM}/vis.c
	echo '#include "posix-wasm.h"' > ${BUILD_WASM}/setjmp.h
	echo '#define TIOCGWINSZ 0x5413' >> ${BUILD_WASM}/setjmp.h
	echo '#include "posix-wasm.h"' > ${BUILD_WASM}/bits/setjmp.h
	echo '#include "posix-wasm.h"' | cat - ${BUILD_WASM}/vis.h > ${BUILD_WASM}/tmp && mv ${BUILD_WASM}/tmp ${BUILD_WASM}/vis.h
	echo '#include "posix-wasm.h"' | cat - ${BUILD_WASM}/text-io.c > ${BUILD_WASM}/tmp && mv ${BUILD_WASM}/tmp ${BUILD_WASM}/text-io.c
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} \
		&&	CC="zig cc -target wasm32-wasi" \
			CFLAGS="-Oz -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_MMAN -I. -I${PACKAGES}/posix-wasm/dist/wasm -I${NCURSES}/wasm/include -I${NCURSES}/wasm/include/ncurses -I${LUA}/wasm/include" \
			LDFLAGS="${LUA}/wasm/lib/liblua.a ${NCURSES}/wasm/lib/libncurses.a ${TERMCAP}/wasm/lib/libtermcap.a ${POSIX_WASM}/libposix.a -lwasi-emulated-mman -lwasi-emulated-process-clocks -lwasi-emulated-signal -lc" \
			./configure --prefix=${DIST_WASM} \
		&&	make -j8 viz
	mkdir -p ${DIST_WASM}/bin
	cp ${BUILD_WASM}/viz ${DIST_WASM}/bin/viz.wasm
	touch ${DIST_WASM}/.built
