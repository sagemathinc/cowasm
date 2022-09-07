include ../build/Makefile-vars

all: native wasm

# LZMA doesn't change, but I didn't want to force git clone, so I made
# a fork and a release myself.

VERSION = 1.1
URL = https://github.com/sagemathinc/lzma/archive/refs/tags/v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/lzma-v${VERSION}.tar.gz

include ../build/Makefile-rules

${DIST_WASM}/.built: ${BUILD_WASM}/.build
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
	cd ${BUILD_WASM} && make -j4 || true && cd src/liblzma && make install
	zig ranlib ${DIST_WASM}/lib/liblzma.a  # needed on linux
	touch ${DIST_WASM}/.built

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} && \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="zig cc" \
		CXX="zig c++" \
		./configure \
			--build=`./build-aux/config.guess` \
			--host=none --prefix="${DIST_NATIVE}"
	cd ${BUILD_NATIVE} && make -j4 && make install
	touch ${DIST_NATIVE}/.built
