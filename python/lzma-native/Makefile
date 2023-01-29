include ../build/Makefile-vars

all: native

# LZMA doesn't change, but I didn't want to force git clone, so I made
# a fork and a release myself.

VERSION = 1.1
URL = https://github.com/sagemathinc/lzma/archive/refs/tags/v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/lzma-v${VERSION}.tar.gz

include ../build/Makefile-rules

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../build && make zig
	cd ${BUILD_NATIVE} && \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="zig cc ${ZIG_NATIVE_CFLAGS}" \
		CXX="zig c++ ${ZIG_NATIVE_CFLAGS}" \
		./configure \
			--build=`./build-aux/config.guess` \
			--host=none --prefix="${DIST_NATIVE}"
	cd ${BUILD_NATIVE} && make -j4 && make install
	touch ${DIST_NATIVE}/.built

test: ${DIST_NATIVE}/.built
	echo "no test"