include ../build/Makefile-vars

# See https://github.com/solhuebner/rogue/releases
VERSION = v5.3-4.4.2020.1
URL = https://github.com/solhuebner/rogue/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/rogue-${VERSION}.tar.gz

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
TERMCAP = ${PACKAGES}/termcap/dist/wasm
NCURSES = ${PACKAGES}/ncurses/dist/wasm

all:  wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	# This patch deletes what was I think a hack to workaround an older version of ncurses.
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-delete-ncurses-hack.patch | patch -p1
	touch ${BUILD_WASM}/.patched

# We have to explicitly rebuild rogue linking in ncurses, because for some reason
# using LDFLAGS just doesn't work.
DEBUG = -g
${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&&	RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="cowasm-cc" \
			CXX="cowasm-c++" \
			CFLAGS="-fvisibility-main ${DEBUG} -Oz -Wno-deprecated-non-prototype -I${TERMCAP}/include -I${NCURSES}/include  -I${POSIX_WASM}" \
			./configure \
				--host=none \
				--prefix="${DIST_WASM}" \
		&& echo '#include "posix-wasm.h"' >> config.h \
		&& echo '#undef HAVE_WORKING_FORK' >> config.h \
		&& echo '#undef HAVE__SPAWNL' >> config.h \
		&& echo '#undef HAVE_SPAWNL' >> config.h \
		&& make -j8 \
		&& cowasm-cc ${DEBUG} *.o -L${NCURSES}/lib -lncurses -o rogue \
		&& make -j8 install
	touch ${DIST_WASM}/.built

