# This builds the vis editor.

include ../build/Makefile-vars

# See https://github.com/williamstein/vis/releases
# I forked and made a release so we could work with a specific tarball since upstream
# has been working on this for 2 years with lots of improvements, but without making any
# releases.
VERSION = 2022-09-26


URL = https://github.com/williamstein/vis/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/vis-${VERSION}.tar.gz

all: wasm

include ../build/Makefile-rules

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
		&&	CC="zig cc -target wasm32-wasi" CFLAGS="-Oz -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_MMAN -I. -I${PACKAGES}/posix-wasm/dist/wasm" ./configure --disable-curses --prefix=${DIST_WASM} --host=none \
		&&	make -j8 vis
	mkdir -p ${DIST_WASM}/bin
	cp ${BUILD_WASM}/vis ${DIST_WASM}/bin/
	touch ${DIST_WASM}/.built
