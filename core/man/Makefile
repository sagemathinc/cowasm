# This builds mandoc, so we can make man pages available

include ../build/Makefile-vars

TARBALL = ${SRC}/mandoc-2022-10-14.tar.xz

POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
ZLIB_WASM = $(shell cowasm-package-path @cowasm/zlib)

all: wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cp ${SRC}/config.h ${SRC}/Makefile.local ${BUILD_WASM}
	touch ${BUILD_WASM}/.patched

# TODO: we could move fts out of coreutils and back into a separate library and
# then use it, instead of the compat here.  It should be moved to maybe posix-wasm.h
# actually, to save space in executables.

# Configure takes a long time and is always the same since it's always targetting
# webassembly, so we take the files it creates and just copy them in.  Here
# is how to regenerate the files from scratch:
#   make clean
#   make configure
configure: node_modules ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&&	./configure \
				CC="cowasm-cc" \
				CFLAGS="-fvisibility-main -I${POSIX_WASM} -I${ZLIB_WASM}/include -Oz" \
				PREFIX=${DIST_WASM} \
		&&	echo '#include "posix-wasm.h"' >> config.h  \
		&&  echo '#define EFTYPE EINVAL' >> config.h  \
		&&  echo '#undef HAVE_FTS' >> config.h  \
		&&  echo '#undef HAVE_STRINGLIST' >> config.h


${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	cd ${BUILD_WASM} \
		&&	make -j8  \
			AR="zig ar" \
			RANLIB="zig ranlib" \
			CC="cowasm-cc" \
			CFLAGS="-fvisibility-main -I${POSIX_WASM} -I${ZLIB_WASM}/include -Oz" \
			LDFLAGS="-L ${ZLIB_WASM}/lib -lz" \
			PREFIX=${DIST_WASM} \
			man
	mkdir -p ${DIST_WASM}/bin
	cp -v ${BUILD_WASM}/mandoc ${DIST_WASM}/bin/man
	touch ${DIST_WASM}/.built

test: node_modules wasm
	echo "" | pnpm -s dlx @cowasm/kernel ${DIST_WASM}/bin/man build/wasm/man.1 | grep "display manual pages"