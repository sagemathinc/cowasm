# This builds the vis editor.

include ../build/Makefile-vars

# See https://github.com/sagemathinc/viz/releases

VERSION = 0.8.0

URL = https://github.com/sagemathinc/viz/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/viz-${VERSION}.tar.gz

all: native wasm

include ../build/Makefile-rules

###
# NATIVE
###


${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	rm -rf ${DIST_NATIVE}
	cd ${BUILD_NATIVE} \
		&&	CC="zig cc" \
			CFLAGS="-O2 -I${PACKAGES}/lua/dist/native/include -L${PACKAGES}/lua/dist/native/lib" \
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

# NOTE: you have to also build the ncurses package to get this to work below.
# Also, ncurses makes this MUCH bigger.   I wonder what it adds to functionality?

${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} \
		&&	CC="zig cc -target wasm32-wasi" \
			CFLAGS="-Oz -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_MMAN -I. -I${PACKAGES}/posix-wasm/dist/wasm -I${PACKAGES}/ncurses/dist/wasm/include -I${PACKAGES}/ncurses/dist/wasm/include/ncurses -L${PACKAGES}/ncurses/dist/wasm/lib  -I${PACKAGES}/lua/dist/wasm/include -L${PACKAGES}/lua/dist/wasm/lib" \
			./configure --prefix=${DIST_WASM} \
		&&	make -j8 viz
	mkdir -p ${DIST_WASM}/bin
	cp ${BUILD_WASM}/viz ${DIST_WASM}/bin/viz.wasm
	touch ${DIST_WASM}/.built
