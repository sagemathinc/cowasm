include ../build/Makefile-vars

# See https://zlib.net/
# HORRIBLE FACT -- I found with version 1.2.11 that when zlib updated to version 1.2.12 they
# just **deleted** version 1.2.11 from their download page. The result is that this Makefile
# breaks.  They claim to have mirrors, but it's just sourceforge only, and only has older
# versions than 1.2.12.  Anyway, expect this line below to -- at some completely random
# moment in time -- break our build for sure, whenever they just happen to update zlib again.
# It was five years from 1.2.11 to 1.2.12, so maybe that will be a while.
ZLIB_VERSION = 1.2.12

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile

all: native wasm

URL = https://zlib.net/zlib-${ZLIB_VERSION}.tar.xz
TARBALL = ${UPSTREAM}/zlib-${ZLIB_VERSION}.tar.xz

include ../build/Makefile-rules

# NATIVE

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} \
		&&	AR="zig ar" \
			CC="zig cc ${ZIG_NATIVE_CFLAGS_GNU} " \
			./configure --prefix=${DIST_NATIVE} \
		&&	make install -j8
	touch ${DIST_NATIVE}/.built

# WASM

${DIST_WASM}/.built: ${BUILD_WASM}/.build
	cd ${BUILD_WASM} \
		&&	CHOST=none \
			AR="zig ar" \
			CC="waszee-cc" \
			./configure --static --prefix=${DIST_WASM} \
		&&	make -j8 install
	# Strangely the libz.a that gets built is mangled, e.g., "nm -a libz.a"
	# says "LLVM ERROR: malformed uleb128, extends past end"
	# so we just rebuild the archive from scratch from all of the .o files.
	# This happens both with and without -fPIC.
	cd ${BUILD_WASM} && \
		rm libz.a && \
		zig ar rc libz.a *.o && \
		cp libz.a ${DIST_WASM}/lib
	touch ${DIST_WASM}/.built

