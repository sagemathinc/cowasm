include ../build/Makefile-vars

# See https://github.com/sagemathinc/rogue/releases
VERSION = v5.4.1
URL = https://github.com/sagemathinc/rogue/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/rogue-${VERSION}.tar.gz

POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
TERMCAP_WASM = $(shell cowasm-package-path @cowasm/termcap)
NCURSES_WASM = $(shell cowasm-package-path @cowasm/ncurses)

all:  wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	touch ${BUILD_WASM}/.patched

#DEBUG = -g
DEBUG =

# Below we use "--build=arm" since there are problems with ./config.guess
# and it doesn't matter anyways since no native code gets run as part of the
# build.  It's just an autconf shortcoming.  Without this, build fails on
# aarch64 linux.  With updated config.guess, build fails on aarch64-mac.
# So simple solution.
${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&&	RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="cowasm-cc" \
			CXX="cowasm-c++" \
			CFLAGS="-Wall -fvisibility-main ${DEBUG} -Oz -Wno-deprecated-non-prototype -I${TERMCAP_WASM}/include -I${NCURSES_WASM}/include -I${NCURSES_WASM}/include/ncurses  -I${POSIX_WASM}" \
			LDFLAGS="${DEBUG} -L${NCURSES_WASM}/lib -lncurses " \
			./configure \
				--host=none \
				--build=arm \
				--prefix="${DIST_WASM}" \
		&& echo '#include "posix-wasm.h"' >> config.h \
		&& echo '#undef HAVE_WORKING_FORK' >> config.h \
		&& echo '#undef HAVE__SPAWNL' >> config.h \
		&& echo '#undef HAVE_SPAWNL' >> config.h \
		&& echo '#undef HAVE_GETPASS' >> config.h \
		&& make -j8 \
		&& make -j8 install
	touch ${DIST_WASM}/.built

test: ${DIST_WASM}/.built
	echo "no test of rogue yet"

