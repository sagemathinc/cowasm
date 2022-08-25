include ../src/Makefile-vars

all: wasm


# LZMA doesn't change, but I didn't want to force git clone, so I made a fork and a release myself.

VERSION = 1.1
URL = https://github.com/sagemathinc/lzma/archive/refs/tags/v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/lzma-v${VERSION}.tar.gz

include ../src/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}
	cd ${BUILD_WASM} && \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="zig-fPIC cc" \
		CXX="zig-fPIC c++" \
		./configure \
			--build=`./build-aux/config.guess` \
			--host=none --prefix="${DIST_WASM}"
	cd ${BUILD_WASM} && echo '#include "../../../posix-wasm/dist/wasm/posix-wasm.h"' >> config.h
	# It fails to build some non-liblzma stuff (for xz) that we don't need, so we
	# ignore that and just install the library.
	cd ${BUILD_WASM} && make || true && cd src/liblzma && make install
	zig ranlib ${DIST_WASM}/lib/liblzma.a  # needed on linux
	touch ${DIST_WASM}/.built
