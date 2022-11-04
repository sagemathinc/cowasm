include ../build/Makefile-vars

# See https://github.com/sagemathinc/rogue/releases
VERSION = v5.4.1
URL = https://github.com/sagemathinc/rogue/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/rogue-${VERSION}.tar.gz

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
TERMCAP = ${PACKAGES}/termcap/dist/wasm
NCURSES = ${PACKAGES}/ncurses/dist/wasm

all:  wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	touch ${BUILD_WASM}/.patched

#DEBUG = -g
DEBUG =
${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&&	RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="cowasm-cc" \
			CXX="cowasm-c++" \
			CFLAGS="-Wall -fvisibility-main ${DEBUG} -Oz -Wno-deprecated-non-prototype -I${TERMCAP}/include -I${NCURSES}/include  -I${POSIX_WASM}" \
			LDFLAGS="${DEBUG} -L${NCURSES}/lib -lncurses " \
			./configure \
				--host=none \
				--prefix="${DIST_WASM}" \
		&& echo '#include "posix-wasm.h"' >> config.h \
		&& echo '#undef HAVE_WORKING_FORK' >> config.h \
		&& echo '#undef HAVE__SPAWNL' >> config.h \
		&& echo '#undef HAVE_SPAWNL' >> config.h \
		&& echo '#undef HAVE_GETPASS' >> config.h \
		&& make -j8 \
		&& make -j8 install
	touch ${DIST_WASM}/.built

test:
	echo "no test of rogue yet"

