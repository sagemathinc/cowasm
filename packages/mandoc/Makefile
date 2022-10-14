# This builds mandoc, so we can make man pages available

include ../build/Makefile-vars

TARBALL = ${SRC}/mandoc-2022-10-14.tar.xz

POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
ZLIB = ${PACKAGES}/zlib/dist/wasm/include

all: wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cp ${SRC}/config.h ${SRC}/Makefile.local ${BUILD_WASM}
	touch ${BUILD_WASM}/.patched

CFLAGS = "-fvisibility-main -I${POSIX_WASM} -I${ZLIB} -Oz -Xlinker -s"


# TODO: we could move fts out of coreutils and back into a separate library and
# then use it, instead of the compat here.  It should be moved to maybe posix-wasm.h
# actually, to save space in executables.

# Configure takes a long time and is always the same since it's always targetting
# webassembly, so we take the files it creates and just copy them in.  Here
# is how to regenerate the files from scratch:
#   make clean
#   make configure
configure: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&&	./configure CC="wacalc-cc" CFLAGS=${CFLAGS} PREFIX=${DIST_WASM} \
		&&	echo '#include "posix-wasm.h"' >> config.h  \
		&&  echo '#define EFTYPE EINVAL' >> config.h  \
		&&  echo '#undef HAVE_FTS' >> config.h  \
		&&  echo '#undef HAVE_STRINGLIST' >> config.h  \


${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&&	make CC="wacalc-cc" CFLAGS=${CFLAGS} PREFIX=${DIST_WASM} -j8 man
	mkdir -p ${DIST_WASM}/bin
	cp -v ${BUILD_WASM}/man ${DIST_WASM}/bin
