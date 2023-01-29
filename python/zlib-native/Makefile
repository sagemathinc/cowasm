include ../build/Makefile-vars

# See https://github.com/sagemathinc/zlib/releases
ZLIB_VERSION = 1.2.13

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile

all: native

URL = https://github.com/sagemathinc/zlib/archive/refs/tags/${ZLIB_VERSION}.tar.gz
TARBALL = ${UPSTREAM}/zlib-${ZLIB_VERSION}.tar.xz

include ../build/Makefile-rules

# NATIVE

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ../build && make zig
	cd ${BUILD_NATIVE} \
		&&	AR="zig ar" \
			CC="zig cc ${ZIG_NATIVE_CFLAGS_GNU} " \
			./configure --static --prefix=${DIST_NATIVE} \
		&&	make install -j8
	touch ${DIST_NATIVE}/.built

test: ${DIST_NATIVE}/.built
	echo "no test"