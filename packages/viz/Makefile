# This builds the vis editor.

include ../build/Makefile-vars

# See https://github.com/sagemathinc/viz/releases

VERSION = 0.8.4

URL = https://github.com/sagemathinc/viz/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/viz-${VERSION}.tar.gz

LUA = ${PACKAGES}/lua/dist/

all: native ${BIN}/viz-native wasm ${BIN}/viz-wasm

include ../build/Makefile-rules

###
# NATIVE
###


${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../zig && make
	cd ../lua && make native
	rm -rf ${DIST_NATIVE}
	cd ${BUILD_NATIVE} \
		&&	CC="zig cc" \
			CFLAGS="-O2 -I${LUA}/native/include " \
			LDFLAGS="-L${LUA}/native/lib -llua " \
			./configure --prefix=${DIST_NATIVE} \
		&&	make -j8 install
	touch ${DIST_NATIVE}/.built

${BIN}/viz-native: ${DIST_NATIVE}/.built ${CWD}/bin/viz-native
	ln -sf ${CWD}/bin/viz-native ${BIN}/viz-native
	touch ${BIN}/viz-native


###
# WASM
###


${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	mkdir -p ${BUILD_WASM}/bits/
	# Adding header at the beginning:
	echo '#include "posix-wasm.h"' | cat - ${BUILD_WASM}/vis.c > ${BUILD_WASM}/tmp && mv ${BUILD_WASM}/tmp ${BUILD_WASM}/vis.c
	echo '#include "posix-wasm.h"' > ${BUILD_WASM}/setjmp.h
	echo '#define TIOCGWINSZ 0x5413' >> ${BUILD_WASM}/setjmp.h
	echo '#include "posix-wasm.h"' > ${BUILD_WASM}/bits/setjmp.h
	echo '#include "posix-wasm.h"' | cat - ${BUILD_WASM}/vis.h > ${BUILD_WASM}/tmp && mv ${BUILD_WASM}/tmp ${BUILD_WASM}/vis.h
	echo '#include "posix-wasm.h"' | cat - ${BUILD_WASM}/text-io.c > ${BUILD_WASM}/tmp && mv ${BUILD_WASM}/tmp ${BUILD_WASM}/text-io.c
	touch ${BUILD_WASM}/.patched


NCURSES_WASM = $(shell cowasm-package-path @cowasm/ncurses)
LUA_WASM = $(shell cowasm-package-path @cowasm/lua)
POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)

${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../zig && make
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} \
		&&	CC="cowasm-cc" \
			CFLAGS="-v -Oz -fvisibility-main -I. -I${POSIX_WASM} -I${NCURSES_WASM}/include -I${NCURSES_WASM}/include/ncurses -I${LUA_WASM}/include" \
			LDFLAGS="-L${LUA_WASM}/lib -llua -L${NCURSES_WASM}/lib -lncurses " \
			./configure --prefix=${DIST_WASM} \
		&&	make -j8 viz
	mkdir -p ${DIST_WASM}/bin
	cp ${BUILD_WASM}/viz ${DIST_WASM}/bin/
	touch ${DIST_WASM}/.built

${BIN}/viz-wasm: ${DIST_WASM}/.built ${CWD}/bin/viz-wasm
	ln -sf ${CWD}/bin/viz-wasm ${BIN}/viz-wasm
	touch ${BIN}/viz-wasm

test: all
	echo "it built!"
